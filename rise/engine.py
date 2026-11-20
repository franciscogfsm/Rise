"""Deterministic compatibility test engine.

The AI chooses and parameterises tests from this catalogue. Only this code talks to storage
and decides pass / fail / unsupported, from checks over real bytes and real responses.
"""
import os
import re
import time

import httpx
from botocore.exceptions import BotoCoreError, ClientError
from pydantic import BaseModel, Field, field_validator

from .storage import err_info, request_id, sha256

KINDS = {
    "put_get_roundtrip": {"covers": ["PutObject", "GetObject", "content-type"],
                          "doc": "PUT an object with content type and user metadata, GET it back; compare SHA-256 of the bytes, content type and metadata."},
    "head_metadata": {"covers": ["HeadObject", "user-metadata"],
                      "doc": "PUT with user metadata, HEAD it; compare metadata keys/values and content length."},
    "list_prefix": {"covers": ["ListObjectsV2", "prefix-list", "hierarchical-keys"],
                    "doc": "PUT `count` objects under `prefix`, list with that prefix; every key must come back, in lexicographic order."},
    "presigned_get": {"covers": ["GeneratePresignedUrl", "PresignedGet"],
                      "doc": "Create a presigned GET URL valid for `expires_seconds`, fetch it over plain HTTP; compare SHA-256."},
    "range_get": {"covers": ["range-read"],
                  "doc": "GET bytes `range_start`-`range_end`; must equal the same slice of the uploaded bytes."},
    "unicode_key": {"covers": ["unicode-key"],
                    "doc": "PUT/GET/LIST an object whose key contains non-ASCII characters (`key_suffix`); key and bytes must round-trip."},
    "delete_object": {"covers": ["DeleteObject"],
                      "doc": "PUT then DELETE an object; a following HEAD must return 404."},
}
COVERABLE = {c for k in KINDS.values() for c in k["covers"]}
UNSUPPORTED_CODES = {"NotImplemented", "NotSupported", "UnsupportedOperation"}
MAX_SIZE = 2 * 1024 * 1024


class Pair(BaseModel):
    key: str
    value: str


class Params(BaseModel):
    size_bytes: int | None = None
    content_type: str | None = None
    metadata: list[Pair] | None = None
    prefix: str | None = None
    count: int | None = None
    expires_seconds: int | None = None
    range_start: int | None = None
    range_end: int | None = None
    key_suffix: str | None = None


class TestSpec(BaseModel):
    __test__ = False  # not a pytest class
    id: str = Field(min_length=1, max_length=24)
    kind: str
    title: str = Field(max_length=160)
    rationale: str = Field(default="", max_length=400)
    params: Params = Params()
    origin: str = "ai"  # ai | rules | validator

    @field_validator("kind")
    @classmethod
    def known_kind(cls, v):
        if v not in KINDS:
            raise ValueError(f"unknown test kind {v!r}")
        return v

    @field_validator("id")
    @classmethod
    def safe_id(cls, v):
        return re.sub(r"[^A-Za-z0-9_-]", "-", v)


def _int(v, lo, hi, default):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def _metadata(p: Params) -> dict:
    out = {}
    for pair in (p.metadata or [Pair(key="owner", value="rise")])[:5]:
        k = re.sub(r"[^a-z0-9-]", "-", pair.key.lower())[:40].strip("-") or "k"
        out[k] = pair.value.encode("ascii", "ignore").decode()[:64]
    return out


def _check(ev, name, expected, actual) -> bool:
    ok = expected == actual
    short = lambda v: v[:16] + "…" if isinstance(v, str) and len(v) == 64 else v  # noqa: E731 sha256 hex
    ev["checks"].append({"name": name, "ok": ok, "expected": short(expected), "actual": short(actual)})
    return ok


def _put(c, b, key, data, ev, **kw):
    ev["requests"].append(request_id(c.put_object(Bucket=b, Key=key, Body=data, **kw)))


def _get(c, b, key, ev, **kw):
    r = c.get_object(Bucket=b, Key=key, **kw)
    ev["requests"].append(request_id(r))
    return r, r["Body"].read()


def t_put_get(c, b, base, p, ev):
    data = os.urandom(_int(p.size_bytes, 1, MAX_SIZE, 4096))
    ct, md, key = (p.content_type or "application/octet-stream")[:100], _metadata(p), f"{base}/object.bin"
    _put(c, b, key, data, ev, ContentType=ct, Metadata=md)
    r, body = _get(c, b, key, ev)
    ok = _check(ev, "sha256(bytes)", sha256(data), sha256(body))
    ok &= _check(ev, "content-type", ct, r.get("ContentType"))
    ok &= _check(ev, "metadata", md, {k.lower(): v for k, v in r.get("Metadata", {}).items()})
    return ok


def t_head(c, b, base, p, ev):
    data = os.urandom(_int(p.size_bytes, 1, MAX_SIZE, 1024))
    md, key = _metadata(p), f"{base}/head.bin"
    _put(c, b, key, data, ev, Metadata=md)
    h = c.head_object(Bucket=b, Key=key)
    ev["requests"].append(request_id(h))
    ok = _check(ev, "metadata", md, {k.lower(): v for k, v in h.get("Metadata", {}).items()})
    ok &= _check(ev, "content-length", len(data), h.get("ContentLength"))
    return ok


def t_list(c, b, base, p, ev):
    prefix = f"{base}/{re.sub(r'[^A-Za-z0-9/_-]', '', p.prefix or 'slides/').strip('/') or 'slides'}/"
    keys = [f"{prefix}item-{i:02d}.txt" for i in range(_int(p.count, 1, 5, 3))]
    for k in keys:
        _put(c, b, k, k.encode(), ev)
    r = c.list_objects_v2(Bucket=b, Prefix=prefix)
    ev["requests"].append(request_id(r))
    return _check(ev, "listed keys", keys, [o["Key"] for o in r.get("Contents", [])])


def t_presigned(c, b, base, p, ev):
    data, key = os.urandom(_int(p.size_bytes, 1, MAX_SIZE, 2048)), f"{base}/shared.bin"
    _put(c, b, key, data, ev)
    url = c.generate_presigned_url("get_object", Params={"Bucket": b, "Key": key},
                                   ExpiresIn=_int(p.expires_seconds, 30, 3600, 300))
    r = httpx.get(url, timeout=8)
    ev["requests"].append(r.headers.get("x-amz-request-id"))
    ok = _check(ev, "http status", 200, r.status_code)
    if r.status_code != 200:
        ev["checks"][-1]["actual"] = f"{r.status_code} {r.text[:160]}"
    ok &= _check(ev, "sha256(bytes)", sha256(data), sha256(r.content))
    return ok


def t_range(c, b, base, p, ev):
    data = os.urandom(_int(p.size_bytes, 256, MAX_SIZE, 4096))
    start = _int(p.range_start, 0, len(data) - 2, 0)
    end = _int(p.range_end, start, len(data) - 1, min(start + 99, len(data) - 1))
    key = f"{base}/range.bin"
    _put(c, b, key, data, ev)
    _, body = _get(c, b, key, ev, Range=f"bytes={start}-{end}")
    ok = _check(ev, "length", end - start + 1, len(body))
    ok &= _check(ev, "sha256(slice)", sha256(data[start:end + 1]), sha256(body))
    return ok


def t_unicode(c, b, base, p, ev):
    suffix = re.sub(r"[/\\\x00-\x1f]", "", p.key_suffix or "independência-ção")[:60] or "independência"
    key, data = f"{base}/{suffix}.txt", suffix.encode()
    _put(c, b, key, data, ev)
    _, body = _get(c, b, key, ev)
    ok = _check(ev, "sha256(bytes)", sha256(data), sha256(body))
    r = c.list_objects_v2(Bucket=b, Prefix=f"{base}/")
    ok &= _check(ev, "key in listing", [key], [o["Key"] for o in r.get("Contents", [])])
    return ok


def t_delete(c, b, base, p, ev):
    key = f"{base}/delete-me.txt"
    _put(c, b, key, b"x", ev)
    ev["requests"].append(request_id(c.delete_object(Bucket=b, Key=key)))
    try:
        c.head_object(Bucket=b, Key=key)
        return _check(ev, "HEAD after delete", 404, 200)
    except ClientError as e:
        return _check(ev, "HEAD after delete", 404, e.response["ResponseMetadata"]["HTTPStatusCode"])


FUNCS = {"put_get_roundtrip": t_put_get, "head_metadata": t_head, "list_prefix": t_list,
         "presigned_get": t_presigned, "range_get": t_range, "unicode_key": t_unicode, "delete_object": t_delete}
assert set(FUNCS) == set(KINDS)


def cleanup(c, bucket: str, prefix: str):
    try:
        for o in c.list_objects_v2(Bucket=bucket, Prefix=prefix).get("Contents", []):
            c.delete_object(Bucket=bucket, Key=o["Key"])
    except (ClientError, BotoCoreError, OSError):
        pass  # best effort: test bucket is disposable


def run(spec: TestSpec, client, bucket: str, run_id: str, provider_id: str) -> dict:
    base = f"rise-test/{run_id}/{spec.id}"
    ev = {"requests": [], "checks": []}
    error, t0 = None, time.perf_counter()
    try:
        status = "pass" if FUNCS[spec.kind](client, bucket, base, spec.params, ev) else "fail"
    except ClientError as e:
        error = err_info(e)
        status = "unsupported" if error["code"] in UNSUPPORTED_CODES or error["status"] == 501 else "fail"
    except (BotoCoreError, httpx.HTTPError, OSError) as e:
        error, status = err_info(e), "fail"
    cleanup(client, bucket, base)
    return {"test_id": spec.id, "kind": spec.kind, "provider": provider_id, "status": status, "error": error,
            "ms": round((time.perf_counter() - t0) * 1000), "requests": [r for r in ev["requests"] if r],
            "checks": ev["checks"]}


def rules_plan(profile: dict) -> list[TestSpec]:
    """Deterministic fallback: one test per observed behaviour, parameters taken from observations."""
    items = set(profile["items"])
    ct = (profile["content_types"] or ["application/octet-stream"])[0]
    md = [Pair(key=k, value="rise-test") for k in profile["metadata_keys"][:5]] or None
    prefix = (profile["prefixes"] or ["slides/"])[0]
    tests = []
    for kind, spec in KINDS.items():
        hit = sorted(items & set(spec["covers"]))
        if hit:
            tests.append(TestSpec(
                id=f"r{len(tests) + 1}", kind=kind, title=kind.replace("_", " "), origin="rules",
                rationale=f"Observed: {', '.join(hit)}",
                params=Params(content_type=ct, metadata=md, prefix=prefix, size_bytes=min(profile["max_size"] or 4096, MAX_SIZE))))
    return tests
