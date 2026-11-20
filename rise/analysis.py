"""The RISE product flow for any public repository:
FETCH → SCAN (code evidence) → PLAN (AI) → TEST (reference vs target) → ADAPT → REPORT.

Tests run for real against both providers in disposable rise-* test buckets. Nothing from the
repository is executed: RISE reads its code, then exercises the behaviours it found.
"""
import hashlib
import json
import re
import threading
import time
import uuid

from . import ai, config as C, repo, scan as scanner
from .engine import COVERABLE, KINDS, TestSpec, run as run_test
from .storage import make_client

STAGES = ["fetch", "scan", "plan", "test", "adapt", "report"]
STORE = C.DATA / "analyses"
STORE.mkdir(parents=True, exist_ok=True)
REGION_LITERAL = re.compile(r"""(?:region_name|region|AWS_REGION|AWS_DEFAULT_REGION)\s*[=:]\s*['"]([a-z]{2}-[a-z]+-\d)['"]""")


def now() -> str:
    t = time.time()
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(t)) + f".{int(t * 1000) % 1000:03d}Z"


class Analyses:
    def __init__(self):
        self.lock = threading.RLock()
        self.run_lock = threading.Lock()  # one analysis exercises the providers at a time
        self.version = 0
        self.items: dict[str, dict] = {}
        for f in sorted(STORE.glob("*.json")):
            try:
                a = json.loads(f.read_text(encoding="utf-8"))
                if a.get("status") in ("queued", "running"):
                    a["status"], a["error"] = "error", "Interrupted by a server restart."
                self.items[a["id"]] = a
            except (OSError, ValueError):
                continue

    # ---------- public API ----------
    def start(self, url: str, ref_p: C.Provider, tgt_p: C.Provider) -> dict:
        owner, name, ref = repo.parse(url)  # raises RepoError on bad input
        aid = uuid.uuid4().hex[:10]
        a = {"id": aid, "url": f"https://github.com/{owner}/{name}" + (f"/tree/{ref}" if ref else ""),
             "repo": {"owner": owner, "name": name, "ref": ref or "HEAD"}, "status": "queued", "stage": None,
             "stages": {s: "todo" for s in STAGES}, "created": now(), "events": [],
             "providers": [ref_p.describe() | {"role": "reference"}, tgt_p.describe() | {"role": "target"}]}
        with self.lock:
            self.items[aid] = a
            self._save(a)
        threading.Thread(target=self._run, args=(aid, ref_p, tgt_p), daemon=True, name=f"rise-analysis-{aid}").start()
        return a

    def list(self) -> list[dict]:
        with self.lock:
            out = [{k: a.get(k) for k in ("id", "url", "repo", "status", "stage", "created", "finished", "score", "providers")}
                   for a in self.items.values()]
        return sorted(out, key=lambda a: a["created"], reverse=True)

    def get(self, aid: str) -> dict | None:
        with self.lock:
            a = self.items.get(aid)
            return json.loads(json.dumps(a)) if a else None

    def proof(self, aid: str) -> dict | None:
        a = self.get(aid)
        if not a:
            return None
        doc = {"title": "RISE Portability Proof", "scope": "Only the behaviours listed were tested, on the providers listed. "
               "Not a certificate of universal compatibility.", **{k: a.get(k) for k in (
                   "id", "url", "repo", "created", "finished", "providers", "scan", "plan", "results",
                   "results_before_adaptation", "adaptation", "score", "untested", "lockin", "events")}}
        doc["digest_sha256"] = hashlib.sha256(json.dumps(doc, sort_keys=True, default=str).encode()).hexdigest()
        return doc

    # ---------- internals ----------
    def _save(self, a):
        (STORE / f"{a['id']}.json").write_text(json.dumps(a, default=str), encoding="utf-8")

    def _update(self, aid, **kw):
        with self.lock:
            a = self.items[aid]
            a.update(kw)
            self._save(a)
            self.version += 1

    def _stage(self, aid, stage, status, msg=None, **data):
        with self.lock:
            a = self.items[aid]
            a["stage"], a["stages"][stage] = stage, status
            if msg:
                a["events"].append({"ts": now(), "stage": stage, "msg": msg, **({"data": data} if data else {})})
            self._save(a)
            self.version += 1

    def _run(self, aid, ref_p, tgt_p):
        with self.run_lock:
            self._update(aid, status="running", started=now())
            try:
                self._pipeline(aid, ref_p, tgt_p)
                self._update(aid, status="done", finished=now())
            except repo.RepoError as e:
                self._fail(aid, str(e))
            except Exception as e:  # noqa: BLE001 — surface any failure to the user with its type
                self._fail(aid, f"{type(e).__name__}: {e}")

    def _fail(self, aid, msg):
        with self.lock:
            a = self.items[aid]
            if a.get("stage"):
                a["stages"][a["stage"]] = "fail"
        self._update(aid, status="error", error=msg[:500], finished=now())

    def _pipeline(self, aid, P, T):  # P = reference provider, T = target provider
        a = self.items[aid]
        # FETCH
        self._stage(aid, "fetch", "running", "Downloading the repository archive from GitHub")
        r = repo.fetch(a["url"])
        files = r.pop("files")
        self._update(aid, repo={**a["repo"], **r, "files": len(files)})
        self._stage(aid, "fetch", "done", f"{len(files)} source files read ({r['archive_bytes'] // 1024} KB archive)")

        # SCAN
        self._stage(aid, "scan", "running", "Scanning code for object-storage usage and cloud lock-in")
        result = scanner.scan(files)
        prof = scanner.profile(result)
        regions = sorted({m.group(1) for t in files.values() for m in REGION_LITERAL.finditer(t)})
        code_region = regions[0] if regions else C.APP_REGION
        self._update(aid, scan={k: v for k, v in result.items() if k != "lockin"}, profile=prof,
                     lockin=result["lockin"], code_region={"value": code_region, "found": regions[:5]})
        if not result["uses_s3"]:
            self._stage(aid, "scan", "done", f"No S3 object-storage calls found in {len(files)} files; "
                                             f"{len(result['lockin'])} other cloud services detected")
            for s in ("plan", "test", "adapt"):
                self._stage(aid, s, "skipped")
            self._report(aid)
            return
        self._stage(aid, "scan", "done", f"{sum(result['operations'].values())} S3 call sites, "
                                         f"{len(prof['items'])} behaviours, {len(result['lockin'])} other services")

        # PLAN
        self._stage(aid, "plan", "running", f"AI is writing the test plan ({C.OPENROUTER_MODEL})")
        app_cfg = {"target": {"region": code_region, "addressing_style": "path"}}
        plan = ai.plan(prof, a["providers"], app_cfg, result["evidence"])
        self._update(aid, plan=plan, app_config=app_cfg)
        src = plan["source"]
        self._stage(aid, "plan", "done", f"{len(plan['tests'])} tests · {src['mode']}"
                    + (f" · {src.get('ms')} ms" if src["mode"] == "live" else ""))

        # TEST
        specs = [TestSpec(**t) for t in plan["tests"]]
        self._stage(aid, "test", "running", f"Running {len(specs)} tests on both providers")
        # the reference signs as its provider documents; the target signs as the code does (that is the question)
        ref_c = make_client(P.endpoint, P.region, P.access_key, P.secret_key)
        tgt_c = make_client(T.endpoint, code_region, T.access_key, T.secret_key)
        results = {"reference": [], "target": []}
        for spec in specs:
            results["reference"].append(run_test(spec, ref_c, P.test_bucket, aid, "reference"))
            results["target"].append(run_test(spec, tgt_c, T.test_bucket, aid, "target"))
            self._update(aid, results=results)
        bad = [x for x in results["target"] if x["status"] != "pass"]
        self._stage(aid, "test", "done", f"Target passed {len(specs) - len(bad)}/{len(specs)}; "
                                         f"reference passed {sum(x['status'] == 'pass' for x in results['reference'])}/{len(specs)}")

        # ADAPT (one constrained client-config change, then retest everything on the target)
        if bad:
            self._stage(aid, "adapt", "running", "Asking AI for one allowed client-config change")
            compact = [{"test_id": x["test_id"], "kind": x["kind"], "status": x["status"], "error": x["error"],
                        "failed_checks": [c for c in x["checks"] if not c["ok"]]} for x in bad]
            proposal = ai.adapt(compact, app_cfg["target"], T.describe())
            record = {"proposal": proposal, "applied": False}
            if proposal["key"] != "none":
                after = {**app_cfg["target"], proposal["key"]: proposal["value"]}
                tgt2 = make_client(T.endpoint, after["region"], T.access_key, T.secret_key, after["addressing_style"])
                retest = [run_test(sp, tgt2, T.test_bucket, aid, "target") for sp in specs]
                still = [x for x in retest if x["status"] != "pass"]
                record |= {"applied": True, "before": app_cfg["target"], "after": after,
                           "retest": {"passed": len(retest) - len(still), "total": len(retest)}}
                self._update(aid, results_before_adaptation=results["target"], results={**results, "target": retest})
                self._stage(aid, "adapt", "done", f"{proposal['key']}: {app_cfg['target'][proposal['key']]} → "
                                                  f"{proposal['value']} · retest {len(retest) - len(still)}/{len(retest)}")
            else:
                self._stage(aid, "adapt", "done", f"No allowed config change fixes the remaining failures: {proposal['diagnosis'][:160]}")
            self._update(aid, adaptation=record)
        else:
            self._stage(aid, "adapt", "skipped", "Nothing to adapt: the target passed every test")
        self._report(aid)

    def _report(self, aid):
        self._stage(aid, "report", "running")
        a = self.items[aid]
        prof = a.get("profile") or {"items": []}
        items = prof["items"]
        target = {x["test_id"]: x for x in (a.get("results") or {}).get("target", [])}
        tests = (a.get("plan") or {}).get("tests", [])
        verdict = {}
        for item in items:
            covering = [t for t in tests if item in KINDS[t["kind"]]["covers"]]
            if not covering or item not in COVERABLE:
                verdict[item] = "untested"
                continue
            statuses = {target.get(t["id"], {}).get("status", "untested") for t in covering}
            verdict[item] = "pass" if statuses == {"pass"} else "unsupported" if "unsupported" in statuses else "fail"
        n = len(verdict) or 1
        passed = sum(v == "pass" for v in verdict.values())
        score = {"verified": passed, "total": len(verdict), "percent": round(100 * passed / n) if verdict else None,
                 "unsupported": sum(v == "unsupported" for v in verdict.values()),
                 "failed": sum(v == "fail" for v in verdict.values()),
                 "untested": sum(v == "untested" for v in verdict.values()),
                 "lockin_services": len(a.get("lockin") or [])}
        self._update(aid, verdict=verdict, score=score, untested=[k for k, v in verdict.items() if v == "untested"])
        self._stage(aid, "report", "done", f"{passed}/{len(verdict)} storage behaviours verified on the target"
                                           f" · {score['lockin_services']} other cloud services to plan for")
