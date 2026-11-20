"""The multi-core scan must give exactly the single-core result."""
import json

from rise import fast

PY = 'import boto3\ns3 = boto3.client("s3", region_name="eu-west-1", endpoint_url="https://s3.eu-west-1.amazonaws.com")\n' \
     's3.put_object(Bucket="b", Key="k", Body=b"x", Metadata={"owner": "a"}, ContentType="text/plain")\n' \
     'sqs = boto3.client("sqs")\nurl = s3.generate_presigned_url("get_object", Params={"Bucket": "b", "Key": "k"})\n'


def test_parallel_equals_serial():
    files = {f"app/m{i:03}.py": PY if i % 7 == 0 else "x = 1\n" * 50 for i in range(120)}
    s1, r1, st1 = fast.analyze(files, parallel=False)
    s2, r2, st2 = fast.analyze(files, parallel=True)
    d = lambda x: json.dumps(x, sort_keys=True)  # noqa: E731
    assert d(s1) == d(s2) and d(r1) == d(r2)
    assert s1["operations"]["PutObject"] == 18 and len([e for e in s1["evidence"] if e["item"] == "PutObject"]) == 6
    assert st2["cores"] == fast.WORKERS and st1["lines"] == st2["lines"]
