"""Fetch a GitHub repository (public, or private with a read-only token) as text, in memory. Repository content is untrusted data:
nothing is written to disk or executed; only bounded-size text files are read."""
import io
import re
import zipfile

import httpx

URL_RE = re.compile(r"^https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]{1,100})/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?/?(?:tree/([^?#]{1,200}))?/?$")
CODE_EXT = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".go", ".java", ".kt", ".php", ".rb", ".cs", ".rs",
            ".tf", ".yaml", ".yml", ".json", ".toml", ".env", ".ini", ".cfg", ".properties", ".sh"}
SKIP_DIRS = {"node_modules", "vendor", ".git", "dist", "build", "__pycache__", ".venv", "venv", "site-packages", "third_party"}
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock", "composer.lock",
              "go.sum", "Cargo.lock", "bun.lockb", "tsconfig.json"}
MAX_ZIP = 200 * 1024 * 1024
MAX_FILE = 400 * 1024
MAX_FILES = 50_000


TOKEN_RE = re.compile(r"^[A-Za-z0-9_]{20,255}$")  # ghp_…, github_pat_…, gho_…


class RepoError(Exception):
    pass


def wanted(path: str) -> bool:
    parts = path.split("/")
    ext = "." + path.rsplit(".", 1)[-1].lower() if "." in parts[-1] else ""
    return not (parts[-1] in SKIP_FILES or any(p in SKIP_DIRS for p in parts[:-1])
                or (ext not in CODE_EXT and parts[-1] not in {"Dockerfile", ".env.example"}))


def local(files: dict, name: str) -> dict:
    """Files sent by the local MCP client (rise/mcp.py): same filters and limits as a GitHub archive."""
    if not isinstance(files, dict) or not files:
        raise RepoError("No source files were sent.")
    kept = {p: t for p, t in files.items() if isinstance(p, str) and isinstance(t, str) and ".." not in p.split("/")
            and wanted(p) and len(t.encode()) <= MAX_FILE
            and not (p.rsplit("/", 1)[-1].startswith(".env") and not p.endswith(".env.example"))}  # never keep a real .env
    if sum(len(t) for t in kept.values()) > 60 * 1024 * 1024 or len(kept) > MAX_FILES:
        raise RepoError("The folder is too large to send; point RISE at a sub-folder.")
    return {"owner": "local", "name": re.sub(r"[^A-Za-z0-9_.-]", "-", name or "project")[:100], "ref": "local", "commit": None,
            "archive_bytes": sum(len(t.encode()) for t in kept.values()), "files": kept, "skipped": len(files) - len(kept),
            "url": "local:" + (name or "project")[:100], "local": True}


def parse(url: str) -> tuple[str, str, str | None]:
    m = URL_RE.match(url.strip())
    if not m:
        raise RepoError("Paste a public GitHub repository URL, e.g. https://github.com/owner/repo")
    return m.group(1), m.group(2), m.group(3)


def check_token(token: str | None) -> str | None:
    token = (token or "").strip()
    if token and not TOKEN_RE.match(token):
        raise RepoError("That does not look like a GitHub token (ghp_… or github_pat_…).")
    return token or None


def fetch(url: str, token: str | None = None) -> dict:
    """The token (private repos) is used for this one download only: never stored, logged or sent to the AI."""
    owner, name, ref = parse(url)
    if token:  # the API zipball works for private repos; GitHub redirects to a short-lived signed download URL
        archive, headers = f"https://api.github.com/repos/{owner}/{name}/zipball/{ref or ''}".rstrip("/"), {
            "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    else:
        archive, headers = f"https://github.com/{owner}/{name}/archive/{f'refs/heads/{ref}' if ref else 'HEAD'}.zip", {}
    buf = io.BytesIO()
    try:
        with httpx.stream("GET", archive, headers=headers, follow_redirects=True, timeout=60) as r:
            if r.status_code in (401, 403) and token:
                raise RepoError("GitHub rejected the token. It needs read access (Contents: read) to this repository.")
            if r.status_code == 404:
                raise RepoError(f"Repository {owner}/{name} not found. If it is private, add a GitHub token with read access."
                                if not token else f"Repository {owner}/{name} not found, or the token cannot see it.")
            r.raise_for_status()
            for chunk in r.iter_bytes():
                buf.write(chunk)
                if buf.tell() > MAX_ZIP:
                    raise RepoError("Repository archive is larger than 200 MB; point RISE at a smaller repo or a sub-tree.")
    except httpx.HTTPError as e:
        raise RepoError(f"Could not download the repository: {e}") from e

    files, skipped = {}, 0
    with zipfile.ZipFile(buf) as z:
        infos = [i for i in z.infolist() if not i.is_dir()]
        root = infos[0].filename.split("/", 1)[0] + "/" if infos else ""
        commit = root.rstrip("/").rsplit("-", 1)[-1] if root else None
        for info in infos:
            path = info.filename[len(root):]
            if not wanted(path):
                continue
            if info.file_size > MAX_FILE or len(files) >= MAX_FILES:
                skipped += 1
                continue
            data = z.read(info)
            if b"\x00" in data[:2048]:
                continue
            files[path] = data.decode("utf-8", errors="replace")
    return {"owner": owner, "name": name, "ref": ref or "HEAD", "commit": commit, "archive_bytes": buf.tell(),
            "files": files, "skipped": skipped, "url": f"https://github.com/{owner}/{name}"}
