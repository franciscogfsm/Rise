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


def _hits(files: dict[str, str], rx: re.Pattern, limit=3, redact=False, only=None, code_only=False) -> list[dict]:
    out = []
    for path, text in sorted(files.items()):
        if SKIP.search(path) or (only is not None and path not in only):
            continue
        for n, line in enumerate(text.splitlines(), 1):
            if len(line) < 400 and not (code_only and COMMENT.match(line)) and rx.search(line):
                code = SECRET.sub("[redacted]", line.strip()) if redact else line.strip()
                out.append({"file": path, "line": n, "code": code[:160]})
                if len(out) >= limit:
                    return out
    return out


def find(files: dict[str, str], scan: dict) -> list[dict]:
    """Each risk: id, severity (high|medium|low), title, detail, evidence [{file, line, code}]."""
    R = []
    add = lambda i, sev, title, detail, ev=None: R.append(  # noqa: E731
        {"id": i, "severity": sev, "title": title, "detail": detail, "evidence": ev or []})
    if ev := _hits(files, SECRET, redact=True):
        add("hardcoded-keys", "high", "Cloud keys written in the code",
            "Anyone with the repository can use these keys. Revoke them and load keys from the environment.", ev)
    if scan.get("uses_s3"):
        s3 = set(scan.get("s3_files") or [])  # a fallback counts only where the storage code is, and not in comments
        if not _hits(files, FALLBACK, 1, only=s3, code_only=True):
            n = len(scan.get("s3_files") or [])
            add("single-provider", "high", "Single point of failure: one storage provider",
                f"All object storage goes to one provider ({n} file{'s' if n != 1 else ''}). RISE found no replication, "
                "fallback or second bucket in the code: if that provider or region is down, so is the app.")
        if ev := _hits(files, REGION_LIT):
            regions = sorted({m.group(1) for e in ev for m in [REGION_LIT.search(e["code"])] if m})
            add("hardcoded-region", "medium", f"Region fixed in the code ({', '.join(regions)})",
                "Moving to another provider or region needs a code change and a redeploy. Read the region from configuration.", ev)
        if ev := _hits(files, AWS_HOST):
            add("hardcoded-endpoint", "medium", "AWS addresses written in the code",
                "URLs that point at amazonaws.com break on any other provider. Use a configurable endpoint.", ev)
        for rx, name in SPECIFIC:
            if ev := _hits(files, rx, 2):
                add("specific-" + re.sub(r"\W+", "-", name.lower()).strip("-")[:30], "medium", f"Uses {name}",
                    "Not every S3-compatible provider offers this. Check the target supports it, or plan a replacement.", ev)
        if not _hits(files, RESILIENCE, 1, code_only=True):
            add("no-retries", "low", "No timeouts or retries configured",
                "The S3 client uses SDK defaults. A slow or failing provider can hang requests: set timeouts and retries.")
        if ev := _hits(files, PUBLIC, 2):
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
