"""User-added connections: validated, stored server-side, and their keys never come back out."""
import json

import pytest
from cryptography.fernet import Fernet

from rise import connect

GOOD = {"name": "EU storage", "endpoint": "https://s3.example.com/", "region": "nl-ams-1", "bucket": "my-assets",
        "access_key": "AKEXAMPLE", "secret_key": "s3cr3t-value"}


def test_add_list_remove(tmp_path, monkeypatch):
    monkeypatch.setattr(connect, "STORE", tmp_path / "connections.json")
    monkeypatch.setenv("RISE_MASTER_KEY", Fernet.generate_key().decode())
    c = connect.add(GOOD)
    assert c["endpoint"] == "https://s3.example.com" and c["test_bucket"] == "my-assets"
    assert "s3cr3t-value" not in json.dumps(connect.overview())  # keys never leave the server
    assert "s3cr3t-value" not in connect.STORE.read_text() and "AKEXAMPLE" not in connect.STORE.read_text()  # encrypted
    assert connect.provider(c["id"]).secret_key == "s3cr3t-value"
    monkeypatch.setenv("RISE_MASTER_KEY", Fernet.generate_key().decode())
    with pytest.raises(connect.ConnError):
        connect.provider(c["id"])  # a different master key cannot read them
    assert connect.remove(c["id"]) and connect.provider(c["id"]) is None
    with pytest.raises(connect.ConnError):
        connect.remove("source")  # built-ins live in .env


@pytest.mark.parametrize("bad", [{"region": "NL AMS"}, {"bucket": "Bad_Bucket"}, {"endpoint": "ftp://x"},
                                 {"endpoint": "https://x/?a=1"}, {"secret_key": ""}, {"name": ""}])
def test_add_rejects_bad_input(tmp_path, monkeypatch, bad):
    monkeypatch.setattr(connect, "STORE", tmp_path / "connections.json")
    with pytest.raises(connect.ConnError):
        connect.add(GOOD | bad)
