"""Migration replay without sharing code.

RECORD (runs inside the company, next to the app): attach a Recorder to the app's boto3 S3 client. It keeps the
sequence of object calls, their parameters and the shape of each response. Bodies are never kept (only their
size) and every key segment is replaced by an alias (same key -> same alias; depth, extension and non-ASCII kept).

REPLAY (RISE): run that exact sequence on each candidate provider with synthetic bytes, using the app's own client
settings (region, addressing style), in a disposable prefix of the provider's test bucket. The first call whose
behaviour differs from the recording is reported with the provider's request id. The prefix is deleted afterwards.
"""
import hashlib
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import httpx
from botocore.exceptions import BotoCoreError, ClientError

from . import connect
from .storage import err_info, make_client, request_id, sha256

# object-level calls only: a replay never changes bucket configuration
OPS = {"PutObject": "put_object", "GetObject": "get_object", "HeadObject": "head_object",
       "ListObjectsV2": "list_objects_v2", "DeleteObject": "delete_object", "CopyObject": "copy_object",
       "PresignedGet": None}
KEEP = {"ContentType", "CacheControl", "ContentDisposition", "ContentEncoding", "ContentLanguage", "Metadata",
        "Range", "MaxKeys", "Delimiter", "MetadataDirective", "ExpiresIn"}
MAX_STEPS, MAX_BODY = 300, 8 * 1024 * 1024
FIELDS = ("status", "error", "content_type", "metadata", "length", "intact", "listed")


# ---------- record ----------
def _shape(status, parsed) -> dict:
    s = {"status": status, "error": (parsed.get("Error") or {}).get("Code")}
    for src, dst in (("ContentType", "content_type"), ("ContentLength", "length")):
        if src in parsed:
            s[dst] = parsed[src]
    if "Metadata" in parsed:
        s["metadata"] = sorted(parsed["Metadata"])
    return s


class Recorder:
    """Attach to any boto3 S3 client: `rec = Recorder(); rec.attach(s3)` ... `json.dump(rec.trace(), f)`."""

    def __init__(self, app: str = "app"):
        self.app, self.lock, self.on, self.client = app, threading.Lock(), True, {}
        self.reset()

    def reset(self):
        with self.lock:
            self.steps, self.names = [], {}  # client settings stay: they belong to the attached client

    def alias(self, key: str) -> str:
        parts = key.split("/")
        out = []
        for i, seg in enumerate(parts):
            if not seg:
                out.append(seg)
                continue
            ext = re.search(r"\.[A-Za-z0-9]{1,8}$", seg) if i == len(parts) - 1 else None
            stem = seg[:ext.start()] if ext else seg
            a = self.names.setdefault(stem, f"{'ç' if not stem.isascii() else ''}k{len(self.names) + 1}")
            out.append(a + (ext.group() if ext else ""))
        return "/".join(out)

    def _clean(self, op: str, p: dict) -> dict:
        c = {k: v for k, v in p.items() if k in KEEP}
        if "Metadata" in c:  # keys are the app's schema; values are data
            c["Metadata"] = {k: "x" * len(str(v)) for k, v in c["Metadata"].items()}
        for k in ("Key", "Prefix"):
            if k in p:
                c[k] = self.alias(p[k])
        if "CopySource" in p:
            src = p["CopySource"]
            c["CopySource"] = self.alias(src["Key"] if isinstance(src, dict) else str(src).lstrip("/").split("/", 1)[-1])
        body = p.get("Body")
        if body is not None:
            c["BodyLength"] = len(body) if isinstance(body, (bytes, bytearray, str)) else None
        return c

    def note(self, op: str, params: dict, shape: dict):
        if op not in OPS or not self.on:
            return
        with self.lock:
            if len(self.steps) < MAX_STEPS:
                self.steps.append({"op": op, "params": self._clean(op, params), "expect": shape})

    def attach(self, client):
        s3cfg = client.meta.config.s3 or {}
        self.client = {"region": client.meta.region_name, "addressing_style": s3cfg.get("addressing_style", "auto")}

        def keep(params, context, **_):
            context["rise_replay"] = dict(params)

        def after(http_response, parsed, model, context, **_):
            self.note(model.name, context.get("rise_replay", {}), _shape(http_response.status_code, parsed))

        client.meta.events.register("provide-client-params.s3", keep)
        client.meta.events.register("after-call.s3", after)
        return client

    def trace(self) -> dict:
        with self.lock:
            return {"rise_trace": 1, "app": self.app, "client": dict(self.client), "steps": list(self.steps),
                    "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


# ---------- replay ----------
def _bytes(alias: str, n: int) -> bytes:
    seed = hashlib.sha256(alias.encode()).digest()
    return (seed * (n // 32 + 1))[:n]


def _range(data: bytes, r: str | None) -> bytes:
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", r or "")
    if not m:
        return data
    a, b = m.groups()
    if not a:
        return data[-int(b):]
    return data[int(a):int(b) + 1 if b else None]


def validate(trace: dict) -> list[dict]:
    steps = (trace or {}).get("steps")
    if not isinstance(steps, list) or not steps:
        raise ValueError("This is not a RISE trace (no steps).")
    if len(steps) > MAX_STEPS:
        raise ValueError(f"A trace has at most {MAX_STEPS} calls.")
    for s in steps:
        if not isinstance(s, dict) or s.get("op") not in OPS or not isinstance(s.get("params", {}), dict):
            raise ValueError(f"Unsupported call in trace: {str(s.get('op') if isinstance(s, dict) else s)[:40]}")
    return steps


def _diff(expect: dict, got: dict) -> list[dict]:
    return [{"field": f, "expected": expect[f], "got": got.get(f)} for f in FIELDS
            if f in expect and expect[f] != got.get(f)]


def replay_on(trace: dict, cid: str) -> dict:
    steps = validate(trace)
    p = connect.provider(cid)
    if not p:
        raise ValueError(f"Unknown connection: {cid}")
    cfg = trace.get("client") or {}
    region = cfg.get("region") or p.region
    style = cfg.get("addressing_style") if cfg.get("addressing_style") in ("path", "virtual") else "path"
    app = make_client(p.endpoint, region, p.access_key, p.secret_key, style)  # the app's own client settings
    admin = make_client(p.endpoint, p.region, p.access_key, p.secret_key)  # seeding + cleanup only
    b, root = p.test_bucket, f"rise-replay/{uuid.uuid4().hex[:8]}/"
    put: dict[str, bytes] = {}  # alias -> bytes now stored on this provider
    out, first = [], None

    # objects the app read before writing them existed already: seed synthetic stand-ins
    seen = set()
    for s in steps:
        prm, e = s["params"], s.get("expect") or {}
        read = [prm.get("CopySource")] + ([prm.get("Key")] if s["op"] in ("GetObject", "HeadObject", "PresignedGet") else [])
        for k in read:
            if k and k not in seen and 0 < (e.get("status") or 0) < 300:
                whole = s["op"] == "HeadObject" or (s["op"] == "GetObject" and not prm.get("Range"))
                put[k] = _bytes(k, min(int(e.get("length") or 64), MAX_BODY) if whole else 64)
                try:
                    admin.put_object(Bucket=b, Key=root + k, Body=put[k], Metadata={m: "x" for m in e.get("metadata") or []},
                                     **({"ContentType": e["content_type"]} if e.get("content_type") else {}))
                except (ClientError, BotoCoreError, OSError):
                    pass  # the replay step itself shows the failure
            seen.add(k)
        seen.add(prm.get("Key"))

    for i, s in enumerate(steps):
        op, prm, e = s["op"], dict(s["params"]), s.get("expect") or {}
        kw = {k: v for k, v in prm.items() if k in KEEP}
        key = prm.get("Key")
        if key:
            kw["Key"] = root + key
        if "Prefix" in prm:
            kw["Prefix"] = root + prm["Prefix"]
        if op == "PutObject":
            put[key] = _bytes(key, min(int(prm.get("BodyLength") or 0), MAX_BODY))
            kw["Body"] = put[key]
        if op == "CopyObject":
            kw["CopySource"] = {"Bucket": b, "Key": root + prm.get("CopySource", "")}
        got, rid, msg, t0 = {}, None, None, time.perf_counter()
        try:
            if op == "PresignedGet":
                url = app.generate_presigned_url("get_object", Params={"Bucket": b, "Key": kw["Key"]},
                                                 ExpiresIn=int(prm.get("ExpiresIn") or 300))
                r = httpx.get(url, timeout=10)
                rid = r.headers.get("x-amz-request-id")
                code, text = (re.search(rf"<{t}>(.*?)</{t}>", r.text or "", re.S) for t in ("Code", "Message"))
                got = {"status": r.status_code, "error": None if r.is_success else (code.group(1) if code else str(r.status_code)),
                       "intact": r.is_success and r.content == put.get(key)}
                msg = None if r.is_success else (text.group(1)[:300] if text else r.text[:300])
            else:
                kw.pop("ExpiresIn", None)
                kw["Bucket"] = b
                resp = getattr(app, OPS[op])(**kw)
                rid = request_id(resp)
                got = _shape(resp["ResponseMetadata"]["HTTPStatusCode"], resp)
                if op == "GetObject":
                    body = resp["Body"].read()
                    got["intact"] = sha256(body) == sha256(_range(put.get(key, b""), prm.get("Range")))
                    got["sha256"] = sha256(body)
                if op == "ListObjectsV2":
                    have = {o["Key"][len(root):] for o in resp.get("Contents", [])}
                    got["listed"] = all(k in have for k in put if k.startswith(prm.get("Prefix", "")))
                if op == "DeleteObject":
                    put.pop(key, None)
                if op == "CopyObject":
                    put[key] = put.get(prm.get("CopySource", ""), b"")
        except (ClientError, BotoCoreError, OSError, httpx.HTTPError) as ex:
            info = err_info(ex)
            got, rid, msg = {"status": info["status"], "error": info["code"]}, info["request_id"], info["message"]
        if (e.get("status") or 0) < 300 and e.get("status"):  # what the app saw worked: bytes and listings must too
            e = e | ({"intact": True} if op in ("GetObject", "PresignedGet") else {}) | ({"listed": True} if op == "ListObjectsV2" else {})
        d = _diff(e, got)
        row = {"i": i, "op": op, "key": key or prm.get("Prefix"), "ms": round((time.perf_counter() - t0) * 1000),
               "got": got, "expected": e, "diff": d, "request_id": rid, "message": msg}
        out.append(row)
        if d and first is None:
            first = row

    try:  # leave nothing behind
        for o in admin.list_objects_v2(Bucket=b, Prefix=root).get("Contents", []):
            admin.delete_object(Bucket=b, Key=o["Key"])
    except (ClientError, BotoCoreError, OSError):
        pass
    d = p.describe()
    return {"provider": {"id": cid, "name": d["name"], "simulated": d["simulated"], "bucket": b, "prefix": root},
            "client": {"region": region, "addressing_style": style}, "steps": out, "first_divergence": first,
            "same": sum(not r["diff"] for r in out), "total": len(out)}


def run(trace: dict, providers: list[str]) -> dict:
    steps = validate(trace)
    with ThreadPoolExecutor(max_workers=4) as pool:
        res = list(pool.map(lambda cid: replay_on(trace, cid), providers[:4]))
    return {"app": trace.get("app"), "calls": len(steps), "recorded_at": trace.get("recorded_at"), "results": res}


RECORDER = Recorder("asset-service")  # the demo app records itself while it runs on its original provider
RECORDER.on = False  # only during asset-service's editing session (workload.py)
