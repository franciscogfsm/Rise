# Scanner benchmark: 185 real repositories, 35 million lines

The RISE scanner (no AI) was run on **185 public GitHub repositories**:
- **156 of them** are the most-starred S3 repositories in 10 languages.
- **29 of them** are large, well-known projects: Sentry, Discourse, Airflow, aws-cli, Superset, Ray, Nextcloud, Dagster, Mimir, SeaweedFS, Payload, Strapi, rclone, Loki, Supabase Storage and others.

Measured on 20 Nov 2026, on one laptop. The raw data, every repository included, is in [results.json](results.json).

| | |
|---|---|
| Repositories read | **185** (3 more were refused: archive over RISE's 200 MB limit) |
| Files · lines | **182,771 files · 35,252,281 lines** |
| Scan time, all 185 together | **40.4 s** (about 870,000 lines per second) |
| Largest repositories | Sentry 3.7 M lines in 1.3 s · Discourse 2.7 M in 2.3 s · Airflow 2.3 M in 3.1 s · aws-cli 2.2 M in 2.9 s |
| S3 calls read, each with `file:line` | **10,444** in 126 repositories |
| Storage calls RISE has no test for, flagged with `file:line` | **4,604** (bucket admin, object lock, retention…) |
| Real S3 calls missed | **0** after review (see below) |

## How "missed" is checked

The check does not use the scanner's own rules:
1. It takes **every operation of the official S3 API (116)** from AWS's own service model, botocore.
2. It looks for calls to them in every spelling (`PutObject`, `putObject`, `put_object`, `new PutObjectCommand`), in **every file**, including files the scanner did not mark as S3.
3. It found **11,422 such calls**. Each one must be either read by a scanner rule or flagged as untested.

**152 calls were left over. A person reviewed every one:**
- **151 are not S3. They share a name with an S3 operation:**
  - JDBC `rs.getObject()` and Windows Forms `resources.GetObject()`;
  - `create_session()` for web, OAuth, Cassandra and the Anthropic SDK;
  - Kubernetes test fakes and Metaflow metadata;
  - OpenStack Swift in Nextcloud, plus the Azure and GCS backends of multi-cloud projects;
  - one docstring.

  The scanner was right to skip them.
- **1 was a real S3 call** in `deliciousbrains/wp-amazon-s3-and-cloudfront`: `get_provider_client(...)->get_object($args)`. The client came back from a method call. It is now read correctly and is a regression test (`tests/test_scan_corpus.py`).

The review drove the scanner's changes. The first run had 947 leftovers, many of them real gaps. Each gap was fixed and turned into a test:
- wrapper classes calling `self.put_object`;
- clients built in another file;
- Go's `PutObjectTagging`;
- `doesObjectExistV2`;
- `listObjectsV2Paginator`;
- the PHP static class `S3::`, boto 2 and the `rust-s3` crate.

## Reproduce

```bash
pip install -r requirements.txt
python scripts/benchmark.py            # reads benchmark/repos.json, writes benchmark/results.json
```

The run downloads about 3 GB from GitHub, so it takes around 15 minutes. Scan times depend on the number of CPU cores.

## Limits

- The check covers calls to S3 API operation names. Code that reaches S3 in another way (for example a raw HTTP request to a hand-built URL) is outside it.
- Leftover calls were judged by a person, from the code line and its file.
- Counts are per line: a call split over several lines counts once.
