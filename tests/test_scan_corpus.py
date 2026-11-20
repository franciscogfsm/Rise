"""Scanner accuracy corpus: one realistic snippet per SDK call style, with the exact S3 operations a human reads in it.
Every case must match exactly (no missed operation, no invented one). Run alone: python -m pytest tests/test_scan_corpus.py -q"""
import pytest

from rise import scan

P, G, H, L, D, U, C, M = ("PutObject", "GetObject", "HeadObject", "ListObjectsV2", "DeleteObject", "GeneratePresignedUrl",
                          "CopyObject", "MultipartUpload")

CASES = [
    ("python · boto3 client", "app/store.py", """import boto3
s3 = boto3.client("s3")
s3.put_object(Bucket=B, Key=k, Body=data)
body = s3.get_object(Bucket=B, Key=k)["Body"].read()
s3.head_object(Bucket=B, Key=k)
s3.delete_object(Bucket=B, Key=k)
s3.copy_object(Bucket=B, Key=k2, CopySource={"Bucket": B, "Key": k})
url = s3.generate_presigned_url("get_object", Params={"Bucket": B, "Key": k})
""", {P, G, H, D, C, U}),
    ("python · boto3 paginator + transfer", "jobs/sync.py", """import boto3
from boto3.s3.transfer import TransferConfig
client = boto3.client("s3")
for page in client.get_paginator("list_objects_v2").paginate(Bucket=B):
    pass
client.upload_file("a.bin", B, "a.bin", Config=TransferConfig(multipart_threshold=8 * 1024 * 1024))
client.download_fileobj(B, "a.bin", f)
""", {L, P, G, M}),
    ("python · boto3 resource API", "app/files.py", """import boto3
s3 = boto3.resource("s3")
bucket = s3.Bucket(NAME)
s3.Object(NAME, key).put(Body=data, ContentType="text/plain")
text = s3.Object(NAME, key).get()["Body"].read()
for obj in bucket.objects.filter(Prefix="logs/"):
    print(obj.key)
s3.Object(NAME, old).delete()
""", {P, G, L, D}),
    ("python · async aioboto3", "svc/async_store.py", """import aioboto3
session = aioboto3.Session()
async with session.client("s3") as s3:
    await s3.put_object(Bucket=B, Key=k, Body=b)
    resp = await s3.list_objects_v2(Bucket=B, Prefix=p)
""", {P, L}),
    ("python · MinIO SDK", "storage/minio_store.py", """from minio import Minio
client = Minio("play.min.io", access_key=a, secret_key=s)
client.fput_object(B, "x.zip", "/tmp/x.zip")
client.fget_object(B, "x.zip", "/tmp/y.zip")
client.stat_object(B, "x.zip")
for o in client.list_objects(B, prefix="x"):
    client.remove_object(B, o.object_name)
url = client.presigned_get_object(B, "x.zip")
""", {P, G, H, L, D, U}),
    ("python · pandas / s3fs", "etl/report.py", """import pandas as pd
import s3fs
df = pd.read_parquet("s3://lake/raw/day.parquet")
df.to_csv("s3://lake/out/day.csv", index=False)
""", {G, P}),
    ("javascript · AWS SDK v2", "src/legacy.js", """const AWS = require('aws-sdk');
const s3 = new AWS.S3();
await s3.putObject({ Bucket, Key, Body }).promise();
const o = await s3.getObject({ Bucket, Key }).promise();
await s3.listObjectsV2({ Bucket, Prefix }).promise();
await s3.deleteObject({ Bucket, Key }).promise();
const url = s3.getSignedUrl('getObject', { Bucket, Key, Expires: 60 });
await s3.upload({ Bucket, Key, Body: stream }).promise();
""", {P, G, L, D, U}),
    ("typescript · AWS SDK v3", "src/s3.ts", """import { S3Client, PutObjectCommand, GetObjectCommand, paginateListObjectsV2, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
await client.send(new PutObjectCommand({ Bucket, Key, Body }));
await client.send(new HeadObjectCommand({ Bucket, Key }));
for await (const page of paginateListObjectsV2({ client }, { Bucket })) {}
const url = await getSignedUrl(client, new GetObjectCommand({ Bucket, Key }), { expiresIn: 300 });
await new Upload({ client, params: { Bucket, Key, Body } }).done();
""", {P, H, L, G, U}),
    ("javascript · MinIO SDK", "lib/minio.js", """const Minio = require('minio');
const mc = new Minio.Client({ endPoint: 'minio', port: 9000 });
await mc.fPutObject('b', 'k', '/tmp/f');
const stream = await mc.getObject('b', 'k');
await mc.statObject('b', 'k');
await mc.removeObject('b', 'k');
const url = await mc.presignedGetObject('b', 'k', 3600);
""", {P, G, H, D, U}),
    ("go · aws-sdk-go-v2", "internal/blob/s3.go", """package blob
import "github.com/aws/aws-sdk-go-v2/service/s3"
func (s *Store) Save(ctx context.Context) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(k), Body: r})
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: &s.bucket, Key: &k})
	p := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{Bucket: &s.bucket})
	req, err := s3.NewPresignClient(s.client).PresignGetObject(ctx, &s3.GetObjectInput{Bucket: &s.bucket, Key: &k})
	return err
}
""", {P, G, L, U}),
    ("go · MinIO SDK", "pkg/store/minio.go", """package store
import "github.com/minio/minio-go/v7"
func put(c *minio.Client) {
	c.PutObject(ctx, "b", "k", r, size, minio.PutObjectOptions{ContentType: "application/json"})
	c.FGetObject(ctx, "b", "k", "/tmp/k", minio.GetObjectOptions{})
	c.RemoveObject(ctx, "b", "k", minio.RemoveObjectOptions{})
	for o := range c.ListObjects(ctx, "b", minio.ListObjectsOptions{Prefix: "x"}) {}
}
""", {P, G, D, L}),
    ("java · AWS SDK v1", "src/main/java/app/Files.java", """import com.amazonaws.services.s3.AmazonS3;
public class Files {
  private final AmazonS3 s3;
  void save() { s3.putObject(bucket, key, file); }
  S3Object load() { return s3.getObject(bucket, key); }
  URL link() { return s3.generatePresignedUrl(bucket, key, expiry); }
  void big() { s3.initiateMultipartUpload(new InitiateMultipartUploadRequest(bucket, key)); }
  ObjectMetadata meta() { return s3.getObjectMetadata(bucket, key); }
}
""", {P, G, U, M, H}),
    ("java · AWS SDK v2", "src/main/java/app/Store.java", """import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
class Store {
  void put() { s3.putObject(PutObjectRequest.builder().bucket(b).key(k).build(), RequestBody.fromBytes(d)); }
  void list() { s3.listObjectsV2(ListObjectsV2Request.builder().bucket(b).build()); }
  void del() { s3.deleteObject(DeleteObjectRequest.builder().bucket(b).key(k).build()); }
  URL url() { return presigner.presignGetObject(r).url(); }
}
""", {P, L, D, U}),
    ("kotlin · AWS SDK v2", "src/main/kotlin/Blob.kt", """import software.amazon.awssdk.services.s3.S3Client
class Blob(private val s3: S3Client) {
    fun read(k: String) = s3.getObjectAsBytes(GetObjectRequest.builder().bucket(b).key(k).build())
    fun copy() = s3.copyObject(CopyObjectRequest.builder().build())
}
""", {G, C}),
    ("php · AWS SDK", "src/Storage.php", """<?php
use Aws\\S3\\S3Client;
$s3 = new S3Client(['region' => 'eu-west-1', 'version' => 'latest']);
$s3->putObject(['Bucket' => $b, 'Key' => $k, 'Body' => $data]);
$r = $s3->getObject(['Bucket' => $b, 'Key' => $k]);
$s3->copyObject(['Bucket' => $b, 'Key' => $k2, 'CopySource' => "$b/$k"]);
$req = $s3->createPresignedRequest($cmd, '+20 minutes');
""", {P, G, C, U}),
    ("php · Laravel Storage", "app/Http/Controllers/AvatarController.php", """<?php
use Illuminate\\Support\\Facades\\Storage;
Storage::disk('s3')->put('avatars/1.png', $contents);
$url = Storage::disk('s3')->temporaryUrl('avatars/1.png', now()->addMinutes(5));
Storage::disk('s3')->delete('avatars/1.png');
""", {P, U, D}),
    ("ruby · aws-sdk-s3", "app/services/uploader.rb", """require 'aws-sdk-s3'
s3 = Aws::S3::Client.new(region: 'eu-west-1')
s3.put_object(bucket: B, key: k, body: io)
obj = Aws::S3::Resource.new.bucket(B).object(k)
obj.upload_file('/tmp/x')
url = obj.presigned_url(:get, expires_in: 300)
""", {P, U}),
    ("c# · AWS SDK for .NET", "Services/BlobService.cs", """using Amazon.S3;
public class BlobService {
  private readonly IAmazonS3 _s3;
  public async Task Save() => await _s3.PutObjectAsync(new PutObjectRequest { BucketName = b, Key = k });
  public async Task<GetObjectResponse> Load() => await _s3.GetObjectAsync(b, k);
  public async Task List() => await _s3.ListObjectsV2Async(new ListObjectsV2Request { BucketName = b });
  public string Url() => _s3.GetPreSignedURL(new GetPreSignedUrlRequest { BucketName = b, Key = k });
}
""", {P, G, L, U}),
    ("rust · aws-sdk-s3", "src/storage.rs", """use aws_sdk_s3::Client;
async fn save(c: &Client) -> Result<()> {
    c.put_object().bucket(B).key(k).body(body).send().await?;
    let o = c.get_object().bucket(B).key(k).send().await?;
    c.delete_object().bucket(B).key(k).send().await?;
    Ok(())
}
""", {P, G, D}),
]

# Code that looks close but uses no object storage: the scanner must find no S3 operation at all.
NEGATIVES = [
    ("django view (get_object is a Django method)", "shop/views.py", """import boto3
from django.views.generic import DetailView
dynamo = boto3.client("dynamodb")
class ProductView(DetailView):
    def get(self, request, *a, **kw):
        product = self.get_object()
        dynamo.put_item(TableName="t", Item={})
"""),
    ("redis cache with put/get", "cache.py", """import redis
r = redis.Redis()
r.set("k", "v")
cache.put_object("k", obj)
cache.get_object("k")
"""),
    ("dynamodb only", "db.ts", """import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
await ddb.send(new PutItemCommand({ TableName: 't', Item: {} }));
"""),
    ("commented-out S3 code", "old.py", """import boto3
# s3.put_object(Bucket=b, Key=k, Body=d)
# s3.delete_object(Bucket=b, Key=k)
"""),
]


@pytest.mark.parametrize("label,path,code,expected", CASES, ids=[c[0] for c in CASES])
def test_finds_exactly_the_operations(label, path, code, expected):
    assert set(scan.scan({path: code})["operations"]) == expected


@pytest.mark.parametrize("label,path,code", NEGATIVES, ids=[n[0] for n in NEGATIVES])
def test_no_false_operations(label, path, code):
    assert scan.scan({path: code})["operations"] == {}


CONFIG = [
    ("python", "s3 = boto3.client('s3', region_name='eu-west-1', endpoint_url=URL, config=Config(s3={'addressing_style': 'path'}))"),
    ("go v2", "cfg, _ := config.LoadDefaultConfig(ctx, config.WithRegion(\"eu-west-1\")); o.BaseEndpoint = &url; o.UsePathStyle = true"),
    ("java v2", "S3Client.builder().region(Region.EU_WEST_1).endpointOverride(uri).forcePathStyle(true).build()"),
    (".net", "var c = new AmazonS3Client(new AmazonS3Config { RegionEndpoint = RegionEndpoint.EUWest1, ServiceURL = url, ForcePathStyle = true });"),
    ("php", "$s3 = new S3Client(['region' => 'eu-west-1', 'endpoint' => $url, 'use_path_style_endpoint' => true]);"),
    ("rust", "let conf = aws_sdk_s3::config::Builder::from(&shared).endpoint_url(url).force_path_style(true).build(); // region set via Region::new"),
]


@pytest.mark.parametrize("label,line", CONFIG, ids=[c[0] for c in CONFIG])
def test_finds_client_settings(label, line):
    cfg = scan.scan({"x.txt": "import boto3 S3Client aws_sdk_s3\n" + line + "\ns3.put_object(Bucket=b)\n"})["config"]
    assert "custom-endpoint" in cfg and "addressing-style" in cfg, cfg


def test_unknown_storage_calls_are_never_dropped():
    r = scan.scan({"a/archive.py": """import boto3
s3 = boto3.client("s3")
s3.put_object(Bucket=B, Key=k, Body=b)
s3.restore_object(Bucket=B, Key=k, RestoreRequest={"Days": 1})
s3.put_object_retention(Bucket=B, Key=k, Retention={})
bucket = s3.Bucket(B)
""", "b/Lock.java": "import software.amazon.awssdk.services.s3.S3Client;\nclass L { void f() { s3.putObjectLegalHold(r); } }\n"})
    assert set(r["unrecognised"]) == {"restore_object", "put_object_retention", "putObjectLegalHold"}
    ev = [e for e in r["evidence"] if e["category"] == "unrecognised"]
    assert {(e["file"], e["line"]) for e in ev} == {("a/archive.py", 4), ("a/archive.py", 5), ("b/Lock.java", 2)}


@pytest.mark.parametrize("label,path,code,expected", CASES, ids=[c[0] for c in CASES])
def test_known_sdks_leave_nothing_unrecognised(label, path, code, expected):
    assert scan.scan({path: code})["unrecognised"] == {}


def test_only_unknown_calls_is_not_no_storage():
    from rise import risks
    r = scan.scan({"x.py": "import boto3\ns3 = boto3.client('s3')\ns3.select_object_content(Bucket=b, Key=k)\n"})
    assert not r["uses_s3"] and r["unrecognised"] == {"select_object_content": 1}
    assert "untested-calls" in {x["id"] for x in risks.find({"x.py": ""}, r)}


def test_calls_found_missing_on_real_repos():
    """flysystem-aws-s3-v3, minio-js and spring-cloud-aws spellings the first version of the scanner missed."""
    r = scan.scan({"S.php": "<?php use Aws\S3\S3Client;\n$this->client->doesObjectExistV2($b, $k);\n$this->client->deleteMatchingObjects($b, $p);\n",
                   "m.js": "const Minio = require('minio');\nawait mc.getPartialObject('b', 'k', 10, 30);\n",
                   "L.java": "import software.amazon.awssdk.services.s3.S3Client;\nvar it = s3.listObjectsV2Paginator(req);\n"})
    assert set(r["operations"]) == {H, D, G, L} and r["unrecognised"] == {}


def test_builder_setters_and_errors_are_not_storage_calls():
    r = scan.scan({"B.java": """import software.amazon.awssdk.services.s3.S3Client;
var req = PutObjectRequest.builder().bucket(b).key(k).expectedBucketOwner(o).bucketKeyEnabled(true).objectLockMode(m).build();
throw new errors.InvalidBucketNameError(name);
var x = props.getBucket();
"""})
    assert r["unrecognised"] == {}


def test_client_made_in_another_file_is_still_read():
    """The S3 client is built in one file and used in another that never imports the SDK."""
    files = {"app/clients.py": "import boto3\ns3 = boto3.client('s3')\n",
             "app/reports.py": "from app.clients import s3\ndef save(k, b):\n    s3.put_object(Bucket=B, Key=k, Body=b)\n",
             "app/db.java": "class Db { Object v(ResultSet rs) { return rs.getObject(1); } }\n"}
    r = scan.scan(files)
    assert "app/reports.py" in r["s3_files"] and "app/db.java" not in r["s3_files"]
    assert r["operations"] == {P: 1}


def test_no_s3_in_repo_means_no_wrapper_guessing():
    r = scan.scan({"Form.Designer.cs": "this.Icon = ((System.Drawing.Icon)(resources.GetObject(\"$this.Icon\")));\n",
                   "q.java": "sql.append(rs.getObject(columnIndex));\n"})
    assert r["s3_files"] == [] and r["operations"] == {}


def test_wrapper_classes_and_go_tagging():
    """Calls through self/this (S3 wrapper classes) count; Go's PutObjectTagging is the tested tagging behaviour."""
    r = scan.scan({"w.py": "import boto3\nclass Fake:\n    def put(self, **kw):\n        return self.put_object(**kw)\n",
                   "S3.php": "<?php use Aws\S3\S3Client;\nreturn self::putObject($s, $bucket, $uri);\n",
                   "t.go": "import \"github.com/minio/minio-go/v7\"\nerr := c.PutObjectTagging(ctx, \"b\", \"o\", tags, opts)\n"})
    assert r["operations"] == {P: 2} and "object-tagging" in r["features"] and r["unrecognised"] == {}


def test_storage_named_receivers_in_a_repo_that_uses_s3():
    files = {"s3.ts": "import { S3Client } from '@aws-sdk/client-s3';\n",
             "ocr.ts": "const stream = await options.storage.getObject(key)\n",
             "Export.java": "sql.append(rs.getObject(columnIndex));\n",
             "k8s_test.go": "review, ok := createAction.GetObject().(*v1.Review)\n"}
    assert scan.scan(files)["s3_files"] == ["ocr.ts", "s3.ts"]


def test_client_returned_by_a_call():
    """wp-amazon-s3-and-cloudfront: the S3 client comes back from a method call."""
    files = {"aws.php": "<?php use Aws\S3\S3Client;\n",
             "upgrade.php": "<?php\n$this->as3cf->get_provider_client( $provider_object['region'], true )->get_object( $args );\n"}
    r = scan.scan(files)
    assert "upgrade.php" in r["s3_files"] and r["operations"] == {G: 1}


def test_call_names_inside_strings_are_not_calls():
    """amazon-s3-php-class: error messages quote the method name. Only the real call counts; quoted options still count."""
    files = {"S3.php": "<?php use Aws\S3\S3Client;\n"
                       "$r = $s3->putObject(['ACL' => 'public-read']);\n"
                       "trigger_error(sprintf(\"S3::putObject(): [%s] %s\", $code, $msg));\n"
                       "echo 'S3::deleteObject(): failed\n';\n"
                       "$s3->deleteObject($args); // done\n"}
    r = scan.scan(files)
    assert r["operations"] == {"PutObject": 1, "DeleteObject": 1}
    assert r["features"].get("acl") == 1
    assert scan.in_string('x = "a.b(" + s3.get_object(', 18) is False
    assert scan.in_string('log("it\\"s s3.get_object(")', 14) is True


def test_javascript_requires_command_construction_or_paginator_call():
    code = """const {
    PutObjectCommand,
    paginateListObjectsV2
} = require('@aws-sdk/client-s3');
mock.on(PutObjectCommand).resolves({});
s3.send(new PutObjectCommand({Bucket, Key, Body}));
for await (const page of paginateListObjectsV2({client: s3}, {Bucket})) {}
for await (const page of paginateListBuckets({client: s3}, {})) {}
"""
    result = scan.scan({"routes.js": code})
    assert result["operations"] == {"PutObject": 1, "ListObjectsV2": 1}
    assert result["unrecognised"] == {"list_buckets": 1}


def test_boto_bucket_resources_and_version_paginator_have_call_evidence():
    code = """import boto3
s3 = boto3.resource('s3')
bucket = s3.Bucket(name)
bucket.copy(source, key)
bucket.objects.delete()
bucket.object_versions.all()
bucket.delete()
client = boto3.client('s3')
pager = client.get_paginator('list_object_versions')
for page in pager.paginate(Bucket=name):
    print(page)
client.list_object_versions(Bucket=name)
"""
    result = scan.scan({"storage.py": code})
    assert result["operations"] == {"CopyObject": 1, "DeleteObject": 1}
    assert result["unrecognised"] == {"delete_bucket": 1, "list_object_versions": 3}
    assert {e["line"] for e in result["evidence"] if e["category"] == "unrecognised"} == {6, 7, 10, 12}


def test_browser_storage_requests_expose_untested_presigned_post():
    code = """const url = "https://s3.us-east-1.amazonaws.com/my-bucket/link.json";
const config = await fetch(url).then(response => response.json());
const form = new FormData();
for (const [key, value] of Object.entries(config.fields)) form.append(key, value);
const request = new XMLHttpRequest();
request.open("POST", config.url, true);
request.send(form);
await fetch(url, { method: "DELETE" });
"""
    result = scan.scan({"upload.js": code, "other.js": code.replace("s3.us-east-1.amazonaws.com", "example.com")})
    assert result["s3_files"] == ["upload.js"]
    assert result["operations"] == {"GetObject": 1}
    assert result["unrecognised"] == {"browser_presigned_post": 1}
    assert {e["line"] for e in result["evidence"]} == {2, 7}


def test_sdk_bindings_reveal_real_calls_not_paginator_setup():
    files = {
        "cloud.js": """const knox = require('knox');
const bucket = knox.createClient(options);
bucket.list(callback);
bucket.signedUrl(key, expiry);
other.list(callback);
""",
        "cloud.py": """import boto3
s3 = boto3.client('s3')
pager = s3.get_paginator('list_objects_v2')
other.paginate()
for page in pager.paginate(Bucket=name):
    print(page)
""",
    }
    result = scan.scan(files)
    assert result["operations"] == {"ListObjectsV2": 2, "GeneratePresignedUrl": 1}
    assert {(e["file"], e["line"]) for e in result["evidence"] if e["category"] == "op"} == {
        ("cloud.js", 3), ("cloud.js", 4), ("cloud.py", 5),
    }


def test_browser_form_tracks_the_signed_action_and_stays_untested():
    code = """import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
const { url, fields } = await createPresignedPost(client, input);
<form action="FORM_URL" method="post">
const body = new FormData(this);
await fetch(this.action, { method: this.method, body });
""".replace("FORM_URL", chr(36) + "{url}")
    result = scan.scan({"form.js": code})
    assert result["unrecognised"] == {"browser_presigned_post": 1}
    assert {e["line"] for e in result["evidence"] if e["category"] == "unrecognised"} == {5}
    unrelated = scan.scan({"form.js": code.replace('method="post"', 'method="get"')})
    assert unrelated["unrecognised"] == {}


def test_browser_s3_upload_helpers_are_untested_without_counting_local_routes():
    files = {
        "server.js": "import { S3Client } from '@aws-sdk/client-s3';",
        "browser.js": """async function uploadPartsToS3(signedUrls, data) {
  for (const signedUrl of signedUrls)
    await fetch(signedUrl, { method: 'PUT', body: data });
}
await fetch('/api/upload', { method: 'PUT', body: data });
""",
    }
    result = scan.scan(files)
    assert result["unrecognised"] == {"browser_presigned_put": 1}
    assert {e["line"] for e in result["evidence"] if e["category"] == "unrecognised"} == {3}
    assert scan.scan({"browser.js": files["browser.js"]})["unrecognised"] == {}




@pytest.mark.parametrize("path,code,ops", [
    ("up.swift", "import SotoS3\nlet out = try await s3.putObject(req)\nlet obj = try await s3.getObject(get)\n", {"PutObject", "GetObject"}),
    ("up.cpp", "#include <aws/s3/S3Client.h>\nauto outcome = s3_client.PutObject(request);\nclient->DeleteObject(del);\n",
     {"PutObject", "DeleteObject"}),
    ("up.ex", "ExAws.S3.put_object(bucket, key, body) |> ExAws.request()\nExAws.S3.list_objects_v2(bucket)\n",
     {"PutObject", "ListObjectsV2"}),
    ("up.dart", "import 'package:minio/minio.dart';\nawait minio.putObject(bucket, key, stream);\n", {"PutObject"}),
    ("Up.scala", "import software.amazon.awssdk.services.s3.S3Client\ns3.headObject(req)\n", {"HeadObject"}),
])
def test_more_languages(path, code, ops):
    from rise import repo
    assert "." + path.rsplit(".", 1)[1] in repo.CODE_EXT
    assert set(scan.scan({path: code})["operations"]) == ops


def test_simples3_and_hand_signed_requests():
    """Benchmark misses: Genbox SimpleS3 (.NET) and a Swift app that signs S3 requests itself (bucketdrop)."""
    cs = "using Genbox.SimpleS3.Core.Network.Requests.Objects;\nvar r = await ObjectOperations.GetObjectAsync(req);\n"
    assert set(scan.scan({"T.cs": cs})["operations"]) == {"GetObject"}
    swift = ('let algorithm = "AWS4-HMAC-SHA256"\nlet service = "s3"\n'
             'func run() async throws { let objects = try await S3Service.shared.listObjects() }\n')
    assert scan.scan({"S3Service.swift": swift})["uses_s3"]
