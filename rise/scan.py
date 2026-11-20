"""Static discovery: find how a codebase uses object storage (and what else locks it in), with file:line evidence.

Deterministic regex rules over source text. The AI later interprets this evidence; it never invents it.
"""
import re
from collections import Counter, defaultdict

# (pattern, item, category) — category: op (S3 operation), behaviour (S3 feature), config (client setting)
S3_RULES = [
    # --- operations (boto3 · AWS SDK JS v2/v3 · Go · Java · PHP) ---
    (r"\.put_object\(|PutObjectCommand|\.putObject\(|PutObjectInput|PutObjectRequest|->putObject\(", "PutObject", "op"),
    (r"\.upload_file(?:obj)?\(|new Upload\(|\.upload\(\s*\{|s3manager\.NewUploader|manager\.NewUploader|TransferManager", "PutObject", "op"),
    (r"\.get_object\(|GetObjectCommand|\.getObject\(|GetObjectInput|GetObjectRequest|->getObject\(", "GetObject", "op"),
    (r"\.download_file(?:obj)?\(|NewDownloader", "GetObject", "op"),
    (r"\.head_object\(|HeadObjectCommand|\.headObject\(|HeadObjectInput|->headObject\(", "HeadObject", "op"),
    (r"\.list_objects(?:_v2)?\(|ListObjects(?:V2)?Command|\.listObjects(?:V2)?\(|ListObjects(?:V2)?Input|->listObjects", "ListObjectsV2", "op"),
    (r"\.delete_objects?\(|DeleteObjects?Command|\.deleteObjects?\(|DeleteObjects?Input|->deleteObject", "DeleteObject", "op"),
    (r"generate_presigned_(?:url|post)|getSignedUrl|createPresignedPost|PresignClient|presign(?:ed)?(?:GetObject|PutObject)|->createPresignedRequest", "GeneratePresignedUrl", "op"),
    (r"\.copy_object\(|CopyObjectCommand|\.copyObject\(|CopyObjectInput|\.copy\(\s*\{?\s*['\"]?Bucket", "CopyObject", "op"),
    (r"create_multipart_upload|upload_part\(|CreateMultipartUploadCommand|createMultipartUpload|UploadPartInput|TransferConfig\(|multipart_threshold", "MultipartUpload", "op"),
    # --- behaviours ---
    (r"\bMetadata\s*[=:]|x-amz-meta-|\.metadata\(", "user-metadata", "behaviour"),
    (r"\bContentType\s*[=:]|['\"]Content-Type['\"]", "content-type", "behaviour"),
    (r"\bRange\s*[=:]\s*['\"`f]|bytes=\d", "range-read", "behaviour"),
    (r"\bPrefix\s*[=:]|Delimiter\s*[=:]", "prefix-list", "behaviour"),
    (r"\bTagging\s*[=:]|put_object_tagging|get_object_tagging|PutObjectTaggingCommand|putObjectTagging", "object-tagging", "behaviour"),
    (r"ServerSideEncryption|SSEKMSKeyId|x-amz-server-side-encryption|SSECustomerKey", "server-side-encryption", "behaviour"),
    (r"\bStorageClass\s*[=:]|STANDARD_IA|GLACIER|INTELLIGENT_TIERING|ONEZONE_IA", "storage-class", "behaviour"),
    (r"\bACL\s*[=:]|put_object_acl|PutObjectAclCommand|public-read|bucket-owner-full-control", "acl", "behaviour"),
    (r"put_bucket_versioning|VersionId|list_object_versions|BucketVersioning", "versioning", "behaviour"),
    (r"put_bucket_lifecycle|LifecycleConfiguration|lifecycle_rule", "lifecycle", "behaviour"),
    (r"put_bucket_policy|BucketPolicy|aws_s3_bucket_policy", "bucket-policy", "behaviour"),
    (r"put_bucket_notification|NotificationConfiguration|s3:ObjectCreated", "event-notifications", "behaviour"),
    (r"\bCacheControl\s*[=:]", "cache-control", "behaviour"),
    # --- client configuration ---
    (r"region_name\s*=|AWS_REGION|AWS_DEFAULT_REGION|region\s*:\s*['\"`]|\.region\(", "signing-region", "config"),
    (r"endpoint_url\s*=|S3_ENDPOINT|endpoint\s*:\s*['\"`]|\.endpointOverride\(", "custom-endpoint", "config"),
    (r"addressing_style|forcePathStyle|s3ForcePathStyle|UsePathStyle|pathStyleAccess", "addressing-style", "config"),
    (r"signature_version|signatureVersion", "signature-version", "config"),
]
DETECT_S3 = re.compile(r"boto3|botocore|client\(\s*['\"]s3['\"]|resource\(\s*['\"]s3['\"]|@aws-sdk/client-s3|aws-sdk|S3Client|"
                       r"aws-sdk-go(?:-v2)?/service/s3|software\.amazon\.awssdk\.services\.s3|Aws\\S3|minio|aws_s3_bucket")

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
AWS_NAMES = {"sqs": "SQS queues", "sns": "SNS notifications", "dynamodb": "DynamoDB", "lambda": "Lambda", "kinesis": "Kinesis",
             "ses": "SES email", "secretsmanager": "Secrets Manager", "kms": "KMS", "cognito-idp": "Cognito", "cognito": "Cognito",
             "sts": "STS", "iam": "IAM", "rds": "RDS", "ec2": "EC2", "ecs": "ECS", "eks": "EKS", "cloudwatch": "CloudWatch",
             "logs": "CloudWatch Logs", "events": "EventBridge", "eventbridge": "EventBridge", "stepfunctions": "Step Functions",
             "sfn": "Step Functions", "athena": "Athena", "glue": "Glue", "bedrock": "Bedrock", "bedrock-runtime": "Bedrock",
             "textract": "Textract", "rekognition": "Rekognition", "cloudfront": "CloudFront", "route53": "Route 53",
             "ssm": "SSM Parameter Store", "elasticache": "ElastiCache", "apigateway": "API Gateway", "sagemaker": "SageMaker",
             "ecr": "ECR", "translate": "Translate", "comprehend": "Comprehend", "polly": "Polly", "transcribe": "Transcribe"}
COMMENT = re.compile(r"^\s*(#|//|\*|/\*)")
IMPORT = re.compile(r"^\s*(import\b|from\s+\S+\s+import\b|export\s+\{|.*\brequire\()")
NOT_LOCKIN = {"s3", "s3control", "core", "config", "credential-providers", "sts", "sso", "sso-oidc", "cognito-identity"}


def scan(files: dict[str, str]) -> dict:
    return finish(raw(files))


def raw(files: dict[str, str]) -> tuple:
    """Scan one set of files. Results of consecutive (path-sorted) chunks combine with merge() into exactly scan(all)."""
    rules = [(re.compile(p), item, cat) for p, item, cat in S3_RULES]
    lockin = [(re.compile(p), cloud, needs) for p, cloud, needs in LOCKIN_RULES]
    evidence, counts, lock = [], Counter(), defaultdict(list)
    s3_files = []
    for path, text in sorted(files.items()):
        is_s3 = any(s in text for s in DETECT_NEEDS) and bool(DETECT_S3.search(text))
        if is_s3:
            s3_files.append(path)
        # a rule can only match a line if it matches the whole text: one C-speed pass per rule skips most files entirely
        f_rules = [r for r in rules if r[0].search(text)] if is_s3 else []
        f_lock = [r for r in lockin if any(s in text for s in r[2]) and r[0].search(text)]
        if not f_rules and not f_lock:
            continue
        for n, line in enumerate(text.splitlines(), 1):
            if len(line) > 400 or COMMENT.match(line):
                continue
            if f_rules and not IMPORT.match(line):  # imports prove a dependency, not a call site
                for rx, item, cat in f_rules:
                    if rx.search(line):
                        counts[item] += 1
                        if counts[item] <= 6:  # keep evidence bounded per item
                            evidence.append({"item": item, "category": cat, "file": path, "line": n, "code": line.strip()[:180]})
            for rx, cloud, _ in f_lock:
                for m in rx.finditer(line):
                    svc = next((g for g in m.groups() if g), "").lower()
                    if svc in NOT_LOCKIN or not svc:
                        continue
                    name = AWS_NAMES.get(svc, svc.upper()) if cloud == "aws" else {"azure": "Azure Blob Storage", "gcp": "Google Cloud Storage"}[cloud]
                    if len(lock[name]) < 4:
                        lock[name].append({"file": path, "line": n, "code": line.strip()[:180], "cloud": cloud})
    return len(files), s3_files, evidence, counts, lock


def merge(parts: list[tuple]) -> tuple:
    """Combine raw() results of consecutive chunks, in order, applying the same per-item caps as one pass would."""
    n, s3_files, evidence, counts, lock = 0, [], [], Counter(), defaultdict(list)
    for pn, ps3, pev, pcounts, plock in parts:
        n += pn
        s3_files += ps3
        for e in pev:  # a chunk keeps its first 6 per item, so the global first 6 are among them
            if sum(1 for x in evidence if x["item"] == e["item"]) < 6:
                evidence.append(e)
        counts.update(pcounts)
        for name, ev in plock.items():
            lock[name].extend(ev[:4 - len(lock[name])])
    return n, s3_files, evidence, counts, lock


def finish(r: tuple) -> dict:
    n, s3_files, evidence, counts, lock = r
    ops = {k: v for k, v in counts.items() if any(k == i and c == "op" for _, i, c in S3_RULES)}
    feats = {k: v for k, v in counts.items() if any(k == i and c == "behaviour" for _, i, c in S3_RULES)}
    config = {k: v for k, v in counts.items() if any(k == i and c == "config" for _, i, c in S3_RULES)}
    return {
        "files_scanned": n, "s3_files": s3_files, "uses_s3": bool(ops),
        "operations": ops, "features": feats, "config": config,
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
