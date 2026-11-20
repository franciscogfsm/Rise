"""What a user sees with real providers: the answer at the top of an analysis, and the hint when a connection fails."""
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet

from rise import connect
from rise.analysis import decide

SCORE = {"verified": 4, "total": 4}
ALL_PASS = {"PutObject": "pass", "GetObject": "pass"}
FIX = {"applied": True, "proposal": {"key": "region", "value": "nl-ams-1"}, "before": {"region": "us-east-1"},
       "retest": {"passed": 4, "total": 4}}


@pytest.mark.parametrize("score, verdict, adaptation, kind", [
    (SCORE, ALL_PASS, None, "ready"),
    (SCORE, ALL_PASS, FIX, "ready_with_change"),
    (SCORE, {**ALL_PASS, "acl": "fail"}, None, "not_ready"),
    (SCORE, {**ALL_PASS, "acl": "unsupported"}, FIX, "not_ready"),
    (SCORE, ALL_PASS, {**FIX, "retest": {"passed": 3, "total": 4}}, "not_ready"),  # the fix did not fix everything
    (SCORE, {**ALL_PASS, "versioning": "untested"}, None, "partial"),
    ({"verified": 0, "total": 0}, {}, None, "no_storage"),
])
def test_decision(score, verdict, adaptation, kind):
    d = decide(score, verdict, adaptation)
    assert d["kind"] == kind
    if adaptation:
        assert d["change"] == {"key": "region", "from": "us-east-1", "to": "nl-ams-1"}


P = SimpleNamespace(id="c-1", endpoint="https://nl.object-storage.io", region="nl-01", bucket="rise-test")


@pytest.mark.parametrize("err, says", [
    ({"kind": "http", "code": "301", "region": "eu-central-1"}, "Set the region to 'eu-central-1'"),  # AWS: bucket elsewhere
    ({"kind": "http", "code": "PermanentRedirect", "region": None}, "another region"),
    ({"kind": "http", "code": "SignatureDoesNotMatch"}, "keys were rejected"),
    ({"kind": "http", "code": "AccessDenied"}, "may not use bucket 'rise-test'"),
    ({"kind": "http", "code": "NoSuchBucket"}, "does not exist"),
    ({"kind": "network", "code": "SSLError", "message": ""}, "TLS"),
    ({"kind": "network", "code": "ConnectTimeoutError", "message": ""}, "in time"),
])
def test_hints(err, says):
    assert says in connect._hint(err, P)


def test_endpoint_without_scheme(tmp_path, monkeypatch):
    monkeypatch.setattr(connect, "STORE", tmp_path / "connections.json")
    monkeypatch.setenv("RISE_MASTER_KEY", Fernet.generate_key().decode())
    c = connect.add({"name": "Leaseweb", "endpoint": "nl.object-storage.io", "region": "nl-01", "bucket": "rise-test",
                     "access_key": "a", "secret_key": "b"})
    assert c["endpoint"] == "https://nl.object-storage.io"
