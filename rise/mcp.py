"""RISE as an MCP server for Claude Code (stdio, standard library only: runs with any Python 3.10+, no install).

    claude mcp add rise -- python rise/mcp.py        (then, in Claude Code: /rise move this app to Leaseweb)

It reads a local folder, sends its source files to a running RISE (RISE_URL, default http://127.0.0.1:8080) and returns the
answer from real tests. Secrets stay out: .env files are never read; cloud keys live only in the RISE server."""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

RISE_URL = os.environ.get("RISE_URL", "http://127.0.0.1:8080").rstrip("/")
SKIP_DIRS = {"node_modules", "vendor", ".git", "dist", "build", "__pycache__", ".venv", "venv", "site-packages", "third_party",
             ".rise", ".next", "target", ".idea", ".vscode"}
MAX_FILE, MAX_TOTAL = 400 * 1024, 50 * 1024 * 1024

TOOLS = [
    {"name": "rise_check",
     "description": "Prove whether the code in a local folder can migrate its object storage (S3) to another cloud. Reads the "
                    "folder, runs REAL tests on the reference and target clouds configured in RISE, and returns the answer "
                    "(Ready / Ready · 1 change / Not ready), the exact change, risks with file:line, and a link to the evidence. "
                    "Call rise_connections first to map the user's words (e.g. 'Leaseweb', 'AWS') to connection ids.",
     "inputSchema": {"type": "object", "properties": {
         "path": {"type": "string", "description": "Folder to check. Default: the current working directory."},
         "goal": {"type": "string", "description": "The user's goal in their own words, e.g. 'move to Leaseweb'."},
         "reference": {"type": "string", "description": "Connection id the app uses today. Default: source."},
         "targets": {"type": "array", "items": {"type": "string"}, "maxItems": 4,
                     "description": "1 target connection id, or up to 4 to compare. Default: [destination]."}}}},
    {"name": "rise_connections",
     "description": "List the clouds configured in RISE (id, name, region, simulated or real). No keys are ever returned.",
     "inputSchema": {"type": "object", "properties": {}}},
]


def api(method: str, path: str, body=None):
    req = urllib.request.Request(RISE_URL + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    if os.environ.get("RISE_PASSWORD"):
        req.add_header("Authorization", "Basic " + base64.b64encode(f"rise:{os.environ['RISE_PASSWORD']}".encode()).decode())
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"RISE said {e.code}: {e.read().decode(errors='replace')[:300]}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"RISE is not running at {RISE_URL}. Start it with: docker compose up --build") from e


def read_folder(root: Path) -> dict:
    files, total = {}, 0
    for dirpath, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for n in names:
            if n.startswith(".env") and n != ".env.example":  # real secrets never leave the machine
                continue
            p = Path(dirpath, n)
            try:
                if p.stat().st_size > MAX_FILE:
                    continue
                data = p.read_bytes()
            except OSError:
                continue
            if b"\x00" in data[:2048]:
                continue
            total += len(data)
            if total > MAX_TOTAL:
                raise RuntimeError("Folder too large (over 50 MB of text). Point rise_check at a sub-folder.")
            files[p.relative_to(root).as_posix()] = data.decode("utf-8", errors="replace")
    return files  # the server keeps only source/config files (same filter as a GitHub repo)


def check(args: dict) -> str:
    root = Path(args.get("path") or os.getcwd()).resolve()
    if not root.is_dir():
        raise RuntimeError(f"Not a folder: {root}")
    targets = args.get("targets") or ["destination"]
    started = api("POST", "/api/analyses", {"url": "", "files": read_folder(root), "name": root.name, "goal": args.get("goal", ""),
                                            "reference": args.get("reference") or "source", "targets": targets})
    ids, deadline, done = started["ids"], time.time() + 180, {}
    while len(done) < len(ids) and time.time() < deadline:
        time.sleep(1)
        for aid in ids:
            a = api("GET", f"/api/analyses/{aid}")
            if a["status"] in ("done", "error"):
                done[aid] = a
    return "\n\n".join(report(done.get(aid) or {"id": aid, "status": "timeout"}) for aid in ids)


def report(a: dict) -> str:
    link = f"{RISE_URL}/a/{a['id']}"
    if a["status"] != "done":
        return f"RISE analysis {a['id']}: {a.get('error') or 'still running after 3 minutes'}. Live view: {link}"
    P, d, s = a["providers"], a["decision"], a.get("score") or {}
    lines = [f"## {d['title']}  ({P[0]['name']} → {P[1]['name']}{' · simulated' if P[1].get('simulated') else ''})",
             f"{s.get('verified', 0)}/{s.get('total', 0)} storage behaviours verified by real tests on the target "
             f"in {a.get('duration_ms', 0) / 1000:.1f} s."]
    if d.get("change"):
        c = d["change"]
        lines.append(f"The 1 change: `{c['key']}: {c['from']} → {c['to']}` (applied and every test re-run).")
    if d.get("failing"):
        lines.append("Failing on the target: " + ", ".join(d["failing"]))
    if d.get("untested"):
        lines.append("Not tested: " + ", ".join(d["untested"]))
    b = a.get("brief") or {}
    if b.get("headline"):
        lines.append(f"Briefing ({b.get('source', {}).get('mode', 'live').upper()}): {b['headline']}. {b.get('explanation', '')}")
    for r in (a.get("risks") or [])[:8]:
        ev = (r.get("evidence") or [{}])[0]
        lines.append(f"- [{r['severity']}] {r['title']}" + (f" — {ev['file']}:{ev['line']}" if ev.get("file") else ""))
    if a.get("lockin"):
        lines.append("Other cloud services to plan for (not tested): " + ", ".join(x["service"] for x in a["lockin"]))
    lines.append(f"Evidence (every test, request IDs, Freedom Proof): {link}")
    return "\n".join(lines)


def connections(_args) -> str:
    return "\n".join(f"- {c['id']}: {c['name']} · {c.get('region')} · {'simulated' if c.get('simulated') else 'real cloud'}"
                     + (f" · default {c['role']}" if c.get("role") else "") for c in api("GET", "/api/connections"))


def handle(msg: dict):
    method, mid = msg.get("method"), msg.get("id")
    if method == "initialize":
        result = {"protocolVersion": msg.get("params", {}).get("protocolVersion", "2025-06-18"),
                  "capabilities": {"tools": {}}, "serverInfo": {"name": "rise", "version": "1.0"}}
    elif method == "tools/list":
        result = {"tools": TOOLS}
    elif method == "tools/call":
        name, args = msg["params"]["name"], msg["params"].get("arguments") or {}
        try:
            text, err = {"rise_check": check, "rise_connections": connections}[name](args), False
        except (RuntimeError, KeyError, OSError) as e:
            text, err = str(e), True
        result = {"content": [{"type": "text", "text": text}], "isError": err}
    elif method == "ping":
        result = {}
    elif mid is None:  # notifications need no reply
        return None
    else:
        return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": f"Unknown method {method}"}}
    return {"jsonrpc": "2.0", "id": mid, "result": result}


def main():
    sys.stdin.reconfigure(encoding="utf-8")  # Windows defaults to cp1252; MCP is UTF-8
    for line in sys.stdin:
        if line.strip():
            out = handle(json.loads(line))
            if out is not None:
                sys.stdout.write(json.dumps(out) + "\n")
                sys.stdout.flush()


if __name__ == "__main__":
    main()
