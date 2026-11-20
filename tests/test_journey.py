"""End-to-end check of the RISE journey against two real S3 servers (moto) and the real network link.

moto does not enforce the signing region, so the region incompatibility itself is exercised
against Garage in the live setup; here the adaptation logic is covered by unit checks.
"""
import asyncio
import os
import socket
import tempfile
import threading


def _port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


P_SRC, P_DST, P_LINK = _port(), _port(), _port()
os.environ.update({
    "SOURCE_ENDPOINT": f"http://127.0.0.1:{P_SRC}", "DEST_ENDPOINT": f"http://127.0.0.1:{P_DST}",
    "DEST_REGION": "us-east-1", "SOURCE_LINK_PORT": str(P_LINK),
    # both moto servers share one in-process backend, so bucket names must differ
    "SOURCE_BUCKET": "rise-src", "SOURCE_TEST_BUCKET": "rise-src-test",
    "DEST_BUCKET": "rise-dst", "DEST_TEST_BUCKET": "rise-dst-test",
    "OPENROUTER_API_KEY": "", "RISE_DATA_DIR": tempfile.mkdtemp(),
})

import boto3  # noqa: E402
import pytest  # noqa: E402
from moto.server import ThreadedMotoServer  # noqa: E402

from rise import ai, config as C  # noqa: E402
from rise.journey import Journey, StepError  # noqa: E402
from rise.link import Link  # noqa: E402


@pytest.fixture(scope="module")
def journey():
    servers = [ThreadedMotoServer(ip_address="127.0.0.1", port=p) for p in (P_SRC, P_DST)]
    for s in servers:
        s.start()
    for p in (C.SOURCE, C.DEST):
        c = boto3.client("s3", endpoint_url=p.endpoint, region_name="us-east-1",
                         aws_access_key_id="testing", aws_secret_access_key="testing")
        for b in (p.bucket, p.test_bucket):
            c.create_bucket(Bucket=b)
    loop = asyncio.new_event_loop()
    threading.Thread(target=loop.run_forever, daemon=True).start()
    link = Link(C.LINK_PORT, C.SOURCE.endpoint)
    asyncio.run_coroutine_threadsafe(link.start(), loop).result()
    j = Journey(link)
    j.loop = loop
    j.boot()
    yield j
    for s in servers:
        s.stop()


def test_full_journey(journey):
    j = journey
    assert j.steps["connect"] == "done", j.health

    with pytest.raises(StepError):
        j.switch_to_destination()  # no evidence yet → refused

    j.discover()
    prof = j.profile()
    for item in ["PutObject", "GetObject", "HeadObject", "ListObjectsV2", "DeleteObject", "PresignedGet",
                 "range-read", "unicode-key", "user-metadata"]:
        assert item in prof["items"], item

    j.analyze()
    assert j.plan["source"]["mode"] == "rules"  # no key in tests → labelled fallback, never "live"
    kinds = {t["kind"] for t in j.plan["tests"]}
    assert {"put_get_roundtrip", "presigned_get", "range_get", "unicode_key"} <= kinds

    j.challenge()
    for pid in ("source", "destination"):
        bad = [r for r in j.results[pid] if r["status"] != "pass"]
        assert not bad, bad

    j.adapt()
    assert j.steps["adapt"] == "skipped"

    j.verify()
    assert j.migration["ok"] and len(j.migration["objects"]) >= 5

    j.switch_to_destination()
    assert j.router.active == "destination" and j.switch["probe"]["provider"] == "destination"

    j.cut_source()
    assert not j.cut["tcp_probe"]["reachable"] and not j.cut["app_probe"]["ok"]

    j.prove_new_operation()
    assert j.live["match"] and j.live["provider"] == "destination"
    assert not j.live["source_link_at_time"]["reachable"]

    served = j.serve_asset("slides/stat-89.svg", "test-rid")
    assert served["provider"] == "destination" and served["body"].startswith(b"<svg")

    proof = j.proof()
    assert len(proof["digest_sha256"]) == 64 and proof["new_operation_after_switch"]["match"]

    j.reset()
    assert j.router.active == "source" and j.link.up and j.steps["connect"] == "done"


def test_rules_adaptation_targets_region():
    failure = [{"test_id": "t1", "kind": "put_get_roundtrip", "status": "fail", "failed_checks": [],
                "error": {"code": "AuthorizationHeaderMalformed", "message": "unexpected region", "region": None}}]
    out = ai._rules_adapt(failure, {"region": "us-east-1", "addressing_style": "path"},
                          {"documented_region": "nl-ams-1"})
    assert (out["key"], out["value"]) == ("region", "nl-ams-1")


def test_validator_rejects_unknown_kinds_and_fills_gaps():
    profile = {"items": ["PutObject", "GetObject", "range-read"], "content_types": ["image/svg+xml"],
               "metadata_keys": ["owner"], "prefixes": ["slides/"], "max_size": 100}
    raw = {"summary": "s", "risks": [], "not_covered": [], "tests": [
        {"id": "t1", "kind": "put_get_roundtrip", "title": "rt", "rationale": "r", "params": {}},
        {"id": "t2", "kind": "rm_rf_everything", "title": "bad", "rationale": "r", "params": {}}]}
    out = ai._validate_plan(raw, profile)
    kinds = [t["kind"] for t in out["tests"]]
    assert "rm_rf_everything" not in kinds and "range_get" in kinds
    assert any("validator" in n for n in out["validator"]) and any("Rejected" in n for n in out["validator"])
