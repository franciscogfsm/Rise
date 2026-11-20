"""Read a destination cloud's official documentation and check it against what the code uses.

Pages are fetched live (cached on disk; a stale copy is labelled cached). The AI may only cite: every quote
must appear verbatim in the fetched page, otherwise the behaviour is reported as "not in the docs".
Documentation is a claim, not proof: only real tests on a connection prove behaviour.
"""
import hashlib
import html
import json
import re
import time

import httpx

from . import ai, config as C

PROVIDERS = {
    "leaseweb": {"name": "Leaseweb Object Storage", "match": ("leaseweb", "object-storage.io"), "urls": [
        "https://developer.leaseweb.com/aws/",
        "https://kb.leaseweb.com/kb/object-storage/object-storage-getting-started-with-object-storage/",
        "https://kb.leaseweb.com/kb/object-storage/object-storage-overview/",
        "https://kb.leaseweb.com/kb/object-storage/object-storage-tech-demo/"]},
}
STORE = C.DATA / "docs"
STORE.mkdir(parents=True, exist_ok=True)
FRESH_S = 24 * 3600
REGION_ID = re.compile(r"\b([a-z]{2}-0\d)\b")


def detect(text: str) -> str | None:
    """The provider the user names, by keyword (deterministic; no AI needed)."""
    t = (text or "").lower()
    return next((k for k, p in PROVIDERS.items() if any(m in t for m in p["match"])), None)


def of_connection(c: dict) -> str | None:
    return detect(f"{c.get('name', '')} {c.get('endpoint', '')}")


def _text(raw: str) -> str:
    m = re.search(r"(?is)<(main|article)\b.*?</\1>", raw)  # the page body, without the site menus
    t = m.group(0) if m else raw
    t = re.sub(r"(?is)<(script|style|nav|header|footer|aside)\b.*?</\1>", " ", t)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip()


def fetch(key: str) -> dict:
    """{fetched_at, cached, pages: [{url, sha256, text}]} — live when possible, else the last saved copy."""
    f = STORE / f"{key}.json"
    old = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    if old and time.time() - old["ts"] < FRESH_S:
        return old | {"cached": False}
    pages = []
    for url in PROVIDERS[key]["urls"]:
        try:
            r = httpx.get(url, timeout=15, follow_redirects=True, headers={"User-Agent": "RISE-docs-check"})
            r.raise_for_status()
            pages.append({"url": url, "sha256": hashlib.sha256(r.content).hexdigest(), "text": _text(r.text)[:20000]})
        except httpx.HTTPError:
            continue
    if not pages:
        if old:
            return old | {"cached": True}
        raise RuntimeError(f"Could not reach {PROVIDERS[key]['name']} documentation")
    doc = {"ts": time.time(), "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "pages": pages}
    f.write_text(json.dumps(doc), encoding="utf-8")
    return doc | {"cached": False}


SCHEMA = {"type": "object", "additionalProperties": False, "required": ["findings"], "properties": {"findings": {
    "type": "array", "items": {"type": "object", "additionalProperties": False, "required": ["item", "status", "quote", "url"],
                               "properties": {"item": {"type": "string"}, "status": {"type": "string", "enum": ["documented", "limit", "not_found"]},
                                              "quote": {"type": "string"}, "url": {"type": "string"}}}}}}
SYSTEM = """You check a cloud provider's official documentation against what an application uses.
For EACH item (an S3 operation or feature the app's code uses) decide from the pages only:
documented = the docs say it is supported; limit = the docs state a restriction on it; not_found = the docs do not say.
quote: copy the exact sentence from the page, character for character (max 200 chars), or "" for not_found. url: the page it is on.
A generic "S3 compatible API" claim covers only basic upload/download/list/delete, not presigned URLs, multipart, metadata or other features. JSON only."""
WORDS = {"PutObject": ("upload", "push"), "GetObject": ("download", "retriev"), "ListObjectsV2": ("list",),
         "DeleteObject": ("delete", "remov"), "user-metadata": ("metadata",), "GeneratePresignedUrl": ("presign", "pre-sign", "signurl"),
         "PresignedGet": ("presign", "pre-sign", "signurl"), "MultipartUpload": ("multipart",), "content-type": ("content-type", "content type")}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _rules(items: list[str], pages: list[dict]) -> list[dict]:
    out = []
    for it in items:
        hit = next(((p, m) for w in WORDS.get(it, ()) for p in pages for m in [re.search(rf"[^.]*{re.escape(w)}[^.]*\.", p["text"], re.I)] if m), None)
        out.append({"item": it, "status": "documented" if hit else "not_found",
                    "quote": hit[1].group(0).strip()[:200] if hit else "", "url": hit[0]["url"] if hit else ""})
    return out


def check(key: str, items: list[str], code_region: str | None) -> dict:
    """Per-item findings, each quote verified against the fetched page, plus the documented regions vs the code's."""
    p = PROVIDERS[key]
    doc = fetch(key)
    pages = doc["pages"]
    regions = sorted({r for pg in pages for r in REGION_ID.findall(pg["text"])})
    try:
        raw, meta = ai._call(SYSTEM, {"provider": p["name"], "items": items,
                                      "pages": [{"url": pg["url"], "text": pg["text"][:12000]} for pg in pages]}, "rise_docs", SCHEMA)
        found, source = raw.get("findings") or [], {"mode": "live", "ms": meta["ms"], "at": meta["at"]}
    except Exception as e:  # noqa: BLE001 — keyword search over the same pages, labelled rules
        found, source = _rules(items, pages), {"mode": "rules", "live_error": f"{type(e).__name__}"}
    text = {pg["url"]: _norm(pg["text"]) for pg in pages}
    by = {}
    for f in found:
        if f.get("item") not in items or f["item"] in by:
            continue
        q = str(f.get("quote") or "").strip()
        ok = bool(q) and _norm(q) in text.get(f.get("url"), "")
        by[f["item"]] = {"item": f["item"], "status": f["status"] if ok else "not_found", "quote": q if ok else "", "url": f["url"] if ok else ""}
    findings = [by.get(i) or {"item": i, "status": "not_found", "quote": "", "url": ""} for i in items]
    return {"provider": key, "name": p["name"], "fetched_at": doc["fetched_at"], "cached": doc["cached"],
            "pages": [{"url": pg["url"], "sha256": pg["sha256"]} for pg in pages], "findings": findings, "source": source,
            "regions": regions, "code_region": code_region,
            "region_mismatch": bool(regions and code_region and code_region not in regions)}
