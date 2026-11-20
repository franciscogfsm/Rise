"""The RISE journey: CONNECT → DISCOVER → ANALYZE → CHALLENGE → ADAPT → VERIFY → SWITCH → PROVE.

Every state the UI shows comes from here, and every claim in the Freedom Proof is a recorded fact.
"""
import asyncio
import hashlib
import json
import threading
import time
import uuid
from collections import Counter

from botocore.exceptions import BotoCoreError, ClientError

from . import ai, config as C
from .engine import KINDS, TestSpec, cleanup, run as run_test
from .seed import assets
from .storage import err_info, features, make_client, request_id, sha256
from .workload import AssetService, Router

STEPS = ["connect", "discover", "analyze", "challenge", "adapt", "verify", "switch", "prove"]
PIDS = ("source", "destination")


class StepError(Exception):
    """A step cannot run (precondition) or failed; the message is shown to the user."""


def now() -> str:
    t = time.time()
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(t)) + f".{int(t * 1000) % 1000:03d}Z"


class Journey:
    def __init__(self, link):
        self.link = link
        self.loop: asyncio.AbstractEventLoop | None = None
        self.lock = threading.RLock()
        self.busy = threading.Lock()
        self.version = 0
        self.router = Router()
        self.router.observer = self._observe
        self.app = AssetService(self.router)
        self.traffic_on = False
        self._fresh()

    # ---------- state ----------
    def _fresh(self):
        with self.lock:
            self.run_id = uuid.uuid4().hex[:8]
            self.started = now()
            self.events, self.observations, self.trace, self.traffic = [], [], [], []
            self.steps = {s: "todo" for s in STEPS}
            self.health = self.plan = self.results = self.results_before = None
            self.adaptation = self.migration = self.switch = self.cut = self.live = None
            self._bump()

    def _bump(self):
        self.version += 1

    def event(self, kind: str, msg: str, **data):
        with self.lock:
            self.events.append({"seq": len(self.events) + 1, "ts": now(), "kind": kind, "msg": msg, "data": data})
            self._bump()

    def _step(self, name: str, status: str):
        with self.lock:
            self.steps[name] = status
            self._bump()

    def _observe(self, pid, op, params, status, rid, err):
        with self.lock:
            self.observations.append({
                "ts": now(), "provider": pid, "op": op, "status": status, "request_id": rid, "error": err,
                "features": features(op, params), "key": params.get("Key"), "size": params.get("BodyLength"),
                "content_type": params.get("ContentType"), "metadata_keys": sorted((params.get("Metadata") or {}))})
            del self.observations[:-1000]
            self._bump()

    def _exclusive(fn):  # noqa: N805 — decorator: one step at a time, errors become StepError
        def wrapper(self, *a, **kw):
            if not self.busy.acquire(blocking=False):
                raise StepError("Another step is still running.")
            try:
                return fn(self, *a, **kw)
            except (ClientError, BotoCoreError, OSError) as e:
                info = err_info(e)
                self.event("error", f"{fn.__name__}: {info['code']} {info['message']}", error=info)
                raise StepError(f"{info['code']}: {info['message']}") from e
            finally:
                self.busy.release()
        wrapper.__name__ = fn.__name__
        return wrapper

    def _run_async(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, self.loop).result(timeout=5)

    def providers(self) -> list[dict]:
        return [C.SOURCE.describe() | {"app_endpoint": C.SOURCE_APP_ENDPOINT}, C.DEST.describe()]

    # ---------- boot / reset ----------
    def boot(self):
        """Seed the pitch assets on the source (through the app) if missing, then CONNECT."""
        try:
            if not self.app.list("slides/"):
                self._seed()
        except (ClientError, BotoCoreError, OSError) as e:
            self.event("error", f"Seeding failed: {err_info(e)['message']}")
        self._connect()

    def _seed(self):
        for key, data, ct, md in assets():
            self.app.upload(key, data, ct, md)
        self.event("app", "asset-service stored the pitch assets on the source provider", count=len(assets()))

    @_exclusive
    def reset(self):
        """Back to the start: source live and linked, destination emptied (rise-* buckets only)."""
        if self.link and not self.link.up:
            self._run_async(self.link.start())
        self.router.reset()
        for p in (C.SOURCE, C.DEST):
            c = self._admin(p)
            for bucket in {p.bucket, p.test_bucket}:
                if not bucket.startswith("rise-"):
                    raise StepError(f"Refusing to clear bucket {bucket!r}: only rise-* buckets are disposable.")
                if p is C.DEST or bucket == p.test_bucket:
                    cleanup(c, bucket, "")
        self._fresh()
        self.boot()
        return self.snapshot()

    def _admin(self, p: C.Provider):
        """RISE's own client with the provider's documented settings (not the app's)."""
        return make_client(p.endpoint, p.region, p.access_key, p.secret_key)

    # ---------- CONNECT ----------
    @_exclusive
    def connect(self):
        return self._connect()

    def _connect(self):
        health = {}
        for pid in PIDS:
            p = self.router.provider(pid)
            try:
                r = self._admin(p).head_bucket(Bucket=p.bucket)
                health[pid] = {"ok": True, "request_id": request_id(r)}
            except (ClientError, BotoCoreError, OSError) as e:
                health[pid] = {"ok": False, "error": err_info(e)}
        health["link"] = self.link.probe() if self.link else {"reachable": None, "result": "real provider: no link"}
        health["ai"] = {"configured": bool(C.OPENROUTER_KEY), "model": C.OPENROUTER_MODEL}
        with self.lock:
            self.health = health
        ok = health["source"]["ok"] and health["destination"]["ok"]
        self._step("connect", "done" if ok else "fail")
        self.event("connect", "Both providers reachable" if ok else "A provider is not reachable", health=health)
        return self.snapshot()

    # ---------- DISCOVER ----------
    def profile(self) -> dict:
        obs = [o for o in self.observations if o["provider"] == "source"]
        ops = Counter(o["op"] for o in obs)
        feats = Counter(f for o in obs for f in o["features"])
        return {
            "observed_calls": len(obs), "operations": dict(ops), "features": dict(feats),
            "items": sorted(set(ops) | set(feats)),
            "content_types": sorted({o["content_type"] for o in obs if o["content_type"]}),
            "metadata_keys": sorted({k for o in obs for k in o["metadata_keys"]}),
            "prefixes": sorted({o["key"].rsplit("/", 1)[0] + "/" for o in obs if o["key"] and "/" in o["key"]})[:5],
            "max_size": max([o["size"] or 0 for o in obs] or [0]),
        }

    @_exclusive
    def discover(self):
        if self.router.active != "source":
            raise StepError("Discovery observes the app on its original provider. Reset first.")
        key = self.app.editing_session()
        prof = self.profile()
        self._step("discover", "done")
        self.event("discover", f"Observed {prof['observed_calls']} real S3 calls from asset-service "
                               f"({len(prof['operations'])} operations, {len(prof['features'])} behaviours)", key=key)
        return self.snapshot()

    # ---------- ANALYZE ----------
    @_exclusive
    def analyze(self):
        prof = self.profile()
        if not prof["observed_calls"]:
            raise StepError("Nothing observed yet. Run DISCOVER first.")
        self._step("analyze", "running")
        result = ai.plan(prof, self.providers(), self.router.cfg)
        with self.lock:
            self.plan = result | {"profile": prof}
        src = result["source"]
        self._step("analyze", "done")
        self.event("analyze", f"{len(result['tests'])} tests planned · {src['mode']}"
                              + (f" · {src.get('ms')} ms" if src["mode"] == "live" else ""),
                   source=src)
        return self.snapshot()

    # ---------- CHALLENGE ----------
    def _specs(self) -> list[TestSpec]:
        if not self.plan:
            raise StepError("No test plan yet. Run ANALYZE first.")
        return [TestSpec(**t) for t in self.plan["tests"]]

    def _run_on(self, pid: str, specs: list[TestSpec]) -> list[dict]:
        c, p = self.router.client(pid), self.router.provider(pid)
        return [run_test(s, c, p.test_bucket, self.run_id, pid) for s in specs]

    @_exclusive
    def challenge(self):
        specs = self._specs()
        self._step("challenge", "running")
        results = {pid: self._run_on(pid, specs) for pid in PIDS}
        with self.lock:
            self.results, self.results_before = results, None
        failing = [r for r in results["destination"] if r["status"] != "pass"]
        self._step("challenge", "attention" if failing else "done")
        for r in failing:
            e = r["error"] or {}
            self.event("incompatibility", f"{r['test_id']} {r['kind']} → {r['status'].upper()} on destination"
                                          + (f": {e.get('code')}" if e else ""), result=r)
        self.event("challenge", f"Destination passed {len(specs) - len(failing)}/{len(specs)} · "
                                f"source passed {sum(r['status'] == 'pass' for r in results['source'])}/{len(specs)}")
        return self.snapshot()

    # ---------- ADAPT ----------
    @_exclusive
    def adapt(self):
        if not self.results:
            raise StepError("Run CHALLENGE first.")
        failing = [r for r in self.results["destination"] if r["status"] != "pass"]
        if not failing:
            self._step("adapt", "skipped")
            self.event("adapt", "No incompatibility to adapt: destination passed every test")
            return self.snapshot()
        compact = [{"test_id": r["test_id"], "kind": r["kind"], "status": r["status"], "error": r["error"],
                    "failed_checks": [c for c in r["checks"] if not c["ok"]]} for r in failing]
        proposal = ai.adapt(compact, dict(self.router.cfg["destination"]), C.DEST.describe())
        record = {"proposal": proposal, "applied": False, "at": now()}
        if proposal["key"] != "none":
            before = self.router.configure("destination", proposal["key"], proposal["value"])
            record |= {"applied": True, "before": before, "after": dict(self.router.cfg["destination"])}
            self.event("adapt", f"Applied {proposal['key']}: {before[proposal['key']]} → {proposal['value']} "
                                f"({proposal['source']['mode']})", proposal=proposal)
            retest = self._run_on("destination", self._specs())
            with self.lock:
                self.results_before = self.results["destination"]
                self.results = {**self.results, "destination": retest}
            still = [r for r in retest if r["status"] != "pass"]
            record["retest"] = {"passed": len(retest) - len(still), "total": len(retest)}
            self.event("retest", f"Retest on destination: {len(retest) - len(still)}/{len(retest)} passed")
            self._step("adapt", "attention" if still else "done")
        else:
            self._step("adapt", "attention")
            self.event("adapt", f"No safe adaptation found: {proposal['diagnosis']}")
        with self.lock:
            self.adaptation = record
        return self.snapshot()

    # ---------- VERIFY ----------
    @_exclusive
    def verify(self):
        if not self.results or any(r["status"] != "pass" for r in self.results["destination"]):
            raise StepError("The destination has not passed every compatibility test yet.")
        self._step("verify", "running")
        src_c = self.router.client("source")  # the app's network path to the source
        dst_c = self.router.client("destination")  # the app's (adapted) destination settings
        objects = []
        for page in src_c.get_paginator("list_objects_v2").paginate(Bucket=C.SOURCE.bucket):
            for o in page.get("Contents", []):
                g = src_c.get_object(Bucket=C.SOURCE.bucket, Key=o["Key"])
                data = g["Body"].read()
                dst_c.put_object(Bucket=C.DEST.bucket, Key=o["Key"], Body=data,
                                 ContentType=g.get("ContentType") or "application/octet-stream",
                                 Metadata=g.get("Metadata", {}))
                back = dst_c.get_object(Bucket=C.DEST.bucket, Key=o["Key"])
                body = back["Body"].read()
                objects.append({"key": o["Key"], "size": len(data), "sha256_source": sha256(data),
                                "sha256_destination": sha256(body), "match": sha256(data) == sha256(body),
                                "metadata_match": g.get("Metadata", {}) == back.get("Metadata", {}),
                                "content_type": back.get("ContentType"), "request_id": request_id(back)})
        ok = bool(objects) and all(o["match"] and o["metadata_match"] for o in objects)
        with self.lock:
            self.migration = {"at": now(), "objects": objects, "ok": ok}
        self._step("verify", "done" if ok else "fail")
        self.event("verify", f"{sum(o['match'] for o in objects)}/{len(objects)} objects copied and verified "
                             f"by SHA-256 of their bytes on the destination")
        return self.snapshot()

    # ---------- SWITCH ----------
    @_exclusive
    def switch_to_destination(self):
        if not (self.migration and self.migration["ok"]):
            raise StepError("Switching requires a verified destination (run VERIFY).")
        self.router.activate("destination")
        probe = self.app.fetch("slides/stat-89.svg")
        with self.lock:
            self.switch = {"at": now(), "from": "source", "to": "destination", "probe": {
                "key": "slides/stat-89.svg", "provider": probe["provider"], "request_id": probe["request_id"],
                "sha256": probe["sha256"]}}
        self._step("switch", "done")
        self.event("switch", f"asset-service now routes storage to {C.DEST.name}; first read served by "
                             f"{probe['provider']} (request {probe['request_id']})")
        return self.snapshot()

    # ---------- CUT ----------
    @_exclusive
    def cut_source(self):
        if not self.link:
            raise StepError("Cutting is only available for the simulated source link in this MVP.")
        self._run_async(self.link.cut())
        probe = self.link.probe()
        try:  # the app's own source client must now fail
            self.router.client("source").head_bucket(Bucket=C.SOURCE.bucket)
            app_probe = {"ok": True, "result": "source still reachable"}
        except (ClientError, BotoCoreError, OSError) as e:
            app_probe = {"ok": False, "result": f"{err_info(e)['code']}: {err_info(e)['message'][:160]}"}
        with self.lock:
            self.cut = {"at": now(), "tcp_probe": probe, "app_probe": app_probe}
        self.event("cut", f"Source link cut · TCP probe: {probe['result']} · app: {app_probe['result']}")
        return self.snapshot()

    @_exclusive
    def restore_source(self):
        if self.link:
            self._run_async(self.link.start())
        with self.lock:
            if self.cut:
                self.cut["restored_at"] = now()
        self.event("restore", "Source link restored")
        return self.snapshot()

    # ---------- PROVE ----------
    @_exclusive
    def prove_new_operation(self):
        if self.router.active != "destination":
            raise StepError("Switch to the destination first.")
        token = uuid.uuid4().hex
        key = f"proof/live-{token[:12]}.txt"
        data = f"RISE live proof · run {self.run_id} · {now()} · {token}".encode()
        up = self.app.upload(key, data, "text/plain", {"owner": "rise-proof"})
        got = self.app.fetch(key)
        source_state = self.link.probe() if self.link else None
        live = {"at": now(), "key": key, "bytes": len(data), "sha256_written": up["sha256"],
                "sha256_read": got["sha256"], "match": up["sha256"] == got["sha256"],
                "provider": got["provider"], "put_request_id": up["request_id"], "get_request_id": got["request_id"],
                "source_link_at_time": source_state}
        with self.lock:
            self.live = live
        self._step("prove", "done" if live["match"] and live["provider"] == "destination" else "fail")
        self.event("prove", f"New object {key} written and read back on {got['provider']} · SHA-256 "
                            f"{'match' if live['match'] else 'MISMATCH'}"
                            + (" · source unreachable" if source_state and not source_state["reachable"] else ""))
        return self.snapshot()

    # ---------- live user traffic ----------
    def traffic_start(self):
        with self.lock:
            if self.traffic_on:
                return self.snapshot()
            self.traffic_on = True
        threading.Thread(target=self._traffic_loop, daemon=True, name="rise-traffic").start()
        self.event("traffic", "Live user traffic started: a real GET every 300 ms through asset-service's router")
        return self.snapshot()

    def traffic_stop(self):
        self.traffic_on = False
        self.event("traffic", "Live user traffic stopped")
        return self.snapshot()

    def _traffic_loop(self):
        keys = [k for k, *_ in assets()]
        i = 0
        while self.traffic_on:
            t0 = time.perf_counter()
            pid = self.router.active
            p, key = self.router.provider(pid), keys[i % len(keys)]
            i += 1
            rec = {"ts": now(), "provider": pid, "key": key}
            try:
                r = self.router.client(pid).get_object(Bucket=p.bucket, Key=key)
                rec |= {"ok": True, "request_id": request_id(r), "bytes": len(r["Body"].read())}
            except (ClientError, BotoCoreError, OSError) as e:
                rec |= {"ok": False, "error": err_info(e)["code"]}
            rec["ms"] = round((time.perf_counter() - t0) * 1000)
            with self.lock:
                self.traffic.append(rec)
                del self.traffic[:-600]
                self._bump()
            time.sleep(max(0.0, 0.3 - (time.perf_counter() - t0)))

    def traffic_stats(self) -> dict:
        with self.lock:
            pts = list(self.traffic)
        ms = sorted(p["ms"] for p in pts if p["ok"])
        after = [p for p in pts if self.switch and p["ts"] >= self.switch["at"]]
        return {"on": self.traffic_on, "total": len(pts), "failed": sum(not p["ok"] for p in pts),
                "after_switch": len(after), "failed_after_switch": sum(not p["ok"] for p in after),
                "by_provider": dict(Counter(p["provider"] for p in pts if p["ok"])),
                "p50_ms": ms[len(ms) // 2] if ms else None}

    # ---------- pitch assets ----------
    def serve_asset(self, key: str, rid: str) -> dict:
        try:
            r = self.app.fetch(key)
        except (ClientError, BotoCoreError, OSError) as e:
            info = err_info(e)
            with self.lock:
                self.trace.append({"ts": now(), "key": key, "rid": rid[:40], "provider": self.router.active,
                                   "ok": False, "error": info["code"]})
                self._bump()
            raise StepError(f"{info['code']}: {info['message']}") from e
        with self.lock:
            self.trace.append({"ts": now(), "key": key, "rid": rid[:40], "provider": r["provider"], "ok": True,
                               "request_id": r["request_id"], "sha256": r["sha256"]})
            del self.trace[:-300]
            self._bump()
        return r

    # ---------- views ----------
    def proof(self) -> dict:
        with self.lock:
            prof = self.profile()
            plan = self.plan or {}
            tested = {c for t in plan.get("tests", []) for c in KINDS[t["kind"]]["covers"]}
            doc = {
                "title": "RISE Freedom Proof",
                "scope": "Records only what was executed in this run. Not a certificate of universal compatibility.",
                "run_id": self.run_id, "started": self.started, "generated": now(),
                "workload": "asset-service (S3 object storage)",
                "environments": self.providers(),
                "observed_dependencies": {"operations": prof["operations"], "behaviours": prof["features"]},
                "test_plan": {"source": plan.get("source"), "tests": plan.get("tests"), "risks": plan.get("risks"),
                              "validator_notes": plan.get("validator")},
                "results": self.results, "results_before_adaptation": self.results_before,
                "adaptation": self.adaptation, "integrity": self.migration, "switch": self.switch,
                "source_disconnection": self.cut, "new_operation_after_switch": self.live,
                "remaining_untested": sorted(set(prof["items"]) - tested)
                + [n["item"] for n in plan.get("not_covered") or []],
                "pitch_requests": self.trace[-60:],
                "live_traffic": self.traffic_stats(),
                "events": self.events,
            }
        doc["digest_sha256"] = hashlib.sha256(json.dumps(doc, sort_keys=True, default=str).encode()).hexdigest()
        return doc

    def snapshot(self) -> dict:
        with self.lock:
            return {
                "version": self.version, "run_id": self.run_id, "steps": self.steps, "busy": self.busy.locked(),
                "providers": self.providers(), "active": self.router.active, "app_config": self.router.cfg,
                "link_up": self.link.up if self.link else None, "health": self.health,
                "ai": {"configured": bool(C.OPENROUTER_KEY), "model": C.OPENROUTER_MODEL},
                "profile": self.profile(), "observations": self.observations[-40:], "plan": self.plan,
                "results": self.results, "results_before": self.results_before, "adaptation": self.adaptation,
                "migration": self.migration, "switch": self.switch, "cut": self.cut, "live": self.live,
                "trace": self.trace[-30:], "events": self.events[-40:],
                "traffic": {**self.traffic_stats(), "points": [
                    {k: p.get(k) for k in ("ts", "provider", "ok", "ms", "error")} for p in self.traffic[-200:]]},
            }
