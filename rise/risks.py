"""Architecture risks found in the code: single points of failure, hard-coded cloud choices, leaked keys.

Deterministic rules with file:line evidence. The AI may explain them, it never invents them.
"""
import re

SECRET = re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|(?i:secret_?access_?key|aws_secret)\s*[=:]\s*['\"][A-Za-z0-9/+]{30,}['\"]")
REGION_LIT = re.compile(r"(?:region(?:_name)?|AWS_REGION)\s*[=:(]\s*['\"`]([a-z]{2}-[a-z]+-\d)['\"`]", re.I)
AWS_HOST = re.compile(r"[a-z0-9.-]*\.amazonaws\.com")
SPECIFIC = [  # features that only some providers offer
    (re.compile(r"aws:kms|SSEKMSKeyId|SSEKMS"), "KMS-managed encryption (SSE-KMS)"),
    (re.compile(r"GLACIER|DEEP_ARCHIVE|INTELLIGENT_TIERING"), "AWS storage classes (Glacier / Intelligent-Tiering)"),
    (re.compile(r"use_accelerate_endpoint|useAccelerateEndpoint|s3-accelerate"), "S3 Transfer Acceleration"),
    (re.compile(r"ObjectLock|object_lock"), "Object Lock"),
    (re.compile(r"s3:ObjectCreated|put_bucket_notification|NotificationConfiguration"), "S3 event notifications"),
]
FALLBACK = re.compile(r"replicat|ReplicationConfiguration|fallback|failover|secondary_?(?:endpoint|bucket|region)|backup_?bucket", re.I)
RESILIENCE = re.compile(r"max_attempts|maxAttempts|retries\s*[=:]|retryMode|connect_timeout|requestTimeout|connectionTimeout|RetryConfig")
PUBLIC = re.compile(r"public-read(?:-write)?")
SKIP = re.compile(r"(^|/)(tests?|__tests__|spec|examples?|docs?)/|\.(md|lock)$", re.I)


COMMENT = re.compile(r"^\s*(#|//|\*|/\*)")
# Speed: a substring test runs ~50x faster than these regexes. A pattern can only match text that holds one of its literals.
# shortcut: mixed-case spellings like "sEcReT" are not prefiltered in, fine for real code
NEEDS = {SECRET: ("AKIA", "ASIA", "ecret", "ECRET"), REGION_LIT: ("egion", "EGION"), AWS_HOST: ("amazonaws.com",),
         RESILIENCE: ("ttempts", "retries", "etryMode", "onnect_timeout", "equestTimeout", "onnectionTimeout", "RetryConfig")}


def _hits(files: dict[str, str], rx: re.Pattern, limit=3, redact=False, only=None, code_only=False) -> list[dict]:
    out, needs = [], NEEDS.get(rx)
    for path, text in sorted(files.items()):
        if SKIP.search(path) or (only is not None and path not in only) or (needs and not any(s in text for s in needs)) \
                or not rx.search(text):  # whole-text miss = no line can match
            continue
        for n, line in enumerate(text.splitlines(), 1):
            if len(line) < 400 and not (code_only and COMMENT.match(line)) and rx.search(line):
                code = SECRET.sub("[redacted]", line.strip()) if redact else line.strip()
                out.append({"file": path, "line": n, "code": code[:160]})
                if len(out) >= limit:
                    return out
    return out


# every search find() needs: key -> (pattern, limit, options)
PROBES = {"keys": (SECRET, 3, {"redact": True}), "fallback": (FALLBACK, 1, {"code_only": True}),
          "region": (REGION_LIT, 3, {}), "host": (AWS_HOST, 3, {}), "retries": (RESILIENCE, 1, {"code_only": True}),
          "public": (PUBLIC, 2, {}), **{f"specific{i}": (rx, 2, {}) for i, (rx, _) in enumerate(SPECIFIC)}}


def probe(files: dict[str, str], s3_files: list[str]) -> dict:
    """Run every search over one set of files. Results of consecutive chunks combine with merge() into probe(all)."""
    s3 = set(s3_files)  # a fallback counts only where the storage code is, and not in comments
    return {k: _hits(files, rx, lim, only=s3 if k == "fallback" else None, **kw) for k, (rx, lim, kw) in PROBES.items()}


def merge(parts: list[dict]) -> dict:
    return {k: [e for p in parts for e in p[k]][:lim] for k, (_, lim, _) in PROBES.items()}


def find(files: dict[str, str], scan: dict, hits: dict | None = None) -> list[dict]:
    """Each risk: id, severity (high|medium|low), title, detail, evidence [{file, line, code}]."""
    h = hits or probe(files, scan.get("s3_files") or [])
    R = []
    add = lambda i, sev, title, detail, ev=None: R.append(  # noqa: E731
        {"id": i, "severity": sev, "title": title, "detail": detail, "evidence": ev or []})
    if ev := h["keys"]:
        add("hardcoded-keys", "high", "Cloud keys written in the code",
            "Anyone with the repository can use these keys. Revoke them and load keys from the environment.", ev)
    if un := scan.get("unrecognised"):
        add("untested-calls", "medium", f"{len(un)} storage call{'s' if len(un) != 1 else ''} RISE does not test",
            f"RISE found these calls but has no real test for them: {', '.join(sorted(un)[:8])}. Check each one on the target "
            "by hand before you move.", [e for e in scan["evidence"] if e["category"] == "unrecognised"][:6])
    if sdk := scan.get("sdk"):
        n = sum(scan.get("operations", {}).values())
        add("storage-sdk", "high", f"Code talks to {', '.join(sdk)}'s own API, not S3",
            f"{n} storage call{'s' if n != 1 else ''} use{'s' if n == 1 else ''} {sdk[0]}'s SDK. Moving means swapping them for an S3 client: "
            "RISE maps each call to its S3 equivalent and tests that on the destination.",
            [e for e in scan["evidence"] if e["category"] == "sdk"][:3])
    if scan.get("uses_s3"):
        if not h["fallback"]:
            n = len(scan.get("s3_files") or [])
            add("single-provider", "high", "Single point of failure: one storage provider",
                f"All object storage goes to one provider ({n} file{'s' if n != 1 else ''}). RISE found no replication, "
                "fallback or second bucket in the code: if that provider or region is down, so is the app.")
        if ev := h["region"]:
            regions = sorted({m.group(1) for e in ev for m in [REGION_LIT.search(e["code"])] if m})
            add("hardcoded-region", "medium", f"Region fixed in the code ({', '.join(regions)})",
                "Moving to another provider or region needs a code change and a redeploy. Read the region from configuration.", ev)
        if ev := h["host"]:
            add("hardcoded-endpoint", "medium", "AWS addresses written in the code",
                "URLs that point at amazonaws.com break on any other provider. Use a configurable endpoint.", ev)
        for i, (_, name) in enumerate(SPECIFIC):
            if ev := h[f"specific{i}"]:
                add("specific-" + re.sub(r"\W+", "-", name.lower()).strip("-")[:30], "medium", f"Uses {name}",
                    "Not every S3-compatible provider offers this. Check the target supports it, or plan a replacement.", ev)
        if not h["retries"]:
            add("no-retries", "low", "No timeouts or retries configured",
                "The S3 client uses SDK defaults. A slow or failing provider can hang requests: set timeouts and retries.")
        if ev := h["public"]:
            add("public-acl", "medium", "Objects made public with ACLs",
                "Public ACLs behave differently across providers, and some disable them. Prefer presigned URLs or a CDN.", ev)
    lock = scan.get("lockin") or []
    if lock:
        names = [x["service"] for x in lock]
        add("other-services", "high" if len(lock) >= 3 else "medium",
            f"Tied to {len(lock)} other cloud service{'s' if len(lock) != 1 else ''}",
            f"{', '.join(names[:6])}{'…' if len(names) > 6 else ''}: each needs an equivalent at the target. RISE does not test these yet.",
            [e for x in lock for e in x["evidence"][:1]][:3])
    order = {"high": 0, "medium": 1, "low": 2}
    return sorted(R, key=lambda r: order[r["severity"]])
