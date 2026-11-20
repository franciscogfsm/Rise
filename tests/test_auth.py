"""With RISE_PASSWORD set, every route needs it (HTTP basic auth); without it, RISE stays open on localhost."""
import base64

from fastapi.testclient import TestClient

from rise import server


def test_password_gate(monkeypatch):
    c = TestClient(server.app)  # no `with`: the lifespan (providers, link) is not needed here
    monkeypatch.setattr(server, "PASSWORD", "s3cret")
    auth = lambda p: {"Authorization": "Basic " + base64.b64encode(f"judge:{p}".encode()).decode()}  # noqa: E731
    assert c.get("/api/connections").status_code == 401
    assert c.get("/api/connections", headers=auth("wrong")).status_code == 401
    assert c.get("/api/connections", headers={"Authorization": "Basic %%%"}).status_code == 401
    assert c.get("/api/connections", headers=auth("s3cret")).status_code == 200
    assert c.get("/healthz").status_code == 200  # the only open route, for the host health check
    monkeypatch.setattr(server, "PASSWORD", "")
    assert c.get("/api/connections").status_code == 200
