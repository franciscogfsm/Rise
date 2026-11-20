# Scanner benchmark: 339 real repositories, 40 million lines

The RISE scanner (no AI) was run on **339 public GitHub repositories**, in two batches:
- **Batch 1 (185 repos)** has two parts:
  - **29 large, well-known projects:** Sentry, Discourse, Airflow, aws-cli, Superset, Ray, Nextcloud, Dagster, Mimir, SeaweedFS, Payload, Strapi, rclone, Loki, Supabase Storage and others.
  - **156 repos:** the most-starred S3 repositories in 10 languages.
- **Batch 2 (154 repos)** was searched later to find edge cases. It covers 17 languages:
  - Python, TypeScript, JavaScript, Go, Java, PHP, Ruby, C#, Rust, Kotlin, Scala, Swift, Dart, C++, Elixir, Clojure and Shell.
  - The searches covered MinIO, Cloudflare R2, presigned URLs, multipart uploads, backups and Laravel.
  - None of these repos had been seen before.

Measured on 20 Nov 2026, on one laptop, with the final scanner code. The raw data, every repository included, is in [results.json](results.json) (batch 1) and [results2.json](results2.json) (batch 2).

| | Batch 1 | Batch 2 | **Total** |
|---|---|---|---|
| Repositories read | 185 (3 more refused: archive over 200 MB) | 154 | **339** |
| Files · lines | 184,903 · 35,690,108 | 22,398 · 4,432,293 | **207,301 files · 40,122,401 lines** |
| Scan time | 64.7 s | 19.0 s | **83.7 s** |
| Repositories that use S3 | 128 | 95 | **223** |
| S3 calls read, each with `file:line` | 10,016 | 2,942 | **12,958** |
| Storage calls RISE has no test for, flagged with `file:line` | 4,834 | 2,117 | **6,951** |
| Official S3 API calls checked (see below) | 11,441 | 3,446 | **14,887** |
| Real S3 calls missed | 0 | 0 | **0** after review |

**Largest repositories:**

| Repository | Lines | Scan time |
|---|---|---|
| Sentry | 3.7 M | 4.2 s |
| Discourse | 2.7 M | 2.6 s |
| Airflow | 2.3 M | 3.3 s |
| aws-cli | 2.2 M | 4.8 s |

Scan times vary with the laptop's load. An earlier run of batch 1, with fewer languages, took 40 s.

## How "missed" is checked

The check does not use the scanner's own rules:
1. It takes **every operation of the official S3 API (116)** from AWS's own service model (botocore).
2. It looks for calls to them in every spelling (`PutObject`, `putObject`, `put_object`, `new PutObjectCommand`), in **every file**, including files the scanner did not mark as S3. Names that sit inside a quoted message, such as `"S3::putObject(): failed"`, are not calls and are skipped.
3. It found **14,887 such calls**. Each one must be either read by a scanner rule or flagged as untested.

**259 calls were left over (168 + 91). A person reviewed every one, and none is a real S3 call.** They share a name with an S3 operation:
- JDBC and Cassandra `getObject()`, and Windows Forms `resources.GetObject()`;
- `create_session()` in web, OAuth, Cassandra and the Anthropic SDK, plus immich's own session API;
- Kubernetes test fakes, Ray's state API, Metaflow metadata, and lakeFS's own garbage-collection helper;
- other storage APIs:
  - OpenStack Swift (Nextcloud, wal-e);
  - Backblaze B2's native API;
  - Storj;
  - Cloudflare R2 *Worker bindings* (not the S3 API);
  - the Azure and GCS backends of multi-cloud projects;
- the server side of S3-compatible servers.

The review drove the scanner's changes. Each real gap found on the way was fixed and turned into a test:

| Run | Leftovers | What changed |
|---|---|---|
| First run | 947 | Many were real gaps |
| Batch 1, earlier | 152 | 1 real: `get_provider_client(...)->get_object()` in wp-amazon-s3-and-cloudfront |
| Batch 2, first pass | 97 | 3 real: the .NET library Genbox SimpleS3 was not recognised, and a Swift app (bucketdrop) signs its S3 requests by hand with SigV4 and no SDK |

These are the fixes:
- **Batch 1 review:**
  - wrapper classes calling `self.put_object`;
  - clients built in another file or returned by a call;
  - Go's `PutObjectTagging`;
  - `doesObjectExistV2` and `listObjectsV2Paginator`;
  - the PHP static class `S3::`, boto 2 and the `rust-s3` crate;
  - method names quoted in error messages, which are no longer counted as calls.
- **Batch 2 review:**
  - Scala, Swift, Dart, C++ and Elixir are now read;
  - Genbox SimpleS3 and hand-signed SigV4 requests are now detected.

## Reproduce

```bash
pip install -r requirements.txt
python scripts/benchmark.py benchmark/repos.json  benchmark/results.json     # batch 1, ~3 GB download
python scripts/benchmark.py benchmark/repos2.json benchmark/results2.json    # batch 2
```

Scan times depend on the number of CPU cores and on the machine's load.

## Limits

- The check covers calls to S3 API operation names. Code that reaches S3 in another way is outside it. Examples are a hand-built HTTP request with no SigV4 signing code in the file, or Clojure's `(aws/invoke s3 {:op ...})`.
- Leftover calls were judged by a person, from the code line and its file.
- Counts are per line: a call split over several lines counts once.
