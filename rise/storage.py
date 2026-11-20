"""S3 client factory with SDK instrumentation (used for DISCOVER) and evidence helpers."""
import hashlib

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def request_id(resp) -> str | None:
    md = (resp or {}).get("ResponseMetadata", {})
    headers = md.get("HTTPHeaders", {})
    return md.get("RequestId") or headers.get("x-amz-request-id") or headers.get("x-amz-id-2")


def err_info(e: Exception) -> dict:
    if isinstance(e, ClientError):
        r = e.response
        md = r.get("ResponseMetadata", {})
        er = r.get("Error", {})
        return {"kind": "http", "code": er.get("Code"), "message": (er.get("Message") or "")[:300],
                "status": md.get("HTTPStatusCode"), "request_id": md.get("RequestId"), "region": er.get("Region")}
    return {"kind": "network", "code": type(e).__name__, "message": str(e)[:300], "status": None,
            "request_id": None, "region": None}


def features(op: str, p: dict) -> list[str]:
    """Behaviours the application relies on, derived from the real call parameters."""
    f = []
    if p.get("Metadata"):
        f.append("user-metadata")
    if p.get("ContentType"):
        f.append("content-type")
    if p.get("Range"):
        f.append("range-read")
    if op == "ListObjectsV2" and p.get("Prefix"):
        f.append("prefix-list")
    key = p.get("Key") or ""
    if key and not key.isascii():
        f.append("unicode-key")
    if "/" in key:
        f.append("hierarchical-keys")
    return f


def make_client(endpoint, region, access_key, secret_key, addressing_style="path", observer=None):
    """observer(op, params, http_status, request_id, error_code) is called for every SDK call."""
    c = boto3.session.Session().client(
        "s3", endpoint_url=endpoint or None, region_name=region,
        aws_access_key_id=access_key, aws_secret_access_key=secret_key,
        config=Config(
            signature_version="s3v4", s3={"addressing_style": addressing_style},
            retries={"max_attempts": 1, "mode": "standard"}, connect_timeout=2, read_timeout=10,
            # newer SDK default checksums are not implemented by every S3-compatible server
            request_checksum_calculation="when_required", response_checksum_validation="when_required",
        ),
    )
    if observer:
        def keep(params, context, **_):
            body = params.get("Body")
            context["rise_params"] = {k: v for k, v in params.items() if k != "Body"} | (
                {"BodyLength": len(body)} if isinstance(body, (bytes, bytearray)) else {})

        def after(http_response, parsed, model, context, **_):
            observer(model.name, context.get("rise_params", {}), http_response.status_code,
                     request_id(parsed), (parsed.get("Error") or {}).get("Code"))

        def after_error(exception, context, event_name, **_):
            observer(event_name.rsplit(".", 1)[-1], context.get("rise_params", {}), None, None,
                     type(exception).__name__)

        c.meta.events.register("provide-client-params.s3", keep)
        c.meta.events.register("after-call.s3", after)
        c.meta.events.register("after-call-error.s3", after_error)
    return c
