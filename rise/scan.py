"""Static discovery: find how a codebase uses object storage (and what else locks it in), with file:line evidence.

Deterministic regex rules over source text. The AI later interprets this evidence; it never invents it.
"""
import functools
import re
from collections import Counter, defaultdict

# (pattern, item, category) — category: op (S3 operation), behaviour (S3 feature), config (client setting)
# A method call in any SDK spelling: put_object / putObject / PutObject / PutObjectAsync, after . -> or ::
# (Django's argument-less self.get_object() is not S3: the GetObject rule skips exactly that).
CALL = r"(?:\.|->|::)"
LARAVEL = r"Storage::disk\(\s*['\"]s3['\"]\s*\)->"
S3_URL = r"\(\s*f?['\"]s3a?://"

S3_RULES = [
    # --- operations: boto3 (client, resource, async) · MinIO · pandas/s3fs · AWS SDK JS v2/v3 · Go v1/v2 · Java v1/v2 ·
    #     Kotlin · PHP · Laravel · Ruby · .NET · Rust ---
    (CALL + r"(?i:f?put_?object)(?:Async)?\(|PutObject(?:Command|Input|Request)\b|\.Object\([^)]*\)\.put\(|\.put\(\s*(?:Body\s*=|body:)|"
     + LARAVEL + r"(?:put|putFile|putFileAs|writeStream)\(|\.to_\w+" + S3_URL, "PutObject", "op"),
    (CALL + r"(?i:upload_?file(?:obj)?)\(|new Upload\(|\.upload\(\s*\{|->upload\(|s3manager\.NewUploader|manager\.NewUploader|"
     r"TransferManager|TransferUtility", "PutObject", "op"),
    (CALL + r"(?i:f?get_?(?:partial_?)?object(?:AsBytes)?)(?:Async)?(?:(?<!self\.get_object)\(|\((?!\)))|GetObject(?:Command|Input|Request)\b|\.Object\([^)]*\)\.get\(|"
     r"\.get\(\)\s*\[\s*['\"]Body|" + LARAVEL + r"(?:get|readStream|download)\(|(?:read_\w+|open)" + S3_URL, "GetObject", "op"),
    (CALL + r"(?i:download_?file(?:obj)?)\(|NewDownloader", "GetObject", "op"),
    (CALL + r"(?i:head_?object|stat_?object|get_?object_?metadata|does_?object_?exists?(?:v2)?|object_?exists)(?:Async)?\(|HeadObject(?:Command|Input|Request)\b|"
     + LARAVEL + r"(?:exists|size)\(", "HeadObject", "op"),
    (CALL + r"(?i:list_?objects(?:_?v2)?)(?:Paginator|Iterable|Async)?\(|ListObjects(?:V2)?(?:Command|Input|Request)\b|"
     r"paginateListObjectsV2\s*\(|NewListObjectsV2Paginator|\.objects\.(?:filter|all|page_size)\(|\.objects\(\s*prefix:|"
     + LARAVEL + r"(?:files|allFiles)\(", "ListObjectsV2", "op"),
    (CALL + r"(?i:delete_?(?:matching_?)?objects?|remove_?objects?)(?:Async)?\(|DeleteObjects?(?:Command|Input|Request)\b|\.Object\([^)]*\)\.delete\(|"
     + LARAVEL + r"delete\(", "DeleteObject", "op"),
    (r"generate_presigned_(?:url|post)|generatePresignedUrl|(?i:getSignedUrl)|createPresignedPost|createPresignedRequest|PresignClient|"
     r"S3Presigner|(?i:presign(?:ed)?_?(?:get|put)_?object)|GetPreSignedURL|\bpresigned_url\(|\bpresignedUrl\(|PresigningConfig|"
     + LARAVEL + r"temporaryUrl\(", "GeneratePresignedUrl", "op"),
    (CALL + r"(?i:copy_?object)(?:Async)?\(|CopyObject(?:Command|Input|Request)\b|\.copy\(\s*\{?\s*['\"]?Bucket", "CopyObject", "op"),
    (r"create_multipart_upload|upload_part\(|(?i:createMultipartUpload|initiateMultipartUpload|uploadPart)(?:Async)?\(|"
     r"(?:CreateMultipartUpload|InitiateMultipartUpload|UploadPart)(?:Command|Input|Request)\b|multipart_threshold",
     "MultipartUpload", "op"),
    # --- behaviours ---
    (r"\bMetadata\s*[=:]|x-amz-meta-|\.metadata\(", "user-metadata", "behaviour"),
    (r"\bContentType\s*[=:]|['\"]Content-Type['\"]", "content-type", "behaviour"),
    (r"\bRange\s*[=:]\s*['\"`f]|bytes=\d", "range-read", "behaviour"),
    (r"\bPrefix\s*[=:]|Delimiter\s*[=:]", "prefix-list", "behaviour"),
    (r"\bTagging\s*[=:]|(?i:(?:put|get|delete)_?object_?tagging)", "object-tagging", "behaviour"),
    (r"ServerSideEncryption|SSEKMSKeyId|x-amz-server-side-encryption|SSECustomerKey", "server-side-encryption", "behaviour"),
    (r"\bStorageClass\s*[=:]|STANDARD_IA|GLACIER|INTELLIGENT_TIERING|ONEZONE_IA", "storage-class", "behaviour"),
    (r"\bACL\s*[=:]|(?i:put_?object_?acl)|public-read|bucket-owner-full-control", "acl", "behaviour"),
    (r"put_bucket_versioning|VersionId|list_object_versions|BucketVersioning", "versioning", "behaviour"),
    (r"put_bucket_lifecycle|LifecycleConfiguration|lifecycle_rule", "lifecycle", "behaviour"),
    (r"put_bucket_policy|BucketPolicy|aws_s3_bucket_policy", "bucket-policy", "behaviour"),
    (r"put_bucket_notification|NotificationConfiguration|s3:ObjectCreated", "event-notifications", "behaviour"),
    (r"\bCacheControl\s*[=:]", "cache-control", "behaviour"),
    # --- client configuration ---
    (r"region_name\s*=|AWS_REGION|AWS_DEFAULT_REGION|region\s*:\s*['\"`]|['\"]region['\"]\s*=>|\.region\(|WithRegion\(|"
     r"\bRegion\.[A-Z]{2}_[A-Z]+_\d|RegionEndpoint\.\w+|Regions\.[A-Z]{2}_", "signing-region", "config"),
    (r"endpoint_url\s*=|S3_ENDPOINT|endpoint\s*:\s*['\"`]|['\"]endpoint['\"]\s*=>|\.endpointOverride\(|BaseEndpoint|ServiceURL\s*=|"
     r"\.endpoint_url\(", "custom-endpoint", "config"),
    (r"addressing_style|(?i:force_?path_?style)|UsePathStyle|pathStyleAccess|use_path_style_endpoint", "addressing-style", "config"),
    (r"signature_version|signatureVersion", "signature-version", "config"),
]
DETECT_S3 = re.compile(r"boto3|botocore|client\(\s*['\"]s3['\"]|resource\(\s*['\"]s3['\"]|@aws-sdk/client-s3|aws-sdk|S3Client|"
                       r"aws-sdk-go(?:-v2)?/service/s3|software\.amazon\.awssdk\.services\.s3|com\.amazonaws\.services\.s3|Aws\\S3|"
                       r"Aws::S3|Amazon\.S3|IAmazonS3|aws_sdk_s3|minio|aws_s3_bucket|s3fs|S3FileSystem|disk\(\s*['\"]s3['\"]|"
                       r"['\"]s3a?://|boto\.s3|S3Connection|\bs3::|\bS3::|tinys3|"
                       r"ExAws\.S3|SotoS3|aws_s3_api|Genbox\.SimpleS3|"  # Elixir, Swift, Dart, .NET SimpleS3
                       r"AWS4-HMAC-SHA256")  # hand-signed S3 requests (SigV4), no SDK at all

# Other cloud services the code depends on: real lock-in RISE does not test yet.
# (pattern, cloud, literals): a pattern can only match text holding one of its literals (substring test: a fast prefilter)
LOCKIN_RULES = [
    (r"""(?:boto3\.(?:client|resource)|session\.client)\(\s*['"]([a-z0-9-]+)['"]""", "aws", (".client(", ".resource(")),
    (r"@aws-sdk/client-([a-z0-9-]+)", "aws", ("@aws-sdk/client-",)),
    (r"aws-sdk-go(?:-v2)?/service/([a-z0-9]+)", "aws", ("aws-sdk-go",)),
    (r"software\.amazon\.awssdk\.services\.([a-z0-9]+)", "aws", ("software.amazon.awssdk.services.",)),
    (r"resource\s+\"aws_([a-z0-9]+)_", "aws", ('"aws_',)),
    (r"(azure)\.storage\.blob|@azure/(storage-blob)", "azure", ("azure.storage.blob", "@azure/storage-blob")),
    (r"(google)\.cloud\.storage|@google-cloud/(storage)", "gcp", ("google.cloud.storage", "@google-cloud/storage")),
]
DETECT_NEEDS = ("boto", "s3", "S3", "minio")  # every DETECT_S3 alternative contains one of these
# Storage SDKs that are not S3: each call maps to the S3 operation the destination must provide after the SDK swap.
# key -> (name, literal prefilter, file detector, rules)
SDKS = {"supabase": ("Supabase Storage", ".storage", re.compile(r"\.storage\s*\.from_?\("), [
    (r"\.upload(?:ToSignedUrl|_to_signed_url)?\(", "PutObject", "op"),
    (r"\.download\(", "GetObject", "op"),
    (r"\.from_?\([^)]*\)\s*\.list\(", "ListObjectsV2", "op"),  # list/remove/move/copy are common names: only on a bucket
    (r"\.from_?\([^)]*\)\s*\.remove\(", "DeleteObject", "op"),
    (r"\.from_?\([^)]*\)\s*\.(?:move|copy)\(", "CopyObject", "op"),
    (r"(?i)\.create_?signed_?(?:upload_?)?urls?\(", "GeneratePresignedUrl", "op"),
    (r"(?i)\.get_?public_?url\(", "bucket-policy", "behaviour"),  # a public URL needs a public bucket on S3
    (r"\bcontentType\s*:|['\"]content-type['\"]\s*:", "content-type", "behaviour"),
    (r"\bcacheControl\s*:|['\"]cache-control['\"]\s*:", "cache-control", "behaviour"),
    (r"\bmetadata\s*:", "user-metadata", "behaviour"),
])}


def sdks_in(text: str) -> list[str]:
    return [k for k, (_, lit, rx, _) in SDKS.items() if lit in text and rx.search(text)]
AWS_NAMES = {"sqs": "SQS queues", "sns": "SNS notifications", "dynamodb": "DynamoDB", "lambda": "Lambda", "kinesis": "Kinesis",
             "ses": "SES email", "secretsmanager": "Secrets Manager", "kms": "KMS", "cognito-idp": "Cognito", "cognito": "Cognito",
             "sts": "STS", "iam": "IAM", "rds": "RDS", "ec2": "EC2", "ecs": "ECS", "eks": "EKS", "cloudwatch": "CloudWatch",
             "logs": "CloudWatch Logs", "events": "EventBridge", "eventbridge": "EventBridge", "stepfunctions": "Step Functions",
             "sfn": "Step Functions", "athena": "Athena", "glue": "Glue", "bedrock": "Bedrock", "bedrock-runtime": "Bedrock",
             "textract": "Textract", "rekognition": "Rekognition", "cloudfront": "CloudFront", "route53": "Route 53",
             "ssm": "SSM Parameter Store", "elasticache": "ElastiCache", "apigateway": "API Gateway", "sagemaker": "SageMaker",
             "ecr": "ECR", "translate": "Translate", "comprehend": "Comprehend", "polly": "Polly", "transcribe": "Transcribe"}
# Safety net: in a file that uses S3, any other call named like a storage call (restore_object, putObjectRetention,
# CreateBucket...) is reported as unrecognised with file:line, so nothing the scanner does not know is ever silently dropped.
S3_API = (  # every operation of the official S3 API (botocore's service model, 2026-11-20): the safety net's word list
    "AbortMultipartUpload", "CompleteMultipartUpload", "CopyObject", "CreateBucket", "CreateBucketMetadataConfiguration",
    "CreateBucketMetadataTableConfiguration", "CreateMultipartUpload", "CreateSession", "DeleteBucket",
    "DeleteBucketAnalyticsConfiguration", "DeleteBucketCors", "DeleteBucketEncryption",
    "DeleteBucketIntelligentTieringConfiguration", "DeleteBucketInventoryConfiguration", "DeleteBucketLifecycle",
    "DeleteBucketMetadataConfiguration", "DeleteBucketMetadataTableConfiguration", "DeleteBucketMetricsConfiguration",
    "DeleteBucketOwnershipControls", "DeleteBucketPolicy", "DeleteBucketReplication", "DeleteBucketTagging",
    "DeleteBucketWebsite", "DeleteObject", "DeleteObjectAnnotation", "DeleteObjectTagging", "DeleteObjects",
    "DeletePublicAccessBlock", "GetBucketAbac", "GetBucketAccelerateConfiguration", "GetBucketAcl",
    "GetBucketAnalyticsConfiguration", "GetBucketCors", "GetBucketEncryption", "GetBucketIntelligentTieringConfiguration",
    "GetBucketInventoryConfiguration", "GetBucketLifecycle", "GetBucketLifecycleConfiguration", "GetBucketLocation",
    "GetBucketLogging", "GetBucketMetadataConfiguration", "GetBucketMetadataTableConfiguration",
    "GetBucketMetricsConfiguration", "GetBucketNotification", "GetBucketNotificationConfiguration",
    "GetBucketOwnershipControls", "GetBucketPolicy", "GetBucketPolicyStatus", "GetBucketReplication", "GetBucketRequestPayment",
    "GetBucketTagging", "GetBucketVersioning", "GetBucketWebsite", "GetObject", "GetObjectAcl", "GetObjectAnnotation",
    "GetObjectAttributes", "GetObjectLegalHold", "GetObjectLockConfiguration", "GetObjectRetention", "GetObjectTagging",
    "GetObjectTorrent", "GetPublicAccessBlock", "HeadBucket", "HeadObject", "ListBucketAnalyticsConfigurations",
    "ListBucketIntelligentTieringConfigurations", "ListBucketInventoryConfigurations", "ListBucketMetricsConfigurations",
    "ListBuckets", "ListDirectoryBuckets", "ListMultipartUploads", "ListObjectAnnotations", "ListObjectVersions", "ListObjects",
    "ListObjectsV2", "ListParts", "PutBucketAbac", "PutBucketAccelerateConfiguration", "PutBucketAcl",
    "PutBucketAnalyticsConfiguration", "PutBucketCors", "PutBucketEncryption", "PutBucketIntelligentTieringConfiguration",
    "PutBucketInventoryConfiguration", "PutBucketLifecycle", "PutBucketLifecycleConfiguration", "PutBucketLogging",
    "PutBucketMetricsConfiguration", "PutBucketNotification", "PutBucketNotificationConfiguration",
    "PutBucketOwnershipControls", "PutBucketPolicy", "PutBucketReplication", "PutBucketRequestPayment", "PutBucketTagging",
    "PutBucketVersioning", "PutBucketWebsite", "PutObject", "PutObjectAcl", "PutObjectAnnotation", "PutObjectLegalHold",
    "PutObjectLockConfiguration", "PutObjectRetention", "PutObjectTagging", "PutPublicAccessBlock", "RenameObject",
    "RestoreObject", "SelectObjectContent", "UpdateBucketMetadataAnnotationTableConfiguration",
    "UpdateBucketMetadataInventoryTableConfiguration", "UpdateBucketMetadataJournalTableConfiguration",
    "UpdateObjectEncryption", "UploadPart", "UploadPartCopy", "WriteGetObjectResponse",
)
API = {o.lower() for o in S3_API}
# every S3 API operation starts with one of these verbs: a short pattern, then a set lookup (a 348-name alternation is slow)
API_CALL = re.compile(CALL + r"((?i:abort|complete|copy|create|delete|get|head|list|put|rename|restore|select|update|upload|write)\w*?)(?:Async)?\(")
AMBIGUOUS = {"getobject", "listobjects", "createsession"}  # JDBC rs.getObject, resources.GetObject, web sessions...
STORE_RECEIVER = re.compile(r"(?i)(?:\b|_)(?:s3|stor|client|bucket|provider|minio|blob|aws|oss|backend|remote|cloud)\w*(?:\([^()\n]*\))?\s*(?:\.|->|::)\s*$")
S3_ARGS = re.compile(r"(?i)\bbucket|\bKey\s*[=:]|\bs3")
CANDIDATE = re.compile(CALL + r"(\w+?)(?:Async)?\(|\bnew\s+(\w+?)Command\(")
_SUFFIX = (r"(?:_?(?:exists?(?:v2)?|content|tagging|tags|retention|legal_?hold|lock_?config(?:uration)?|acl|attributes|metadata|"
           r"policy|versioning|lifecycle(?:_?configuration)?|encryption|cors|notification|replication|website|logging|location|"
           r"ownership_?controls|accelerate_?configuration|with_?metadata|v2))")
# an S3-shaped name: verb + object/bucket + S3 suffix (get/set need a suffix: getBucket(), setObject() are plain accessors)
STORAGE_NAME = re.compile(r"(?i)(?:get|set)_?(?:object|bucket)s?" + _SUFFIX + r"+|"
                          r"(?:put|delete|remove|list|head|create|make|copy|compose|append|select|restore|upload|download|stat|"
                          r"abort|complete|enable|disable|listen|does)_?(?:object|bucket)s?" + _SUFFIX + r"*|(?:object|bucket)_?exists?")
_RULES = [re.compile(p) for p, _, _ in S3_RULES]


@functools.lru_cache(maxsize=4096)
def untested_call(name: str, command: bool = False) -> bool:
    """A storage call no rule reads: an official S3 API operation, or an S3-shaped SDK method (makeBucket, composeObject)."""
    if not (name.replace("_", "").lower() in API or STORAGE_NAME.fullmatch(name)):
        return False
    probe = f"new {name}Command(" if command else f"c.{name}("  # the spelling the code used, not another one
    return not any(r.search(probe) for r in _RULES)


COMMENT = re.compile(r"^\s*(#|//|\*|/\*)")
EVIDENCE_PER_ITEM = 24
IMPORT = re.compile(r"^\s*(import\b|from\s+\S+\s+import\b|export\s+\{|.*\brequire\()")
PY_DEF = re.compile(r"^\s*(?:async\s+)?def\s+\w+\s*\(")
JS_TYPE = re.compile(r"\w+(?:Command|Input|Request)\b")
JS_NEW = re.compile(r"\bnew\s*$")
CALL_ARGS = re.compile(r"\s*\(")
JS_FILES = (".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx")
VERSION_CALL = re.compile(r"\.(?:list_object_versions|listObjectVersions|ListObjectVersions)(?:Async)?\s*\(")
S3_PAGER = r"""\.get_paginator\(\s*['"](list_objects(?:_v2)?|list_object_versions)['"]\s*\)"""
PAGER_BINDING = re.compile(r"(?m)^[ \t]*(\w+)\s*=\s*[\w.]+" + S3_PAGER)
PAGER_INLINE = re.compile(S3_PAGER + r"\.paginate\s*\(")
KNOX_BINDING = re.compile(r"\b(\w+)\s*=\s*knox\.createClient\s*\(")
KNOX_IMPORT = re.compile(r"""\bknox\s*=\s*require\(\s*['"]knox['"]\s*\)""")
SIGNED_FORM_URL = re.compile(r"\{\s*(\w+)\s*,\s*fields\s*\}\s*=\s*(?:await\s+)?createPresignedPost\s*\(")
SIGNED_FORM_SUBMIT = re.compile(r"\bfetch\(\s*this\.action\s*,\s*\{[^}]{0,300}\bmethod\s*:\s*this\.method\b")
SIGNED_PUT = re.compile(r"""\bfetch\(\s*(?:pre)?signedUrl\s*,\s*\{[^}]{0,240}\bmethod\s*:\s*['"]PUT['"]""", re.IGNORECASE)
FETCH_POST = re.compile(r"""\bfetch\(\s*\w+\s*,\s*\{[^}]{0,240}\bmethod\s*:\s*['"]POST['"]""")
AJAX_PUT = re.compile(r"""\$\s*\.ajax\(\s*\{[^}]{0,240}\btype\s*:\s*['"]PUT['"]""")
BUCKET_REF = re.compile(r"\b[\w.]+\.Bucket\([^()\n]*\)")
BUCKET_ASSIGN = re.compile(r"(?m)^[ \t]*(\w+)\s*=\s*" + BUCKET_REF.pattern)
S3_HTTP_URL = r"https://(?:[\w.$\{\}-]+\.)?s3(?:[.-][\w.$\{\}-]+)?\.amazonaws\.com/"
S3_URL_ASSIGN = re.compile(r"""(?m)^[ \t]*(?:(?:const|let|var)\s+)?(\w+)\s*=\s*['"\x60]""" + S3_HTTP_URL)
PRESIGNED_FORM = re.compile(r"\bObject\.entries\(\s*(\w+)\.fields\s*\)")
NOT_LOCKIN = {"s3", "s3control", "core", "config", "credential-providers", "sts", "sso", "sso-oidc", "cognito-identity"}


def detected(text: str) -> bool:
    return (any(s in text for s in DETECT_NEEDS) and bool(DETECT_S3.search(text))
            or ("knox" in text and bool(KNOX_IMPORT.search(text))) or bool(sdks_in(text)))


def wrapper(text: str) -> bool:
    """A file with no S3 import that calls the official S3 API through a client made elsewhere (self.s3.put_object, ...).
    Names other code also uses (JDBC getObject, resources.GetObject) count only on a line that mentions a bucket or key,
    or when called on a storage-named object (storage.getObject, s3Client.listObjects)."""
    for m in API_CALL.finditer(text):
        name = m.group(1).replace("_", "").lower()
        if name not in API:
            continue
        if name not in AMBIGUOUS:
            return True
        line = text[text.rfind("\n", 0, m.start()) + 1:text.find("\n", m.end()) % (len(text) + 1)]
        if S3_ARGS.search(line) or STORE_RECEIVER.search(text, max(0, m.start(1) - 100), m.start(1)):  # storage.getObject(key)
            return True
    return False


def repo_uses_s3(files: dict[str, str]) -> bool:
    return any(detected(t) for t in files.values())


def scan(files: dict[str, str]) -> dict:
    return finish(raw(files))


def in_string(line: str, i: int) -> bool:
    """Is column i inside a '...' or "..." literal? Error text like "S3::putObject(): failed" is not a call.
    shortcut: one line at a time, backticks ignored (JS `${s3.send()}` stays a call)."""
    quote, k = None, 0
    while k < i:
        c = line[k]
        if c == "\\":
            k += 1
        elif quote is None and c in "'\"":
            quote = c
        elif c == quote:
            quote = None
        k += 1
    return quote is not None


def contextual_calls(path: str, text: str, is_s3: bool, repo_s3: bool) -> list[tuple[int, tuple[str, str]]]:
    """Find calls whose operation depends on a receiver or request defined elsewhere in the file."""
    calls = []

    def find(pattern, item, category="unrecognised"):
        calls.extend((m.start(), (item, category)) for m in re.finditer(pattern, text))

    if is_s3 and path.endswith(".py"):
        if ".get_paginator(" in text:
            for pager in PAGER_BINDING.finditer(text):
                item = ("call:list_object_versions", "unrecognised") if pager[2] == "list_object_versions" else ("ListObjectsV2", "op")
                for invocation in re.compile(r"\b" + pager[1] + r"\.paginate\s*\(").finditer(text, pager.end()):
                    calls.append((invocation.start(), item))
            for invocation in PAGER_INLINE.finditer(text):
                item = ("call:list_object_versions", "unrecognised") if invocation[1] == "list_object_versions" else ("ListObjectsV2", "op")
                calls.append((invocation.start(), item))
        if ".Bucket(" in text:
            aliases = [m[1] for m in BUCKET_ASSIGN.finditer(text)]
            bucket = r"(?:" + BUCKET_REF.pattern
            if aliases:
                bucket += r"|\b(?:" + "|".join(sorted(set(aliases))) + r")"
            bucket += ")"
            find(bucket + r"\.copy\s*\(", "CopyObject", "op")
            find(bucket + r"\.delete\s*\(", "call:delete_bucket")
            find(bucket + r"\.objects\.delete\s*\(", "DeleteObject", "op")
            find(bucket + r"\.object_versions\.(?:all|filter)\s*\(", "call:list_object_versions")

    if path.endswith(JS_FILES) and "knox.createClient" in text and KNOX_IMPORT.search(text):
        for binding in KNOX_BINDING.finditer(text):
            for invocation in re.compile(r"\b" + binding[1] + r"\.(list|signedUrl)\s*\(").finditer(text, binding.end()):
                calls.append((invocation.start(), ("ListObjectsV2" if invocation[1] == "list" else "GeneratePresignedUrl", "op")))

    if path.endswith(JS_FILES) and "@aws-sdk/s3-presigned-post" in text and "new FormData(this)" in text:
        for binding in SIGNED_FORM_URL.finditer(text):
            form = re.compile(r"""<form\b[^>]*\baction\s*=\s*['"]\x24\{""" + binding[1]
                              + r"""\}['"][^>]*\bmethod\s*=\s*['"]post['"]""", re.IGNORECASE)
            target = form.search(text, binding.end())
            if target:
                calls.extend((m.start(), ("call:browser_presigned_post", "unrecognised"))
                             for m in SIGNED_FORM_SUBMIT.finditer(text, target.end()))

    if repo_s3 and path.endswith(JS_FILES):
        if "signedUrls" in text and "ToS3" in text:
            calls.extend((m.start(), ("call:browser_presigned_put", "unrecognised")) for m in SIGNED_PUT.finditer(text))
        if "uploadToS3(" in text and "new FormData(" in text and "Object.entries(fields)" in text:
            calls.extend((m.start(), ("call:browser_presigned_post", "unrecognised")) for m in FETCH_POST.finditer(text))
        if ".then((url)" in text and "/signedurl?" in text and "$.ajax" in text:
            calls.extend((m.start(), ("call:browser_presigned_put", "unrecognised")) for m in AJAX_PUT.finditer(text))
        if all(marker in text for marker in ("data.s3Key", "data.signature", "data.policy")):
            find(r"\b\w+\.submit\s*\(", "call:browser_presigned_post")

    if path.endswith(JS_FILES) and ".amazonaws.com/" in text:
        urls = {m[1] for m in S3_URL_ASSIGN.finditer(text)}
        for url in urls:
            for request in re.finditer(r"\bfetch\(\s*" + url + r"\s*(?:,\s*(\{[^{}]*\}))?\s*\)", text):
                if not re.search(r"\bmethod\b", request[1] or ""):
                    calls.append((request.start(), ("GetObject", "op")))
        if urls and "XMLHttpRequest" in text and "FormData" in text:
            bodies = {m[1] for m in re.finditer(r"\b(\w+)\s*=\s*new\s+FormData\(", text)}
            for form in {m[1] for m in PRESIGNED_FORM.finditer(text)}:
                for request in re.finditer(r"""\b(\w+)\.open\(\s*['"]POST['"]\s*,\s*""" + form + r"\.url\b", text):
                    send = re.search(r"\b" + request[1] + r"\.send\(\s*(\w+)\s*\)", text[request.end():])
                    if send and send[1] in bodies:
                        calls.append((request.end() + send.start(), ("call:browser_presigned_post", "unrecognised")))
    return calls


def raw(files: dict[str, str], repo_s3: bool | None = None) -> tuple:
    """Scan one set of files. Results of consecutive (path-sorted) chunks combine with merge() into exactly scan(all),
    given the same repo_s3 (does any file of the whole repository import an S3 SDK)."""
    if repo_s3 is None:
        repo_s3 = repo_uses_s3(files)
    rules = [(re.compile(p), item, cat) for p, item, cat in S3_RULES]
    lockin = [(re.compile(p), cloud, needs) for p, cloud, needs in LOCKIN_RULES]
    sdk_rules = {k: [(rx, "sdk:" + k, "sdk")] + [(re.compile(p), item, cat) for p, item, cat in rs] for k, (_, _, rx, rs) in SDKS.items()}
    evidence, counts, lock = [], Counter(), defaultdict(list)
    s3_files = []
    for path, text in sorted(files.items()):
        is_s3 = detected(text) or (repo_s3 and wrapper(text))
        contextual = contextual_calls(path, text, is_s3, repo_s3)
        if is_s3 or contextual:
            s3_files.append(path)
        # each rule runs once over the whole file at C speed; line numbers are worked out only where something matched
        hits = [(pos, 0, 0, payload) for pos, payload in contextual]
        is_js = path.endswith(JS_FILES)
        # (pos, group, order, payload): group 0 = S3 rule, 1 = untested call, 2 = lock-in
        if is_s3:
            for i, (rx, item, cat) in enumerate(rules):
                for m in rx.finditer(text):
                    if is_js and cat == "op" and JS_TYPE.fullmatch(m[0]):
                        if not JS_NEW.search(text[max(0, m.start() - 24):m.start()]) or not CALL_ARGS.match(text, m.end()):
                            continue
                    hits.append((m.start(), 0, i, (item, cat)))
            if "Versions" in text or "list_object_versions" in text:
                hits += [(m.start(), 0, 0, ("call:list_object_versions", "unrecognised")) for m in VERSION_CALL.finditer(text)]
            if is_js and "paginateListBuckets" in text:
                hits += [(m.start(), 0, 0, ("call:list_buckets", "unrecognised"))
                         for m in re.finditer(r"\bpaginateListBuckets\s*\(", text)]
            for k in sdks_in(text):
                for i, (rx, item, cat) in enumerate(sdk_rules[k]):
                    hits += [(m.start(), 0, 1000 + i, (item, cat)) for m in rx.finditer(text)]
            for m in CANDIDATE.finditer(text):
                name = m.group(1) or m.group(2)
                if untested_call(name, m.group(2) is not None):
                    hits.append((m.start(), 1, 0, ("call:" + name, "unrecognised")))
        for i, (rx, cloud, needs) in enumerate(lockin):
            if any(s in text for s in needs):
                for m in rx.finditer(text):
                    hits.append((m.start(), 2, i, (next((g for g in m.groups() if g), "").lower(), cloud)))
        if not hits:
            continue
        hits.sort()
        rows, n, at = [], 1, 0
        for pos, group, order, payload in hits:
            n += text.count("\n", at, pos)
            at = pos
            rows.append((n, group, order, pos, payload))
        rows.sort()
        seen = set()
        for n, group, order, pos, payload in rows:
            start, end = text.rfind("\n", 0, pos) + 1, text.find("\n", pos)
            line = text[start:end if end >= 0 else len(text)].rstrip("\r")
            if len(line) > 400 or COMMENT.match(line):
                continue
            if group < 2:
                if (n, group, payload) in seen or IMPORT.match(line):  # one count per line; imports are not call sites
                    continue
                if payload[1] in {"op", "unrecognised"} and (in_string(line, pos - start) or PY_DEF.match(line)):
                    continue
                seen.add((n, group, payload))
                item, cat = payload
                counts[item] += 1
                if counts[item] <= EVIDENCE_PER_ITEM:
                    evidence.append({"item": item, "category": cat, "file": path, "line": n, "code": line.strip()[:180]})
            else:
                svc, cloud = payload
                if svc in NOT_LOCKIN or not svc:
                    continue
                name = AWS_NAMES.get(svc, svc.upper()) if cloud == "aws" else {"azure": "Azure Blob Storage", "gcp": "Google Cloud Storage"}[cloud]
                if len(lock[name]) < 4:
                    lock[name].append({"file": path, "line": n, "code": line.strip()[:180], "cloud": cloud})
    return len(files), s3_files, evidence, counts, lock


def merge(parts: list[tuple]) -> tuple:
    """Combine raw() results of consecutive chunks, in order, applying the same per-item caps as one pass would."""
    n, s3_files, evidence, counts, lock = 0, [], [], Counter(), defaultdict(list)
    evidence_counts = Counter()
    for pn, ps3, pev, pcounts, plock in parts:
        n += pn
        s3_files += ps3
        for e in pev:
            if evidence_counts[e["item"]] < EVIDENCE_PER_ITEM:
                evidence.append(e)
                evidence_counts[e["item"]] += 1
        counts.update(pcounts)
        for name, ev in plock.items():
            lock[name].extend(ev[:4 - len(lock[name])])
    return n, s3_files, evidence, counts, lock


def finish(r: tuple) -> dict:
    n, s3_files, evidence, counts, lock = r
    ops = {k: v for k, v in counts.items() if any(k == i and c == "op" for _, i, c in S3_RULES)}
    feats = {k: v for k, v in counts.items() if any(k == i and c == "behaviour" for _, i, c in S3_RULES)}
    config = {k: v for k, v in counts.items() if any(k == i and c == "config" for _, i, c in S3_RULES)}
    unrecognised = {k[5:]: v for k, v in counts.items() if k.startswith("call:")}
    return {
        "files_scanned": n, "s3_files": s3_files, "uses_s3": bool(ops),
        "sdk": [SDKS[k[4:]][0] for k in sorted(counts) if k.startswith("sdk:")],  # non-S3 storage SDKs the code calls
        "operations": ops, "features": feats, "config": config, "unrecognised": unrecognised,
        "evidence": evidence, "lockin": [{"service": k, "evidence": v} for k, v in sorted(lock.items())],
    }


def profile(result: dict) -> dict:
    """Shape scan output like a runtime-observed profile so the same planner and engine can use it."""
    ev = result["evidence"]
    cts = sorted({m.group(1) for e in ev for m in [re.search(r"ContentType\s*[=:]\s*['\"]([\w.+/-]+)['\"]", e["code"])] if m})
    md = sorted({k for e in ev for k in re.findall(r"['\"]([a-z][a-z0-9-]{1,30})['\"]\s*:", e["code"]) if e["item"] == "user-metadata"})[:5]
    prefixes = sorted({m.group(1) for e in ev for m in [re.search(r"Prefix\s*[=:]\s*['\"]([\w./-]{1,40})['\"]", e["code"])] if m})[:5]
    return {"observed_calls": sum(result["operations"].values()), "operations": result["operations"],
            "features": result["features"], "items": sorted(set(result["operations"]) | set(result["features"])),
            "content_types": cts, "metadata_keys": md, "prefixes": prefixes, "max_size": 0, "source": "static-analysis"}
