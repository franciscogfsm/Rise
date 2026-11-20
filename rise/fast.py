"""Scan + risk radar on every CPU core. Same result as the single-core path, byte for byte (tests/test_fast.py)."""
import multiprocessing as mp
import os
import time
from concurrent.futures import ProcessPoolExecutor

from . import risks, scan

PARALLEL_FROM = 2_000_000  # characters; below this, starting work on other cores costs more than it saves
WORKERS = max(1, min(os.cpu_count() or 1, 16))
_pool: ProcessPoolExecutor | None = None


def pool() -> ProcessPoolExecutor:
    global _pool
    if _pool is None:  # spawn: never fork the threaded web server
        _pool = ProcessPoolExecutor(WORKERS, mp_context=mp.get_context("spawn"))
    return _pool


def warm():
    """Start the workers ahead of time so the first analysis does not pay for it."""
    list(pool().map(_noop, range(WORKERS)))


def _noop(_):
    return None


def _work(items: list[tuple[str, str]]):
    files = dict(items)
    r = scan.raw(files)
    return r, risks.probe(files, r[1])


def chunks(items: list[tuple[str, str]], n: int) -> list[list[tuple[str, str]]]:
    """Consecutive slices of roughly equal size (order matters for the merge)."""
    total = sum(len(t) for _, t in items) or 1
    out, cur, size = [], [], 0
    for it in items:
        cur.append(it)
        size += len(it[1])
        if size >= total / n and len(out) < n - 1:
            out.append(cur)
            cur, size = [], 0
    return out + [cur] if cur else out


def analyze(files: dict[str, str], parallel: bool | None = None) -> tuple[dict, list[dict], dict]:
    """Returns (scan result, risks, stats)."""
    t0 = time.perf_counter()
    items = sorted(files.items())
    chars = sum(len(t) for _, t in items)
    lines = sum(t.count("\n") + 1 for _, t in items)
    if parallel is None:
        parallel = chars >= PARALLEL_FROM and WORKERS > 1
    if parallel:
        parts = list(pool().map(_work, chunks(items, WORKERS * 3)))  # 3 slices per core balances big and small files
        result = scan.finish(scan.merge([p[0] for p in parts]))
        found = risks.find(files, result, risks.merge([p[1] for p in parts]))
    else:
        result = scan.scan(files)
        found = risks.find(files, result)
    ms = (time.perf_counter() - t0) * 1000
    return result, found, {"files": len(files), "lines": lines, "bytes": chars, "ms": round(ms, 1),
                           "cores": WORKERS if parallel else 1, "lines_per_s": round(lines / max(ms, 0.1) * 1000)}
