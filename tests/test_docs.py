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


def test_supabase_storage_maps_to_s3_operations():
    from rise import risks, scan
    js = """import { supabase } from './client'
const { data } = await supabase.storage
  .from('avatars')
  .upload(`u/${id}.png`, file, { contentType: 'image/png', cacheControl: '3600' })
await supabase.storage.from('avatars').download(path)
const { data: files } = await supabase.storage.from('avatars').list('u')
await supabase.storage.from('avatars').remove([path])
const { data: s } = await supabase.storage.from('avatars').createSignedUrl(path, 60)
const url = supabase.storage.from('avatars').getPublicUrl(path)
items.remove(x)
"""
    r = scan.scan({"src/a.js": js})
    assert r["sdk"] == ["Supabase Storage"] and r["uses_s3"]
    assert set(r["operations"]) == {"PutObject", "GetObject", "ListObjectsV2", "DeleteObject", "GeneratePresignedUrl"}
    assert r["operations"]["DeleteObject"] == 1  # items.remove() is not storage
    assert {"content-type", "cache-control", "bucket-policy"} <= set(r["features"])
    assert any(x["id"] == "storage-sdk" for x in risks.find({"src/a.js": js}, r))
    assert scan.scan({"a.py": "s3 = boto3.client('s3')\ns3.put_object(Bucket='b', Key='k')"})["sdk"] == []
