"""Static discovery: real S3 call sites and other-cloud lock-in are found with file:line evidence."""
from rise import repo, scan

PY = """import boto3
s3 = boto3.client("s3", region_name="eu-west-1")
sqs = boto3.client("sqs")
# s3.delete_object(Bucket=b, Key=k)  <- comments are ignored
def save(b, k, data):
    s3.put_object(Bucket=b, Key=k, Body=data, ContentType="image/png", Metadata={"owner": "me"},
                  ServerSideEncryption="AES256", Tagging="team=a")
    return s3.generate_presigned_url("get_object", Params={"Bucket": b, "Key": k})
"""
TS = """import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
await client.send(new PutObjectCommand({ Bucket, Key, ACL: 'private' }));
"""


def test_scan_finds_operations_behaviours_and_lockin():
    r = scan.scan({"app/store.py": PY, "web/upload.ts": TS, "README.md": "s3.put_object"})
    assert r["operations"]["PutObject"] == 2 and "GeneratePresignedUrl" in r["operations"]
    assert "DeleteObject" not in r["operations"]  # commented out
    for f in ["content-type", "user-metadata", "server-side-encryption", "object-tagging", "acl"]:
        assert f in r["features"], f
    assert {l["service"] for l in r["lockin"]} == {"SQS queues", "DynamoDB"}
    ev = next(e for e in r["evidence"] if e["item"] == "server-side-encryption")
    assert ev["file"] == "app/store.py" and ev["line"] == 7
    assert all(e["line"] != 1 for e in r["evidence"] if e["file"] == "web/upload.ts")  # imports are not call sites
    prof = scan.profile(r)
    assert "image/png" in prof["content_types"] and "PutObject" in prof["items"]


def test_repo_url_validation():
    assert repo.parse("https://github.com/owner/name") == ("owner", "name", None)
    assert repo.parse("https://github.com/owner/name/tree/dev") == ("owner", "name", "dev")
    for bad in ["https://evil.com/a/b", "github.com/a", "https://github.com/a/b/../../x", "file:///etc/passwd"]:
        try:
            repo.parse(bad)
            raise AssertionError(bad)
        except repo.RepoError:
            pass
