"""Connections: the S3-compatible providers RISE can test, and a real connection test for each.

Two built-in connections come from the server environment (.env): `source` and `destination`.
Users can add more from the UI. Their keys are stored only on the server (DATA/connections.json,
git-ignored, owner-only permissions) and are never sent back to the browser.
"""
import json
import os
import re
import threading
import time
import uuid
from urllib.parse import urlparse

from botocore.exceptions import BotoCoreError, ClientError

from . import config as C
from .storage import err_info, make_client, request_id, sha256

ENV_PREFIX = {"source": "SOURCE", "destination": "DEST"}
STORE = C.DATA / "connections.json"
RESULTS: dict[str, dict] = {}  # last test per connection, in memory
_lock = threading.Lock()

BUCKET_RE = re.compile(r"^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")
REGION_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,31}$")


class ConnError(ValueError):
    pass


def _load() -> dict[str, dict]:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save(items: dict[str, dict]) -> None:
    STORE.write_text(json.dumps(items, indent=1), encoding="utf-8")
    try:
        os.chmod(STORE, 0o600)
    except OSError:
        pass


def _from_saved(cid: str, d: dict) -> C.Provider:
    return C.Provider(id=cid, name=d["name"], endpoint=d["endpoint"], region=d["region"], bucket=d["bucket"],
                      test_bucket=d["test_bucket"], access_key=d["access_key"], secret_key=d["secret_key"],
                      simulated=False)


def provider(cid: str) -> C.Provider | None:
    if cid in ENV_PREFIX:
        return {"source": C.SOURCE, "destination": C.DEST}[cid]
    d = _load().get(cid)
    return _from_saved(cid, d) if d else None


def add(body: dict) -> dict:
    """Validate and store a new connection. Raises ConnError with a message for the user."""
    name = (body.get("name") or "").strip()
    endpoint = (body.get("endpoint") or "").strip().rstrip("/")
    region = (body.get("region") or "").strip()
    bucket = (body.get("bucket") or "").strip()
    test_bucket = (body.get("test_bucket") or "").strip() or bucket
    ak, sk = (body.get("access_key") or "").strip(), (body.get("secret_key") or "").strip()
    if not 1 <= len(name) <= 60:
        raise ConnError("Give the connection a name (up to 60 characters).")
    if endpoint:
        u = urlparse(endpoint)
        if u.scheme not in ("http", "https") or not u.netloc or u.query or u.fragment:
            raise ConnError("The endpoint must be an http(s) URL, for example https://s3.example.com.")
    if not REGION_RE.match(region):
        raise ConnError("The region must be the provider's region name, for example nl-ams-1 or eu-west-1.")
    for b in (bucket, test_bucket):
        if not BUCKET_RE.match(b):
            raise ConnError(f"'{b}' is not a valid bucket name (3–63 lowercase letters, digits, dots or hyphens).")
    if not ak or not sk or len(ak) > 256 or len(sk) > 256:
        raise ConnError("Both the access key and the secret key are required.")
    cid = "c-" + uuid.uuid4().hex[:8]
    with _lock:
        items = _load()
        items[cid] = {"name": name, "endpoint": endpoint, "region": region, "bucket": bucket, "test_bucket": test_bucket,
                      "access_key": ak, "secret_key": sk, "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        _save(items)
    return overview_one(cid)


def remove(cid: str) -> bool:
    if cid in ENV_PREFIX:
        raise ConnError("Built-in connections come from the server's .env and cannot be removed here.")
    with _lock:
        items = _load()
        if cid not in items:
            return False
        del items[cid]
        _save(items)
    RESULTS.pop(cid, None)
    return True


def _field(cid: str, f: str) -> str:
    """How the user names a setting: the env variable for built-ins, the form field otherwise."""
    if cid in ENV_PREFIX:
        return f"{ENV_PREFIX[cid]}_{f.upper()}"
    return f.replace("_", " ")


def _hint(e: dict, p: C.Provider) -> str | None:
    f = lambda k: _field(p.id, k)  # noqa: E731
    if e["kind"] == "network":
        return f"Nothing answered at {p.endpoint or 'the default AWS endpoint'}. Check {f('endpoint')} and that the provider is reachable from this machine."
    if e.get("region") and e["region"] != p.region:
        return f"The provider says it expects region '{e['region']}', but {f('region')} is '{p.region}'."
    if e["code"] in {"AuthorizationHeaderMalformed", "InvalidRegion"}:
        return f"The signing region '{p.region}' was rejected. Check {f('region')}."
    if e["code"] in {"InvalidAccessKeyId", "SignatureDoesNotMatch", "AccessDenied", "403"}:
        return f"The credentials were rejected. Check {f('access_key')} and {f('secret_key')}, and that the key may use this bucket."
    if e["code"] in {"NoSuchBucket", "404"}:
        return f"The bucket does not exist. Create it at the provider, or change {f('bucket')} / {f('test_bucket')}."
    return None


def test(cid: str) -> dict:
    """Reach both buckets, then write, read back (SHA-256), and delete one probe object in the test bucket."""
    p = provider(cid)
    c = make_client(p.endpoint, p.region, p.access_key, p.secret_key)
    key, data = f"rise-probe/{uuid.uuid4().hex[:12]}.bin", os.urandom(1024)

    def reach(bucket):
        return request_id(c.head_bucket(Bucket=bucket)), f"bucket {bucket} answered"

    def write():
        return request_id(c.put_object(Bucket=p.test_bucket, Key=key, Body=data)), f"{len(data)} random bytes → {key}"

    def read():
        r = c.get_object(Bucket=p.test_bucket, Key=key)
        got = sha256(r["Body"].read())
        if got != sha256(data):
            raise ValueError(f"SHA-256 mismatch: wrote {sha256(data)[:16]}…, read {got[:16]}…")
        return request_id(r), f"SHA-256 {got[:16]}… matches what was written"

    def delete():
        rid = request_id(c.delete_object(Bucket=p.test_bucket, Key=key))
        try:
            c.head_object(Bucket=p.test_bucket, Key=key)
        except ClientError as e:
            if e.response["ResponseMetadata"]["HTTPStatusCode"] == 404:
                return rid, "HEAD after delete → 404"
            raise
        raise ValueError("The object still exists after DELETE")

    steps = [("reach", "Reach the application bucket", lambda: reach(p.bucket))]
    if p.test_bucket != p.bucket:
        steps.append(("reach_test", "Reach the test bucket", lambda: reach(p.test_bucket)))
    steps += [("write", "Write a probe object", write), ("read", "Read it back and compare bytes", read),
              ("delete", "Delete it", delete)]
    checks, failed = [], False
    for sid, label, fn in steps:
        if failed:
            checks.append({"id": sid, "label": label, "status": "skipped"})
            continue
        t0 = time.perf_counter()
        try:
            rid, detail = fn()
            checks.append({"id": sid, "label": label, "status": "pass", "detail": detail, "request_id": rid,
                           "ms": round((time.perf_counter() - t0) * 1000)})
        except (ClientError, BotoCoreError, OSError, ValueError) as e:
            info, failed = err_info(e), True
            checks.append({"id": sid, "label": label, "status": "fail", "error": info, "hint": _hint(info, p),
                           "ms": round((time.perf_counter() - t0) * 1000)})
    RESULTS[cid] = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "ok": not failed, "checks": checks,
                    "signed_for_region": p.region}
    return overview_one(cid)


def overview_one(cid: str) -> dict:
    p = provider(cid)
    builtin = cid in ENV_PREFIX
    return p.describe() | {
        "builtin": builtin,
        "role": {"source": "reference", "destination": "target"}.get(cid),
        "region": p.region,
        "test_bucket": p.test_bucket,
        # whether keys are set, never their values
        "keys_set": bool(os.environ.get(f"{ENV_PREFIX[cid]}_ACCESS_KEY")) if builtin else True,
        "configured_in": ".env" if builtin else "RISE",
        "last_test": RESULTS.get(cid),
    }


def overview() -> list[dict]:
    return [overview_one(cid) for cid in [*ENV_PREFIX, *_load()]]
