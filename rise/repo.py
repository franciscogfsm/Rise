"""Fetch a public GitHub repository as text, in memory. Repository content is untrusted data:
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
MAX_ZIP = 60 * 1024 * 1024
MAX_FILE = 400 * 1024
MAX_FILES = 4000


class RepoError(Exception):
    pass


def parse(url: str) -> tuple[str, str, str | None]:
    m = URL_RE.match(url.strip())
    if not m:
        raise RepoError("Paste a public GitHub repository URL, e.g. https://github.com/owner/repo")
    return m.group(1), m.group(2), m.group(3)


def fetch(url: str) -> dict:
    owner, name, ref = parse(url)
    archive = f"https://github.com/{owner}/{name}/archive/{f'refs/heads/{ref}' if ref else 'HEAD'}.zip"
    buf = io.BytesIO()
    try:
        with httpx.stream("GET", archive, follow_redirects=True, timeout=60) as r:
            if r.status_code == 404:
                raise RepoError(f"Repository {owner}/{name} not found or not public.")
            r.raise_for_status()
            for chunk in r.iter_bytes():
                buf.write(chunk)
                if buf.tell() > MAX_ZIP:
                    raise RepoError("Repository archive is larger than 60 MB; point RISE at a smaller repo or a sub-tree.")
    except httpx.HTTPError as e:
        raise RepoError(f"Could not download the repository: {e}") from e

    files, skipped = {}, 0
    with zipfile.ZipFile(buf) as z:
        infos = [i for i in z.infolist() if not i.is_dir()]
        root = infos[0].filename.split("/", 1)[0] + "/" if infos else ""
        commit = root.rstrip("/").rsplit("-", 1)[-1] if root else None
        for info in infos:
            path = info.filename[len(root):]
            parts = path.split("/")
            ext = "." + path.rsplit(".", 1)[-1].lower() if "." in parts[-1] else ""
            if parts[-1] in SKIP_FILES or any(p in SKIP_DIRS for p in parts[:-1]) or (ext not in CODE_EXT and parts[-1] not in {"Dockerfile", ".env.example"}):
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
