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
from concurrent.futures import ThreadPoolExecutor

from . import ai, config as C, docs, fast, repo, scan as scanner
from .engine import COVERABLE, KINDS, TestSpec, run as run_test
from .storage import make_client

STAGES = ["fetch", "scan", "docs", "plan", "test", "adapt", "report"]
POOL = ThreadPoolExecutor(max_workers=24, thread_name_prefix="rise-test")  # S3 calls are I/O-bound: run them all at once
STORE = C.DATA / "analyses"
STORE.mkdir(parents=True, exist_ok=True)
REGION_LITERAL = re.compile(r"""(?:region_name|region|AWS_REGION|AWS_DEFAULT_REGION)\s*[=:]\s*['"]([a-z]{2}-[a-z]+-\d)['"]""")


def now() -> str:
    t = time.time()
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(t)) + f".{int(t * 1000) % 1000:03d}Z"



def decide(score: dict | None, verdict: dict, adaptation: dict | None) -> dict:
    """The one-line answer, from real results only. kind: ready | ready_with_change | partial | not_ready | no_storage."""
    ad = adaptation or {}
    fixed = bool(ad.get("applied")) and ad["retest"]["passed"] == ad["retest"]["total"]
    bad = [k for k, v in verdict.items() if v in ("fail", "unsupported")]
    untested = [k for k, v in verdict.items() if v == "untested"]
    change = {"key": ad["proposal"]["key"], "from": ad["before"][ad["proposal"]["key"]], "to": ad["proposal"]["value"]} \
        if ad.get("applied") else None
    if not score or not score["total"]:
        kind, title = "no_storage", "No object storage found"
    elif bad or (ad.get("applied") and not fixed):
        kind, title = "not_ready", "Not ready to migrate"
    elif untested:
        kind, title = "partial", "Partially verified"
    elif fixed:
        kind, title = "ready_with_change", "Ready to migrate · 1 change"
    else:
        kind, title = "ready", "Ready to migrate"
    return {"kind": kind, "title": title, "change": change, "failing": bad, "untested": untested}

class Analyses:
    def __init__(self):
        self.lock = threading.RLock()
        self.run_lock = threading.BoundedSemaphore(4)  # a comparison runs its targets side by side; keys never collide
        self.version = 0
        self.items: dict[str, dict] = {}
        self._t: dict[tuple, float] = {}  # (analysis, stage) -> perf_counter at start
        for f in sorted(STORE.glob("*.json")):
            try:
                a = json.loads(f.read_text(encoding="utf-8"))
                if a.get("status") in ("queued", "running"):
                    a["status"], a["error"] = "error", "Interrupted by a server restart."
                self.items[a["id"]] = a
            except (OSError, ValueError):
                continue

    # ---------- public API ----------
    def start(self, url: str, ref_p: C.Provider, tgt_p: C.Provider | None, token: str | None = None, goal: str = "",
              group: str | None = None, local: dict | None = None, docs_key: str | None = None) -> dict:
        """tgt_p None = the destination is not connected yet: RISE reads its documentation only (docs_key)."""
        if local:  # files from the local MCP client, already filtered by repo.local
            owner, name, ref, url = "local", local["name"], "local", local["url"]
        else:
            owner, name, ref = repo.parse(url)  # raises RepoError on bad input
            url = f"https://github.com/{owner}/{name}" + (f"/tree/{ref}" if ref else "")
        token = repo.check_token(token)  # kept in the worker thread's arguments only, never in the record
        aid = uuid.uuid4().hex[:10]
        a = {"id": aid, "url": url,
             "repo": {"owner": owner, "name": name, "ref": ref or "HEAD", "local": bool(local)}, "status": "queued", "stage": None,
             "stages": {s: "todo" for s in STAGES}, "created": now(), "events": [],
             "providers": [ref_p.describe() | {"role": "reference"}, tgt_p.describe() | {"role": "target"} if tgt_p else
                           {"id": f"docs:{docs_key}", "name": docs.PROVIDERS[docs_key]["name"], "simulated": False,
                            "docs_only": True, "role": "target"}],
             "goal": goal[:300], "group": group, "private": bool(token)}
        # read the destination's docs when it is a provider RISE knows (by connection, or named in the goal)
        a["docs_for"] = docs_key or (docs.of_connection(a["providers"][1]) if tgt_p else None) \
            or (docs.detect(goal) if tgt_p and not tgt_p.simulated else None)
        with self.lock:
            self.items[aid] = a
            self._save(a)
        threading.Thread(target=self._run, args=(aid, ref_p, tgt_p, token, local), daemon=True, name=f"rise-analysis-{aid}").start()
        return a

    def list(self) -> list[dict]:
        with self.lock:
            out = [{k: a.get(k) for k in ("id", "url", "repo", "status", "stage", "created", "finished", "score", "providers",
                                          "duration_ms", "decision", "group", "goal", "error")}
                   for a in self.items.values()]
        return sorted(out, key=lambda a: a["created"], reverse=True)

    def get(self, aid: str) -> dict | None:
        with self.lock:
            a = self.items.get(aid)
            a = json.loads(json.dumps(a)) if a else None
        if a and a.get("score") and "decision" not in a:  # analyses saved before decisions existed
            a["decision"] = decide(a["score"], a.get("verdict") or {}, a.get("adaptation"))
        return a

    def proof(self, aid: str) -> dict | None:
        a = self.get(aid)
        if not a:
            return None
        doc = {"title": "RISE Portability Proof", "scope": "Only the behaviours listed were tested, on the providers listed. "
               "Not a certificate of universal compatibility.", **{k: a.get(k) for k in (
                   "id", "url", "repo", "created", "finished", "providers", "scan", "plan", "results",
                   "results_before_adaptation", "adaptation", "decision", "goal", "risks", "brief", "score", "untested", "lockin", "events")}}
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
            if status == "running":
                self._t[aid, stage] = time.perf_counter()
            elif (aid, stage) in self._t:
                a.setdefault("stage_ms", {})[stage] = round((time.perf_counter() - self._t.pop((aid, stage))) * 1000)
            if msg:
                a["events"].append({"ts": now(), "stage": stage, "msg": msg, **({"data": data} if data else {})})
            self._save(a)
            self.version += 1

    def _run(self, aid, ref_p, tgt_p, token=None, local=None):
        with self.run_lock:
            self._update(aid, status="running", started=now())
            t0 = time.perf_counter()
            try:
                self._pipeline(aid, ref_p, tgt_p, token, local)
                self._update(aid, status="done", finished=now(), duration_ms=round((time.perf_counter() - t0) * 1000))
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

    def _pipeline(self, aid, P, T, token=None, local=None):  # P = reference provider, T = target provider
        a = self.items[aid]
        # FETCH
        self._stage(aid, "fetch", "running", "Reading the local folder" if local else "Downloading the repository archive from GitHub")
        r = dict(local) if local else repo.fetch(a["url"], token)
        del token
        files = r.pop("files")
        self._update(aid, repo={**a["repo"], **r, "files": len(files)})
        self._stage(aid, "fetch", "done", f"{len(files)} source files read ({r['archive_bytes'] // 1024} KB"
                                          f"{' sent from your machine' if local else ' archive'})")

        # SCAN
        self._stage(aid, "scan", "running", "Scanning code for object-storage usage and cloud lock-in")
        result, risks, speed = fast.analyze(files)  # every CPU core; identical to the single-core scan
        prof = scanner.profile(result)
        regions = sorted({m.group(1) for t in files.values() if "egion" in t or "REGION" in t
                          for m in REGION_LITERAL.finditer(t)})  # substring prefilter: the regex is slow on big repos
        code_region = regions[0] if regions else C.APP_REGION
        self._update(aid, scan={k: v for k, v in result.items() if k != "lockin"}, profile=prof, speed=speed,
                     lockin=result["lockin"], code_region={"value": code_region, "found": regions[:5]})
        self._update(aid, risks=risks)
        fast_note = f"{speed['lines']:,} lines in {speed['ms']:,.0f} ms on {speed['cores']} core{'s' if speed['cores'] > 1 else ''} · "
        # the plain-language briefing is written while the test plan is written: it adds no time
        brief_f = POOL.submit(ai.brief, a.get("goal") or "", result, risks, a["providers"])
        if not result["uses_s3"] and not result["unrecognised"]:
            self._stage(aid, "scan", "done", fast_note + f"No S3 object-storage calls found in {len(files)} files; "
                                             f"{len(result['lockin'])} other cloud services detected")
            for s in ("docs", "plan", "test", "adapt"):
                self._stage(aid, s, "skipped")
            self._update(aid, brief=brief_f.result())
            self._report(aid)
            return
        self._stage(aid, "scan", "done", fast_note + f"{sum(result['operations'].values())} {' + '.join(result.get('sdk') or ['S3'])} call sites, "
                                         f"{len(prof['items'])} behaviours, {len(result['lockin'])} other services")

        # DOCS (in parallel with the plan): what the destination's official documentation says about each behaviour
        key = a.get("docs_for")
        docs_f = None
        if key:
            self._stage(aid, "docs", "running", f"Reading {docs.PROVIDERS[key]['name']} documentation")
            docs_f = POOL.submit(docs.check, key, prof["items"], code_region)
        else:
            self._stage(aid, "docs", "skipped")

        def docs_done():
            if not docs_f:
                return
            try:
                d = docs_f.result()
            except Exception as e:  # noqa: BLE001 — docs are extra evidence; tests still decide
                self._stage(aid, "docs", "fail", f"Documentation unavailable: {e}")
                return
            n = sum(f["status"] == "documented" for f in d["findings"])
            self._update(aid, docs=d)
            self._stage(aid, "docs", "done", f"{n}/{len(d['findings'])} behaviours documented by {d['name']}"
                        + (f" · docs list regions {', '.join(d['regions'][:3])}… code signs {code_region}" if d["region_mismatch"] else ""))

        if T is None:  # not connected: documentation only, said plainly
            docs_done()
            for s in ("plan", "test", "adapt"):
                self._stage(aid, s, "skipped", f"Connect {a['providers'][1]['name']} to prove it with real tests" if s == "test" else None)
            self._update(aid, brief=brief_f.result())
            self._report(aid)
            return

        # PLAN
        self._stage(aid, "plan", "running", "AI is writing the test plan")
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
        # every test on both providers at once; keys are unique per analysis, role and test, so nothing collides
        jobs = {role: [POOL.submit(run_test, sp, c, b, f"{aid}/{role}", role) for sp in specs]
                for role, c, b in (("reference", ref_c, P.test_bucket), ("target", tgt_c, T.test_bucket))}
        results = {role: [f.result() for f in fs] for role, fs in jobs.items()}
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
                retest = list(POOL.map(lambda sp: run_test(sp, tgt2, T.test_bucket, f"{aid}/retest", "target"), specs))
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
        docs_done()
        self._update(aid, brief=brief_f.result())
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
        for call in (a.get("scan") or {}).get("unrecognised") or {}:  # storage calls RISE has no test for: never "ready"
            verdict[call] = "untested"
        n = len(verdict) or 1
        passed = sum(v == "pass" for v in verdict.values())
        score = {"verified": passed, "total": len(verdict), "percent": round(100 * passed / n) if verdict else None,
                 "unsupported": sum(v == "unsupported" for v in verdict.values()),
                 "failed": sum(v == "fail" for v in verdict.values()),
                 "untested": sum(v == "untested" for v in verdict.values()),
                 "lockin_services": len(a.get("lockin") or [])}
        self._update(aid, verdict=verdict, score=score, untested=[k for k, v in verdict.items() if v == "untested"])
        D = decide(score, verdict, a.get("adaptation"))
        if a["providers"][1].get("docs_only") and a.get("docs") and D["kind"] != "no_storage":
            f = a["docs"]["findings"]
            score["percent"] = None  # nothing was tested: no score, not 0%
            self._update(aid, score=score)
            D |= {"kind": "documented", "title": f"Docs confirm {sum(x['status'] == 'documented' for x in f)} of {len(f)} · not proven yet"}
        self._update(aid, decision=D)
        self._stage(aid, "report", "done", f"{passed}/{len(verdict)} storage behaviours verified on the target"
                                           f" · {score['lockin_services']} other cloud services to plan for")
