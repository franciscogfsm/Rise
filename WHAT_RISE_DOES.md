# RISE: what it does right now (pitch brief)

State on 20 Nov 2026, before the 15:00 code freeze. Everything here works today and was run for real. The numbers are measured, not estimated. Use this file to write the pitch; section 9 lists what **not** to claim.

---

## 1. In one line

**RISE proves a cloud migration before you move.** Paste a GitHub repo, pick the clouds, and in about 10 seconds you get one answer: *ready to migrate or not*, backed by real tests on the real clouds.

## 2. The problem

- In the Leaseweb Digital Independence Survey 2026 (800 senior leaders in the UK, US, DE and NL, published 4 Nov 2026):
  - **89%** could not move business-critical workloads off their largest provider within three weeks;
  - **79%** expect AI to increase their dependence on a few providers.
- "S3-compatible" does not mean identical: providers differ in regions, signing and features.
- Teams decide migrations on assumptions. RISE replaces them with **evidence**.

## 3. What the user does (3 questions)

1. **Which repository?** Public, or private with a read-only GitHub token (used once for the download, never stored).
2. **What do you want to do?** Optional, typed in your own words or picked with one click:
   - *Move to another cloud*
   - *Add a backup provider*
   - *Find lock-in and single points of failure*
   - *Pick the best provider*
3. **From which cloud to which?** One target, or up to **4 to compare**.

## 4. What RISE gives back

| Output | What it is |
|---|---|
| **The answer** | **Ready to migrate**, **Ready · 1 change**, **Partially verified**, **Not ready**, or **No object storage found**. Decided by code from the test results, **never by the AI**. |
| **The 1 change** | When one config change fixes everything, RISE shows the exact change (e.g. `region: us-east-1 → nl-ams-1`). |
| **AI briefing** | Plain words, in the user's language, for their goal, with 2–4 next steps. |
| **Risks** | Clickable `file:line` for each one (detail below). |
| **Every test** | Side by side on both clouds, with **real request IDs** and timings. |
| **Freedom Proof** | Downloadable JSON of everything executed, plus what was *not* tested, with a SHA-256 digest. |
| **Compare** | Up to 4 targets in parallel, ranked, with **Best fit: X**. |

The risks found in the code:
- a single provider with no fallback (single point of failure);
- regions or AWS endpoints written in the code;
- cloud keys in the code, shown redacted;
- provider-only features (SSE-KMS, Glacier, Object Lock…);
- public ACLs;
- no retries or timeouts;
- other cloud services the code depends on (SQS, DynamoDB, Lambda…), listed as lock-in.

## 5. How it works (the pipeline)

`Fetch → Scan → Risks + AI plan + AI briefing → Real tests → Adapt → Answer + Proof`

1. **Fetch.** The repo archive is read **in memory**. Nothing is written to disk and **no repo code is ever executed**.
2. **Scan** (no AI). It finds every S3 call and the behaviours each one relies on, with `file:line`.
   - **RISE Fast** is the discovery engine. It runs the deterministic scanner. An optional **1.3 KB local model** reviews ambiguous S3 calls in Python and JS/TS. It runs offline on the CPU and learns only from reviewed feedback. The verdict still comes from rules and real tests.
   - **15 languages, 24 SDK styles:** Python (boto3 client and resource, aioboto3, MinIO, pandas/s3fs), JS/TS (AWS SDK v2/v3, MinIO), Go (v1/v2, MinIO), Java (v1/v2), Kotlin, PHP (AWS SDK, Laravel), Ruby, C#, Rust, Scala, Swift (Soto), Dart, C++ (AWS SDK), Elixir (ExAws).
   - **Finds the client wherever it was made:** a file that never imports the SDK but calls `self.s3.put_object(...)` is still read.
   - **Safety net:** RISE knows all **116 operations of the official S3 API**. Any call to one it does not test (`restore_object`, `putObjectRetention`, `CreateBucket`...) is listed as *not tested* with `file:line`, and the answer can no longer be "Ready". Nothing is dropped silently.
   - **Fast:** each rule runs once over each file in C, on every CPU core; the result is byte-identical to one core (a test checks it).
3. **AI plan.** The LLM turns the code evidence into a test plan in **strict JSON schema**. RISE validates it: unknown tests are dropped, parameters are clamped, and anything the AI missed is added.
4. **Real tests.** **13 test kinds** run on the reference and the target **at the same time**, with synthetic data:
   - put/get, metadata, prefix listing, presigned URLs, range reads, unicode keys;
   - delete, copy, multipart, tagging, encryption, storage class, ACL.
   A test passes only if the **SHA-256 of the real bytes** matches. ETags are never used.
5. **Adapt.** On failure the AI may propose **one** change, only from an allow-list (`region`, `addressing_style`). RISE applies it and **retests everything**.
6. **Answer + Proof.**

## 6. Other features

- **`/rise` inside Claude Code (MCP).** A developer types `/rise move this app to Leaseweb` in their editor. Claude reads the folder they are working in through the RISE MCP server, RISE runs the real tests, and Claude answers in their language with the verdict, the exact edit in *their* file, the risks with `file:line` and the evidence link. `.env` files never leave the machine; cloud keys stay inside RISE. Measured: a local Python app gave **Ready · 1 change** (`region: us-east-1 → nl-ams-1`) with 5/5 behaviours verified.
- **Real clouds in one click.** *Connections → Add* has presets for **AWS S3, Leaseweb, Backblaze B2, Wasabi, Scaleway, Hetzner and Cloudflare R2**. You pick the region, and the endpoint is filled in along with where to create the keys.
- **Connection test.** It writes a probe, reads it back, compares SHA-256 and deletes it, showing a request ID per step. When it fails, it says why: wrong region, rejected key or missing bucket.
- **RISE agent** (`Ctrl K`). Ask *"can we migrate?"* and get the answer with the file to change. It can also:
  - start analyses and comparisons;
  - test one or all connections;
  - open the add-connection form or any page.
  Every action is validated before it runs.
- **Live switch** (`/demo`). The full migration runs on a live app, with traffic plotted every 300 ms:

  `CONNECT → DISCOVER → ANALYZE → CHALLENGE → ADAPT → VERIFY → SWITCH → CUT → PROVE`

  - Objects are copied and checked by SHA-256.
  - The switch is **refused until the evidence passes**.
  - The old cloud's network link is **cut** (TCP refused).
  - A brand-new object is then written and read on the new cloud.
- **Works without any cloud account.** Two simulated S3 providers (moto and Garage) start with RISE. They are always labelled *simulated*.
- **Works without the AI.** If OpenRouter is down or there is no key, RISE uses the last valid plan, labelled **CACHED**, or a rule-based one, labelled **RULES**. Analyses still finish with the right answer.

## 7. Proof points (measured today)

| What | Result |
|---|---|
| **Real AWS** (eu-north-1, Stockholm) → target, repo `ucapistranmtz/s3PresignedUrl_v3` | **Ready to migrate · 1 change** in **12.4 s**, real AWS request IDs, SHA-256 verified on AWS |
| 10-file TypeScript repo, URL to proof | **11.3 s** (fetch 1.2 s, scan 22 ms, AI plan 9.0 s, 8 real tests 1.1 s) |
| Simple repo | about **6 s** |
| 3-provider comparison | about **16 s**, in parallel |
| Live switch (Docker) | **284 requests, 0 failed**, source cut, new object SHA-256 match |
| Fresh clone, no AI key, empty volume | **Ready · 1 change** (RULES), live switch completes with 0 failed requests |
| **Scanner benchmark** | **339 real GitHub repos** (Sentry, Discourse, Airflow, aws-cli, Superset, Ray, Nextcloud, rclone, SeaweedFS… + 310 S3 repos in 17 languages): **40,122,401 lines in 83.7 s**, 12,958 S3 calls found with `file:line`, 6,951 untested storage calls flagged |
| **Scanner accuracy** | Independent check: every call to the 116 official S3 API operations (from AWS's own model), in every file: 14,887 calls. The 259 the scanner did not read were reviewed by hand: none is S3 (JDBC `getObject`, web `create_session`, Azure/GCS/Swift/B2 backends). Every real gap found on the way (4 calls in 3 repos) was fixed and is a test. **0 real S3 calls missed.** Data in `benchmark/` |
| **RISE Fast vs OpenAI Codex** | On 26 public repos new to our benchmark (10,465 lines), with no scanner changes during the trial: the scanner found **41/42** S3 call sites in **79 ms**, and Codex found **42/42** in **20.05 s** (~250× slower). With the 1.3 KB local model, RISE found the same 41 in 118 ms. One reviewer built the reference. Data in `benchmark/scanner-fresh-vs-codex.json` |
| Biggest single repos | Sentry **3.7 M lines in 1.3 s** · Discourse 2.7 M in 2.3 s · Airflow 2.3 M in 3.1 s · aws-cli 2.2 M in 2.9 s |
| Automated tests | **119 passing**, including an end-to-end journey on two real S3 servers, the real link cut, and a 19-SDK accuracy corpus |

## 8. Why it is different (map to the judging criteria)

| Criterion | What to say |
|---|---|
| **Innovation** | Not a migration tool, not a checklist: an **evidence engine**. It turns *"we think we can move"* into *"here is the proof"* in seconds. |
| **Applicability** | Any repo, any S3-compatible cloud, Leaseweb included, with **one Docker command** and no account. It answers the 89% problem directly. |
| **Technical complexity** | A static scan across 15 languages, benchmarked on 339 real repos (40 M lines in 84 s, 0 real S3 calls missed), AI with strict JSON schema + validation + fallbacks, 13 real test kinds in parallel on 2–5 clouds, constrained auto-adaptation, encrypted keys (Fernet), a live traffic switch with a real network cut, CI that tests and deploys on push. |
| **Use of AI** | Two layers: an AI coding agent (Claude, via MCP) asks RISE for **proof**, and inside RISE the AI **plans and explains**; deterministic code **runs and decides**. It never runs a shell, never sees secrets, never owns the switch. That makes the AI safe to trust. |
| **Use of cloud infra** | Real calls on real clouds (AWS proven), with presets for 7 providers. It ships as a self-contained Docker image with a health check and one-click free deploy (Render) or a VM auto-deploy. |
| **Presentation** | One answer in big type, then the evidence. Every number on screen comes from a real event. |

**Tagline:** *Built to rise when clouds fall.*

**Line for the scanner:** *"Don't trust our words, trust our results. We ran the scanner on 339 real repositories, including Sentry, Airflow and aws-cli: 40 million lines in under 90 seconds. We checked every call against the official S3 API: zero real calls missed. The data is in the repo."*

## 9. Honest limits (do not over-claim)

- It covers **one category: S3 object storage**. Other services (queues, databases, functions) are **listed as lock-in, not tested**.
- "Ready" means the observed storage operations work on the target. It does **not** certify the whole application.
- The scanner and risk rules are pattern-based. The scanner's "0 missed" covers calls to the official S3 API operation names on 339 repos; code that reaches S3 with a hand-built HTTP request is outside that check. Each finding shows its evidence.
- The benchmark timings are from one laptop (16 worker processes) and exclude download time.
- The local providers are **simulated** (moto, Garage). Never call them Leaseweb or AWS.
- The demo incompatibility (signing region) was **prepared on purpose**. It is not a fault of Leaseweb or any vendor.
- The cut only blocks the local simulated link, never a real cloud account.
- Of the real clouds, only **AWS** was tested live today. The other presets use each provider's published endpoint format.

## 10. Suggested demo flow (about 3 minutes)

1. **Home.** Paste the repo, pick the goal *"Move to another cloud"*, From **AWS S3 · Stockholm** (real), To the target(s), then **Run analysis**.
2. **The answer** appears big: *Ready · 1 change*. Show the change, a risk with `file:line`, and a real AWS request ID.
3. **Compare.** Show **Best fit**.
4. **`/demo`.** Press *Start traffic*, run the steps, and stop on **CUT**: the old cloud is gone and the traffic graph keeps flowing on the new one. Then **PROVE**.
5. **Optional, 30 s:** in VS Code, type `/rise move this app to Leaseweb` and show Claude answering with the exact edit.
6. **Close** with the Freedom Proof download and the line: *"From 'we think' to 'here is the proof' in 10 seconds."*

## 11. How the judges can try it

```bash
git clone https://github.com/franciscogfsm/Rise.git && cd Rise && docker compose up --build
# → http://localhost:8080
```

No key or cloud account is needed. The full guide is [docs/GUIDE.md](docs/GUIDE.md). License: Apache-2.0.
