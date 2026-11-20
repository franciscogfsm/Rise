from rise import agent, ai, connect, docs

PAGE = {"url": "https://developer.leaseweb.com/aws/", "sha256": "x",
        "text": "Leaseweb Object Storage comes with a S3 Compatible API. Regions: nl-01 and de-01 are available."}


def test_docs_quotes_must_be_verbatim(monkeypatch):
    monkeypatch.setattr(docs, "fetch", lambda k: {"fetched_at": "t", "cached": False, "pages": [PAGE]})
    monkeypatch.setattr(ai, "_call", lambda *a: ({"findings": [
        {"item": "PutObject", "status": "documented", "quote": "comes with a S3 Compatible API.", "url": PAGE["url"]},
        {"item": "GeneratePresignedUrl", "status": "documented", "quote": "Presigned URLs are fully supported.", "url": PAGE["url"]},
    ]}, {"ms": 1, "at": "t"}))
    d = docs.check("leaseweb", ["PutObject", "GeneratePresignedUrl", "MultipartUpload"], "us-east-1")
    st = {f["item"]: f["status"] for f in d["findings"]}
    assert st == {"PutObject": "documented", "GeneratePresignedUrl": "not_found", "MultipartUpload": "not_found"}
    assert d["regions"] == ["de-01", "nl-01"] and d["region_mismatch"]


def test_named_cloud_not_connected_is_never_substituted(monkeypatch):
    monkeypatch.setattr(ai, "_call", lambda *a: (_ for _ in ()).throw(AssertionError("no AI needed")))
    monkeypatch.setattr(connect, "overview", lambda: [{"id": "destination", "name": "Garage S3 · local", "endpoint": "http://127.0.0.1:3900",
                                                       "region": "nl-ams-1", "simulated": True, "role": "target"}])
    out = agent.intent("github.com/acme/shop move to leaseweb")
    assert out["missing"]["key"] == "leaseweb" and out["targets"] == []
