"""The workload under test: `asset-service`, a small app that keeps the pitch's visual assets
in S3-compatible object storage. RISE observes its S3 client (DISCOVER) and re-routes it (SWITCH)."""
import threading
import uuid

import httpx

from . import config as C
from .storage import make_client, request_id, sha256


class Router:
    """Where asset-service sends its storage traffic, plus its per-provider S3 client settings."""

    def __init__(self):
        self.lock = threading.Lock()
        self.observer = lambda *a: None  # set by Journey
        self.reset()

    def reset(self):
        with self.lock:
            self.active = "source"
            # the app shipped with a single region setting, reused for every S3 client
            self.cfg = {p: {"region": C.APP_REGION, "addressing_style": "path"} for p in ("source", "destination")}
            self._clients = {}

    @staticmethod
    def provider(pid: str) -> C.Provider:
        return C.SOURCE if pid == "source" else C.DEST

    @staticmethod
    def endpoint(pid: str) -> str:
        return C.SOURCE_APP_ENDPOINT if pid == "source" else C.DEST.endpoint

    def configure(self, pid: str, key: str, value: str) -> dict:
        with self.lock:
            before = dict(self.cfg[pid])
            self.cfg[pid][key] = value
            self._clients.clear()
            return before

    def activate(self, pid: str):
        with self.lock:
            self.active = pid

    def client(self, pid: str, observed: bool = False):
        k = (pid, observed)
        with self.lock:
            if k not in self._clients:
                p, cfg = self.provider(pid), self.cfg[pid]
                obs = (lambda *a: self.observer(pid, *a)) if observed else None
                self._clients[k] = make_client(self.endpoint(pid), cfg["region"], p.access_key, p.secret_key,
                                               cfg["addressing_style"], obs)
            return self._clients[k]


class AssetService:
    def __init__(self, router: Router):
        self.router = router

    def _ctx(self):
        pid = self.router.active
        return pid, self.router.client(pid, observed=True), self.router.provider(pid).bucket

    def upload(self, key: str, data: bytes, content_type: str, metadata: dict) -> dict:
        pid, c, b = self._ctx()
        r = c.put_object(Bucket=b, Key=key, Body=data, ContentType=content_type, Metadata=metadata)
        return {"provider": pid, "request_id": request_id(r), "sha256": sha256(data), "key": key}

    def fetch(self, key: str, byte_range: str | None = None) -> dict:
        pid, c, b = self._ctx()
        r = c.get_object(Bucket=b, Key=key, **({"Range": byte_range} if byte_range else {}))
        body = r["Body"].read()
        return {"provider": pid, "request_id": request_id(r), "body": body, "sha256": sha256(body),
                "content_type": r.get("ContentType"), "metadata": r.get("Metadata", {})}

    def info(self, key: str) -> dict:
        pid, c, b = self._ctx()
        r = c.head_object(Bucket=b, Key=key)
        return {"provider": pid, "request_id": request_id(r), "size": r.get("ContentLength"),
                "metadata": r.get("Metadata", {})}

    def list(self, prefix: str) -> list[str]:
        _, c, b = self._ctx()
        return [o["Key"] for o in c.list_objects_v2(Bucket=b, Prefix=prefix).get("Contents", [])]

    def share_link(self, key: str, expires: int = 300) -> str:
        pid, c, b = self._ctx()
        url = c.generate_presigned_url("get_object", Params={"Bucket": b, "Key": key}, ExpiresIn=expires)
        self.router.observer(pid, "GeneratePresignedUrl", {"Key": key, "ExpiresIn": expires}, None, None, None)
        r = httpx.get(url, timeout=8)
        self.router.observer(pid, "PresignedGet", {"Key": key}, r.status_code,
                             r.headers.get("x-amz-request-id"), None if r.is_success else str(r.status_code))
        return url

    def remove(self, key: str):
        _, c, b = self._ctx()
        c.delete_object(Bucket=b, Key=key)

    def editing_session(self) -> str:
        """What asset-service does when someone edits the deck: the behaviour RISE observes."""
        key = f"slides/draft-{uuid.uuid4().hex[:8]}.svg"
        data = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        self.upload(key, data, "image/svg+xml", {"owner": "pitch", "slide": "draft"})
        self.info(key)
        self.list("slides/")
        self.fetch(key)
        self.fetch(key, "bytes=0-31")  # thumbnail preview reads only the first bytes
        self.info("slides/independência.svg")  # the deck's closing slide, a non-ASCII key
        self.share_link(key)
        self.remove(key)
        return key
