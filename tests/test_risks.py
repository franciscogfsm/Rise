"""Architecture risks come from the code with file:line, keys found in code are never echoed, and tokens are checked."""
import pytest

from rise import ai, repo, risks, scan

APP = {
    "src/store.py": "import boto3\n"
                    "s3 = boto3.client('s3', region_name='us-east-1')\n"
                    "KEY = 'AKIAABCDEFGHIJKLMNOP'\n"
                    "s3.put_object(Bucket='b', Key='k', Body=b'x', ACL='public-read', StorageClass='GLACIER')\n"
                    "url = 'https://my-bucket.s3.amazonaws.com/x'\n"
                    "q = boto3.client('sqs')\n",
    "tests/test_store.py": "KEY = 'AKIAZZZZZZZZZZZZZZZZ'\n",  # test fixtures are not the app
}


def test_risks_from_code():
    found = risks.find(APP, scan.scan(APP))
    by = {r["id"]: r for r in found}
    assert {"hardcoded-keys", "single-provider", "hardcoded-region", "hardcoded-endpoint", "no-retries", "public-acl",
            "other-services"} <= set(by)
    assert found[0]["severity"] == "high"  # most severe first
    assert by["hardcoded-region"]["evidence"][0] == {"file": "src/store.py", "line": 2,
                                                     "code": "s3 = boto3.client('s3', region_name='us-east-1')"}
    keys = by["hardcoded-keys"]["evidence"]
    assert [e["file"] for e in keys] == ["src/store.py"] and "AKIA" not in keys[0]["code"]  # redacted, tests skipped


def test_resilient_replicated_code_has_no_spof():
    files = {"app.py": "import boto3\ns3 = boto3.client('s3', config=Config(retries={'max_attempts': 3}))\n"
                       "s3.put_object(Bucket=PRIMARY, Key=k, Body=b)\ns3.put_object(Bucket=BACKUP_BUCKET, Key=k, Body=b)\n"}
    ids = {r["id"] for r in risks.find(files, scan.scan(files))}
    assert "single-provider" not in ids and "no-retries" not in ids


def test_briefing_falls_back_to_rules_without_ai():
    found = risks.find(APP, scan.scan(APP))
    b = ai.brief("Leave AWS", scan.scan(APP), found, [])
    assert b["source"]["mode"] == "rules" and b["headline"] == found[0]["title"] and b["actions"]


@pytest.mark.parametrize("tok, ok", [("ghp_" + "a" * 36, True), ("github_pat_" + "B1" * 20, True), ("", True),
                                     ("not a token", False), ("ghp_short", False)])
def test_token_check(tok, ok):
    if ok:
        repo.check_token(tok)
    else:
        with pytest.raises(repo.RepoError):
            repo.check_token(tok)


def test_fallback_in_a_ci_comment_is_not_a_fallback():
    files = {**APP, ".circleci/config.yml": "# fallback to using the latest cache\n", "src/x.py": "# failover later\n"}
    assert "single-provider" in {r["id"] for r in risks.find(files, scan.scan(files))}
