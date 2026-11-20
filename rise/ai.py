"""LLM via OpenRouter: observed behaviour -> validated test plan; failing tests -> one constrained adaptation.

The model never touches storage, secrets or the shell. Its JSON is schema-checked and validated
before anything runs. Fallback order when the live call fails: cached (labelled) -> rules (labelled).
"""
import hashlib
import json
import re
import time

import httpx
from pydantic import ValidationError

from . import config as C
from .engine import COVERABLE, KINDS, MAX_SIZE, TestSpec, rules_plan

URL = "https://openrouter.ai/api/v1/chat/completions"
CACHE = C.DATA / "ai_cache.json"

_n = lambda t: {"type": [t, "null"]}  # noqa: E731
PARAMS_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "required": ["size_bytes", "content_type", "metadata", "prefix", "count", "expires_seconds",
                 "range_start", "range_end", "key_suffix", "storage_class"],
    "properties": {
        "size_bytes": _n("integer"), "content_type": _n("string"),
        "metadata": {"type": ["array", "null"], "items": {
            "type": "object", "additionalProperties": False, "required": ["key", "value"],
            "properties": {"key": {"type": "string"}, "value": {"type": "string"}}}},
        "prefix": _n("string"), "count": _n("integer"), "expires_seconds": _n("integer"),
        "range_start": _n("integer"), "range_end": _n("integer"), "key_suffix": _n("string"),
        "storage_class": _n("string")},
}
PLAN_SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["summary", "tests", "risks", "not_covered"],
    "properties": {
        "summary": {"type": "string"},
        "tests": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["id", "kind", "title", "rationale", "params"],
            "properties": {"id": {"type": "string"}, "kind": {"type": "string", "enum": list(KINDS)},
                           "title": {"type": "string"}, "rationale": {"type": "string"}, "params": PARAMS_SCHEMA}}},
        "risks": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["title", "detail", "severity"],
            "properties": {"title": {"type": "string"}, "detail": {"type": "string"},
                           "severity": {"type": "string", "enum": ["low", "medium", "high"]}}}},
        "not_covered": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["item", "reason"],
            "properties": {"item": {"type": "string"}, "reason": {"type": "string"}}}},
    },
}
ADAPT_SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["diagnosis", "key", "value", "confidence"],
    "properties": {"diagnosis": {"type": "string"},
                   "key": {"type": "string", "enum": ["region", "addressing_style", "none"]},
                   "value": {"type": "string"},
                   "confidence": {"type": "string", "enum": ["low", "medium", "high"]}},
}
ALLOWED = {"region": re.compile(r"^[a-z]{2,10}(-[a-z0-9]{1,12}){0,3}$"),
           "addressing_style": re.compile(r"^(path|virtual)$")}

PLAN_SYSTEM = """You are the analysis engine of RISE, a cloud portability verification tool.
Input: the S3 usage profile of a real application (from runtime instrumentation, or static analysis with
file:line code evidence), its S3 client settings, the reference and target providers, and a catalogue of
executable test kinds.
Produce a compatibility test plan that checks exactly the behaviours THIS application depends on.
Rules:
- Use only catalogue kinds. Parameters must mirror what the app really does (content types, metadata keys, prefixes, sizes, non-ASCII keys).
- Every observed operation/feature must be covered by a test, or listed in not_covered with a reason.
- risks: concrete portability risks for this app and these providers (e.g. client signing region vs provider region, metadata handling, presigned URLs, key encoding). Never claim a result: tests decide.
- summary: ONE sentence, max 30 words, stating what the app depends on and the single biggest portability risk. No preamble.
- Max 12 tests. ids short like t1. Unused params = null. JSON only."""

ADAPT_SYSTEM = """You are the adaptation engine of RISE. Some compatibility tests failed against the destination.
Propose ONE configuration change to the application's S3 client for the destination, chosen only from
allowed_changes, that addresses the root cause. If no allowed change fits, use key "none".
Base the diagnosis on the error codes/messages and the provider description. JSON only."""


def _call(system: str, user: dict, name: str, schema: dict) -> tuple[dict, dict]:
    if not C.OPENROUTER_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")
    t0 = time.perf_counter()
    r = httpx.post(URL, timeout=40, headers={"Authorization": f"Bearer {C.OPENROUTER_KEY}", "X-Title": "RISE"}, json={
        "model": C.OPENROUTER_MODEL, "temperature": 0.2,
        "reasoning": {"effort": "low"},  # this endpoint requires reasoning; low effort cuts latency ~16 s → ~6 s
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(user)}],
        "response_format": {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}},
        "provider": {"require_parameters": True},
    })
    r.raise_for_status()
    body = r.json()
    content = body["choices"][0]["message"]["content"].strip()
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content)  # some models fence JSON anyway
    meta = {"model": body.get("model", C.OPENROUTER_MODEL), "ms": round((time.perf_counter() - t0) * 1000),
            "tokens": (body.get("usage") or {}).get("total_tokens"), "generation_id": body.get("id"),
            "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    return json.loads(content), meta


def _cache(kind: str, value: dict | None = None) -> dict | None:
    try:
        data = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    except (OSError, ValueError):
        data = {}
    if value is None:
        return data.get(kind)
    data[kind] = value
    CACHE.write_text(json.dumps(data, indent=1), encoding="utf-8")
    return value


def _validate_plan(raw: dict, profile: dict) -> dict:
    tests, notes, seen = [], [], set()
    for i, t in enumerate((raw.get("tests") or [])[:12]):
        try:
            spec = TestSpec(**{**t, "origin": "ai"})
        except (ValidationError, TypeError) as e:
            notes.append(f"Rejected AI test #{i + 1}: {str(e).splitlines()[0][:140]}")
            continue
        if spec.params.size_bytes and spec.params.size_bytes > MAX_SIZE:
            notes.append(f"{spec.id}: size clamped to {MAX_SIZE} bytes")
        if spec.id in seen:
            spec.id = f"{spec.id}-{i}"
        seen.add(spec.id)
        tests.append(spec)
    if not tests:
        raise ValueError("AI returned no valid tests")
    # guardrail: every observed, testable behaviour must be covered
    covered = {c for t in tests for c in KINDS[t.kind]["covers"]}
    for missing in sorted(set(profile["items"]) & COVERABLE - covered):
        extra = next(t for t in rules_plan(profile) if missing in KINDS[t.kind]["covers"])
        extra.id, extra.origin = f"v{len(tests) + 1}", "validator"
        tests.append(extra)
        covered |= set(KINDS[extra.kind]["covers"])
        notes.append(f"AI plan did not cover '{missing}': RISE validator added a {extra.kind} test")
    risks = [{"title": str(r.get("title", ""))[:120], "detail": str(r.get("detail", ""))[:400],
              "severity": r.get("severity") if r.get("severity") in ("low", "medium", "high") else "medium"}
             for r in (raw.get("risks") or [])[:6] if isinstance(r, dict)]
    not_covered = [{"item": str(n.get("item", ""))[:80], "reason": str(n.get("reason", ""))[:300]}
                   for n in (raw.get("not_covered") or [])[:10] if isinstance(n, dict)]
    return {"summary": str(raw.get("summary", ""))[:600], "tests": [t.model_dump() for t in tests],
            "risks": risks, "not_covered": not_covered, "validator": notes}


def plan(profile: dict, providers: list[dict], app_config: dict, evidence: list[dict] | None = None) -> dict:
    user = {"observed_profile": profile, "application_s3_config": app_config, "providers": providers,
            "code_evidence": (evidence or [])[:40],
            "catalogue": {k: f"{v['doc']} Covers: {', '.join(v['covers'])}" for k, v in KINDS.items()},
            "limits": {"max_tests": 12, "max_size_bytes": MAX_SIZE}}
    # a cached plan is only reused for the same observed behaviour
    cache_key = "plan:" + hashlib.sha256(json.dumps(profile["items"]).encode()).hexdigest()[:16]
    try:
        raw, meta = _call(PLAN_SYSTEM, user, "rise_test_plan", PLAN_SCHEMA)
        result = _validate_plan(raw, profile) | {"source": {"mode": "live", **meta}}
        return _cache(cache_key, result)
    except Exception as e:  # noqa: BLE001 — any failure falls back, with the reason shown
        reason = f"{type(e).__name__}: {str(e)[:200]}"
    cached = _cache(cache_key)
    if cached:
        return cached | {"source": {**cached["source"], "mode": "cached", "live_error": reason}}
    tests = rules_plan(profile)
    return {"summary": "Rule-based plan: one test per observed behaviour (AI unavailable).",
            "tests": [t.model_dump() for t in tests], "risks": [], "not_covered": [], "validator": [],
            "source": {"mode": "rules", "live_error": reason}}


def _rules_adapt(failures: list[dict], app_cfg: dict, dest: dict) -> dict:
    for f in failures:
        e = f.get("error") or {}
        text = f"{e.get('code')} {e.get('message')}".lower()
        if e.get("code") in {"AuthorizationHeaderMalformed", "SignatureDoesNotMatch", "InvalidRegion"} or "region" in text:
            region = e.get("region") or dest["documented_region"]
            if region != app_cfg["region"]:
                return {"diagnosis": f"Requests are signed for region '{app_cfg['region']}' but the destination "
                                     f"expects '{region}' ({e.get('code')}).",
                        "key": "region", "value": region, "confidence": "high"}
    return {"diagnosis": "No allowed configuration change matches these failures.", "key": "none", "value": "",
            "confidence": "low"}


def adapt(failures: list[dict], app_cfg: dict, dest: dict) -> dict:
    user = {"failing_tests": failures, "application_destination_config": app_cfg, "destination_provider": dest,
            "allowed_changes": {"region": "S3 SigV4 signing region used by the client",
                                "addressing_style": "path | virtual"}}
    try:
        raw, meta = _call(ADAPT_SYSTEM, user, "rise_adaptation", ADAPT_SCHEMA)
        key, value = raw.get("key"), str(raw.get("value", "")).strip()
        if key != "none" and not (key in ALLOWED and ALLOWED[key].match(value)):
            raise ValueError(f"AI proposed a change outside the allowed set: {key}={value!r}")
        return {"diagnosis": str(raw.get("diagnosis", ""))[:500], "key": key, "value": value,
                "confidence": raw.get("confidence", "medium"), "source": {"mode": "live", **meta}}
    except Exception as e:  # noqa: BLE001
        reason = f"{type(e).__name__}: {str(e)[:200]}"
    return _rules_adapt(failures, app_cfg, dest) | {"source": {"mode": "rules", "live_error": reason}}
