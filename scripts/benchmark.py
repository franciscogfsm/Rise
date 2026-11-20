"""Scanner benchmark on real GitHub repositories: how much code RISE reads, how fast, and whether it misses any S3 call.

    python scripts/benchmark.py [benchmark/repos.json] [benchmark/results.json]

Repositories are downloaded and read in memory, exactly as RISE does (nothing is written to disk but the results file).
The check is independent of the scanner's own rules: it takes every operation of the official S3 API from AWS's service
model (botocore, installed with boto3), in every spelling (PutObject, putObject, put_object, new PutObjectCommand), and looks
for calls to them in EVERY file. Each such call must be either read by a scanner rule or flagged as an untested storage
call. Whatever is left is listed under "unaccounted" with file:line, for a person to review (most are the same name used
by non-S3 code: JDBC rs.getObject(), resources.GetObject(), web create_session())."""
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import botocore.session  # noqa: E402

from rise import fast, repo, scan  # noqa: E402

OPS = botocore.session.get_session().get_service_model("s3").operation_names
_snake = lambda n: re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", n).lower()  # noqa: E731
_names = sorted({v for o in OPS for v in (o, o[0].lower() + o[1:], _snake(o))}, key=len, reverse=True)
ORACLE = re.compile(r"(?:\.|->|::)\s*(" + "|".join(_names) + r")(?:Async)?\(|\bnew\s+(" + "|".join(OPS) + r")Command\(")
COMMENT = re.compile(r"^\s*(#|//|\*|/\*)")


def real_call(line: str) -> bool:  # an official S3 call name, not inside a quoted message
    return any(not scan.in_string(line, m.start()) for m in ORACLE.finditer(line))


def accounted(line: str, path: str, s3_files: set) -> bool:
    if path not in s3_files:
        return False
    if any(r.search(line) for r in scan._RULES):
        return True
    return any(scan.untested_call(m.group(1) or m.group(2), m.group(2) is not None) for m in scan.CANDIDATE.finditer(line))


def download(item):
    group, url = item
    try:
        return group, url, repo.fetch(url)["files"]
    except Exception as e:  # noqa: BLE001 — reported per repository, never hidden
        return group, url, str(e)[:160]


def measure(group: str, url: str, files) -> dict:
    if isinstance(files, str):
        return {"url": url, "group": group, "error": files}
    t = time.perf_counter()
    res, risks, speed = fast.analyze(files)
    ms = (time.perf_counter() - t) * 1000
    s3, calls, unaccounted = set(res["s3_files"]), 0, []
    for path, text in files.items():
        if not ORACLE.search(text):
            continue
        for n, line in enumerate(text.splitlines(), 1):
            if len(line) > 400 or COMMENT.match(line) or not real_call(line):
                continue
            calls += 1
            if not accounted(line, path, s3):
                unaccounted.append({"file": path, "line": n, "code": line.strip()[:160]})
    return {"url": url, "group": group, "files": len(files), "lines": speed["lines"], "scan_ms": round(ms, 1),
            "cores": speed["cores"], "s3_files": len(s3), "s3_calls_read": sum(res["operations"].values()),
            "untested_calls_flagged": sum(res["unrecognised"].values()), "official_api_calls": calls,
            "unaccounted": unaccounted, "risks": len(risks)}


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "benchmark/repos.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "benchmark/results.json"
    repos = [tuple(x) for x in json.load(open(src, encoding="utf-8"))]
    print(f"{len(repos)} repositories", flush=True)
    with ThreadPoolExecutor(int(os.environ.get("BENCH_THREADS", "3"))) as ex:  # more in parallel and GitHub cuts big archives
        got = list(ex.map(download, repos))
    fast.warm()
    rows = [measure(*g) for g in got]  # one repository at a time, as RISE does, so each timing is clean
    ok = [r for r in rows if "error" not in r]
    summary = {"repositories": len(ok), "not_downloaded": len(rows) - len(ok), "files": sum(r["files"] for r in ok),
               "lines": sum(r["lines"] for r in ok), "scan_seconds_total": round(sum(r["scan_ms"] for r in ok) / 1000, 1),
               "repos_using_s3": sum(1 for r in ok if r["s3_calls_read"] or r["untested_calls_flagged"]),
               "s3_calls_read": sum(r["s3_calls_read"] for r in ok),
               "untested_calls_flagged": sum(r["untested_calls_flagged"] for r in ok),
               "official_api_calls": sum(r["official_api_calls"] for r in ok),
               "unaccounted": sum(len(r["unaccounted"]) for r in ok)}
    json.dump({"summary": summary, "rows": rows}, open(out, "w", encoding="utf-8"), indent=1)
    print(json.dumps(summary, indent=1))
    for r in rows:
        if "error" in r:
            print("NOT DOWNLOADED", r["url"], r["error"])


if __name__ == "__main__":
    main()
