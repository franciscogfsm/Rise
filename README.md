<p align="center">
  <img src="docs/icon.svg" width="112" alt="RISE">
</p>

<h1 align="center">RISE</h1>

<p align="center"><b>The Proof of Cloud Freedom. Prove your cloud migration before you move.</b></p>

<p align="center">
Paste a GitHub repository. RISE finds every object-storage call in the code, has an AI plan the tests, runs them for real on the clouds you pick, and gives you one answer: <b>ready to migrate, or not</b>, with the evidence.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-0A8A74" alt="license Apache-2.0">
  <img src="https://img.shields.io/badge/python-3.12-2563EB" alt="python 3.12">
  <img src="https://img.shields.io/badge/tests-119%20passing-0A8A74" alt="119 tests passing">
  <img src="https://img.shields.io/badge/storage-any%20S3--compatible-121F35" alt="any S3-compatible storage">
  <img src="https://img.shields.io/badge/AI-OpenRouter%20%C2%B7%20strict%20JSON-7C5CFF" alt="AI: OpenRouter, strict JSON">
  <img src="https://img.shields.io/badge/InfraHack-Portugal%202026-D4513B" alt="InfraHack Portugal 2026">
</p>

<p align="center">
  <a href="#quick-start"><b>Quick start</b></a> ·
  <a href="docs/GUIDE.md"><b>Full guide</b></a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#deploy">Deploy</a> ·
  <a href="#security">Security</a> ·
  <a href="#honest-limits">Limits</a>
</p>

<p align="center">
  <img src="docs/cover.png" alt="RISE: prove your cloud migration before you move" width="100%">
</p>

---

## Why

In the Leaseweb Digital Independence Survey 2026 (800 senior leaders in the UK, US, DE and NL, published 4 Nov 2026):

| | |
|---|---|
| **89%** | could not move business-critical workloads off their largest provider within three weeks |
| **79%** | expect AI to increase their dependence on a few providers |

These are survey answers, not measured migrations. Even "S3-compatible" providers differ in behaviour and configuration. Teams need **evidence**, not assumptions. RISE produces it in seconds.

## Three questions, one answer

<p align="center"><img src="docs/screen-home.png" alt="Three questions: repository, goal, from and to" width="100%"></p>

1. **Which repository?** Public, or private with a read-only GitHub token (used once for the download, never stored).
2. **What do you want to do?** Optional, in your own words or with one click: *move to another cloud*, *add a backup provider*, *find lock-in and single points of failure*, *pick the best provider*.
3. **From which provider to which?** Pick one target, or up to four to **compare** them.

<p align="center"><img src="docs/screen-analysis.png" alt="The answer: Ready to migrate, with the AI briefing and risks" width="100%"></p>

The answer comes first: **Ready to migrate**, **Ready · 1 change**, **Partially verified** or **Not ready**. It is decided by code from the real test results, never by the AI. Below it:

- **What RISE sees:** an AI briefing in plain words, in your language, with the next 2–4 steps.
- **Risks** with a clickable `file:line`: single point of failure, region or AWS addresses written in the code, cloud keys in the code (redacted), provider-only features (SSE-KMS, Glacier, Object Lock…), public ACLs, no timeouts or retries, other cloud services (SQS, DynamoDB, Lambda…).
- **Every test** on both providers, side by side, with request IDs and timings.
- **The Freedom Proof:** a downloadable JSON report with a SHA-256 digest.

<p align="center"><img src="docs/screen-compare.png" alt="Compare providers: best fit first" width="100%"></p>

**Compare** runs the same code and the same tests on every target **in parallel** and ranks them by answer, verified behaviours, then speed: **Best fit: X**.

## Features

| Feature | What it does |
|---|---|
| **Code scan** | Finds every S3 call site and behaviour in Python (boto3, aioboto3, MinIO, s3fs/pandas), JavaScript/TypeScript (AWS SDK v2/v3, MinIO), Go, Java, Kotlin, Scala, PHP (AWS SDK, Laravel), Ruby, C#, Rust, Swift, Dart, C++ and Elixir, including hand-signed SigV4 requests: metadata, ranges, presigned URLs, multipart, tags, SSE, ACLs, storage classes, the signing region. Each finding links to `file:line`. Any call to one of the **116 official S3 API operations** that RISE does not test is listed as *not tested*, never dropped. **Benchmarked on 339 real repositories, 40 M lines, in 84 s: 0 real S3 calls missed** ([benchmark/](benchmark/README.md)). |
| **AI test plan** | An LLM turns the code evidence into a test plan in **strict JSON schema**. RISE validates it, drops unknown tests, clamps parameters and adds anything the AI missed. |
| **Real tests** | 13 test kinds run against the reference and the target **at the same time**, with synthetic data. A test passes only if checks on the **real bytes** pass (SHA-256, never ETags). |
| **Auto-adapt** | When something fails, the AI may propose **one** change from an allow-list (`region`, `addressing_style`). RISE applies it and retests everything. |
| **Risk radar** | Deterministic rules find architecture risks, single points of failure included, with `file:line` evidence. The AI explains them; it never invents them. |
| **Compare clouds** | Up to 4 targets in parallel, ranked, with the exact change each one needs. |
| **Private repos** | A read-only GitHub token, used for the download only: never stored, logged or sent to the AI. |
| **Any S3 provider** | Add Leaseweb Object Storage, AWS S3, MinIO… from the UI. Keys are encrypted at rest. **Test** makes real calls and explains failures (wrong region, rejected key, missing bucket). |
| **RISE agent** (`Ctrl K`) | Ask "can we migrate?" and get the answer with the file to change. It can also start analyses and comparisons, test connections and open pages. |
| **`/rise` in Claude Code** | An MCP server: type `/rise move this app to Leaseweb` and Claude sends the folder you are working in to RISE, gets the answer from real tests, and shows the exact edit in your code. `.env` files never leave your machine. |
| **Live switch** | The full journey on a running app: discover → test → adapt → copy and verify → switch → cut the old cloud → prove a new write works. |

## How it works

```mermaid
flowchart LR
  A[GitHub repo] --> B[Fetch<br/>in memory]
  B --> C[Scan<br/>file:line]
  C --> D[Risks]
  C --> E[AI plan<br/>strict JSON]
  D --> F[AI briefing]
  E --> G[Real tests<br/>reference + target]
  G --> H{All pass?}
  H -- no --> I[AI proposes 1 fix<br/>from allow-list] --> G
  H -- yes --> J[Answer + Freedom Proof]
  F --> J
```

| Stage | What really happens |
|---|---|
| **Fetch** | The repository archive is downloaded into memory. Only text source files are read. Nothing is written to disk or executed. |
| **Scan** | Deterministic rules, no AI. Every call site and behaviour, plus the other cloud services the code depends on. |
| **AI plan + briefing** | Two AI calls run in parallel: the test plan, and a plain-words briefing for your goal. If the AI is down: the last valid plan, labelled **CACHED**, or a rule-based one, labelled **RULES**. |
| **Real tests** | The plan runs on both providers in a thread pool, using the region the code actually signs with. |
| **Adapt** | At most one allowed config change per failure, then a full retest. |
| **Report** | The answer, a portability score, failures, unsupported features, **untested** items, lock-in, and the proof (`/api/analyses/{id}/proof`). |

**Scanner benchmark.** 339 public repositories (Sentry, Discourse, Airflow, aws-cli, Superset, Ray, Nextcloud, rclone… plus 310 S3 repositories in 17 languages): **40,122,401 lines read in 83.7 s**, 12,958 S3 calls found with `file:line`. An independent check of 14,887 calls against all 116 operations of the official S3 API found **0 real calls missed**. Data, method and how to reproduce: [benchmark/README.md](benchmark/README.md). All numbers, and RISE against Claude: [benchmark/STATS.md](benchmark/STATS.md).

**Speed.** A 10-file TypeScript repository took **11.3 s** from URL to proof (fetch 1.2 s, scan 22 ms, AI plan 9.0 s, 8 real S3 tests 1.1 s). Simple repositories finish in about **6 s**. A three-provider comparison took about **16 s**.

### RISE Fast

**RISE Fast** is the discovery engine behind RISE. It combines the deterministic scanner with an optional, experimental **1.3 KB local classifier** that ranks ambiguous S3 call sites in Python and JavaScript/TypeScript. It runs on CPU, works offline on a checked-out folder, and returns a score with each file and line. The optional source check narrows suggestions to recognizable code structures, such as a client binding or a paginator used later in the file. The main scan and migration verdict use deterministic rules and real provider tests.

To review a local repository, use the shipped weights and keep a separate copy if you want to train on your own feedback.

`python scripts/s3_model.py benchmark/s3-model-weights.json path/to/repo --min-score 0.8 --corroborated`

To update local weights, add `--feedback path/to/review.json` to a run with your model copy. The feedback file is a JSON list of reviewed locations such as `{"file":"src/storage.py","line":42,"is_s3":true}`. Only reviewed labels update the weights. Repository source stays local in this workflow.

The scale experiment scanned **63 public repositories and 8.56 million lines** to collect candidates. On five reviewed repositories, the smaller model with source checks increased coverage from **14/22 to 19/22** without adding alerts outside the reference. Those repositories informed the source checks. On two additional reviewed repositories, it matched the scanner at **13/14**. The larger training run did not beat the smaller model on that five-repository comparison. [Training and evaluation details](benchmark/s3-model-scale-experiment.json)

### Same-source comparison

We compared the scanner with Claude Sonnet 5.5 and OpenAI Codex on **25 selected public files from 13 repositories** and **83 manually annotated call sites**.

| System | Reference sites found | Alerts outside reference | Time |
|---|---:|---:|---:|
| RISE scanner | **83/83** | **0** | **0.13 s** |
| Claude Sonnet 5.5 | 80/83 | 7 | 19.30 s |
| OpenAI Codex (`gpt-6.2-sol`) | **83/83** | 1 | 20.00 s |

The files were used to improve the scanner, so this is a regression comparison. RISE time is the median of nine local runs. Claude and Codex each received the same numbered source once. The times exclude downloading the repositories and include the respective analysis and output steps. This measures static discovery, separate from executing provider tests. [Reference locations, timings and method](benchmark/scanner-head-to-head.json)


On a subsequent **fresh set of 26 public repositories absent from our prior benchmark manifests**, the unchanged RISE scanner found **41/42** annotated S3 call sites with one alert outside the reference. OpenAI Codex found **42/42** with no extra alerts. The two batches took about **79 ms** of local RISE scan time and **20.1 s** combined wall time for Codex. The local ML option found the same sites in this trial. This comparison used a single-reviewer reference and applies only to the eligible source files. [Fresh corpus, pinned commits, model and scoring](benchmark/scanner-fresh-vs-codex.json)

A separate check of the final scanner on **33 complete public snapshots** covered **75,915 lines in 1.50 s**. All 442 locations flagged by the official API-name heuristic were accounted for. This check measures coverage of the heuristic. [Full-repository regression](benchmark/scanner-cached-regression.json)

### The live switch (`/demo`)

`CONNECT → DISCOVER → ANALYZE → CHALLENGE → ADAPT → VERIFY → SWITCH → CUT → PROVE`

RISE instruments a running app (`asset-service`) and records each real S3 call. It tests the destination, applies one fix, copies the objects and checks the **SHA-256 of the bytes**. Then it switches the app's storage route, which is refused until the evidence passes. It closes the network link to the old provider (TCP refused, reversible). Finally, the app writes and reads a brand-new object on the new one. A request every 300 ms is plotted live by provider and latency, so the audience sees the switch happen. In our runs the failures after the switch were **0**.

<p align="center"><img src="docs/screen-demo.png" alt="The live switch" width="100%"></p>

## Quick start

### Try it in one command

You only need [Docker](https://docs.docker.com/get-docker/), on Windows, macOS or Linux. No cloud account and no key are needed.

```bash
git clone https://github.com/franciscogfsm/Rise.git && cd Rise && docker compose up --build
```

When the log says `Uvicorn running`, open **http://localhost:8080**. The first build takes about 2–3 minutes.

**What to try:**

1. **Analyze a repo.** Paste `https://github.com/ucapistranmtz/s3PresignedUrl_v3` and keep *From* **moto S3 · local** and *To* **Garage S3 · local**. Press **Run analysis**: in about 10 s you get the answer, the risks with `file:line`, and every test side by side.
2. **Compare.** Pick more than one target (*Compare N providers*) to get a ranking with **Best fit**.
3. **Live switch.** Open **http://localhost:8080/demo**, press **Start traffic**, then press the next-step button (*Observe the app →*, *Generate tests with AI →* … *Prove a new operation →*) until the end. You see the app move to the new provider while its traffic keeps flowing.
4. **Ask.** Press `Ctrl K` and ask *"can we migrate?"*.
5. **Your own cloud (optional).** Go to *Connections → + Add* and pick a preset (AWS S3, Leaseweb, Backblaze B2…).

The container runs RISE plus two **simulated** S3 providers (moto and Garage), so everything works offline from any cloud. The tests are real either way.

Without an AI key, the AI parts use rule-based fallbacks, labelled **RULES**. For the live AI, add an [OpenRouter](https://openrouter.ai) key:

```bash
OPENROUTER_API_KEY=sk-or-... docker compose up --build
```

Stop with `Ctrl C`, or `docker compose down`. Analyses and connections are kept in a Docker volume.

### Linux or WSL, without Docker

```bash
bash scripts/setup.sh    # Python venv, Garage binary, .env with generated local keys
nano .env                # add OPENROUTER_API_KEY
bash scripts/run.sh      # simulated providers + RISE on 127.0.0.1:8080
```

Stop the providers with `bash scripts/stop.sh`. Run the tests (two real S3 servers in-process, plus the real link cut) with `~/.venvs/rise/bin/python -m pytest -q`.

### Use it from Claude Code (`/rise`)

With RISE running (`docker compose up`), open Claude Code **in this repo** and type:

```
/rise move this app to Leaseweb
```

The repo ships [.mcp.json](.mcp.json) and [.claude/commands/rise.md](.claude/commands/rise.md), so Claude Code finds the MCP server on its own (approve it once). For **any other project**, register it once:

```bash
claude mcp add rise -- python /path/to/Rise/rise/mcp.py
```

Then copy `.claude/commands/rise.md` into that project, or just ask Claude: *"use rise_check on this folder, can we move to Leaseweb?"*. The MCP server uses only the Python standard library. It reads the folder, skips `.env` files, `node_modules` and binaries, and sends the source to RISE at `RISE_URL` (default `http://127.0.0.1:8080`; `RISE_PASSWORD` too if you set one). It returns the answer, the 1 change, the risks with `file:line` and a link to the full evidence.

### Use your real clouds

Open **Connections → Add**, enter the endpoint, region, bucket and keys (for AWS S3, leave the endpoint empty), then press **Test**. RISE writes a probe object, reads it back, compares SHA-256 and deletes it. Each step shows its request ID. Use a **dedicated test bucket** and a key limited to it, never production.

<p align="center"><img src="docs/screen-connect.png" alt="Connections with a real connection test" width="100%"></p>

## Deploy

| Where | How |
|---|---|
| **Free, auto-updating** | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/franciscogfsm/Rise)<br>Render builds the Dockerfile from [`render.yaml`](render.yaml) and redeploys on every push. You must set `RISE_PASSWORD`. Step by step: [docs/GUIDE.md](docs/GUIDE.md#10-deploy-for-free-render). |
| **Any Docker host** | `docker compose up -d --build`. The port is bound to `127.0.0.1` by default. |
| **A VM, private** | `bash scripts/setup.sh && bash scripts/run.sh`, then from your laptop `ssh -L 8080:127.0.0.1:8080 <vm>`. |
| **Public URL** | Set `RISE_PASSWORD` (HTTP basic auth on every route, any user name), then `RISE_BIND=0.0.0.0` in `.env`. Ideally behind HTTPS. |
| **Auto-deploy** | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): every push to `main` runs the tests, then SSHes into the VM, pulls and runs `docker compose up -d --build`, and checks `/healthz`. Needs the secrets `VM_HOST`, `VM_USER`, `VM_SSH_KEY`. |

The image is self-contained (Python 3.12 slim, moto, Garage) and has a health check on `/healthz` (the only route open without the password). No secret is baked in: `OPENROUTER_API_KEY` and `RISE_PASSWORD` come from the environment.

## Security

- **Keys never reach the browser or the AI.** Connection keys are encrypted at rest (Fernet: AES-128-CBC + HMAC-SHA256) with a master key from `RISE_MASTER_KEY` or an owner-only file. Key-like strings are redacted before any text goes to the AI.
- **The AI never acts on its own.** It returns validated JSON; deterministic code runs every test and decides the answer. It never runs a shell, never touches storage or secrets, and never decides the switch.
- **Repository code is never executed.** It is read in memory as text.
- **GitHub tokens** are used for one download and then dropped.
- **Simulated providers are labelled simulated.** The demo incompatibility is a real signing-region mismatch that we prepared on purpose. It is not a fault of any vendor.

## Structure

```
rise/
  server.py     FastAPI: UI, /api/*, optional password, /app/assets/*
  analysis.py   the pipeline: fetch → scan → risks + AI → tests → adapt → answer
  repo.py       GitHub archive fetch, in memory (private repos with a token), or a local folder from mcp.py
  mcp.py        MCP server for Claude Code: /rise checks the folder you are working in (stdlib only)
  scan.py       static scan: S3 call sites, behaviours, other-cloud lock-in
  risks.py      architecture risks with file:line
  ai.py         OpenRouter: plan, adaptation, briefing (schema + validation + fallbacks)
  engine.py     13 test kinds + deterministic executor
  connect.py    connections: built-in + user-added (encrypted), real connection test
  agent.py      RISE agent: one LLM call per message, validated actions
  journey.py    the live switch and its Freedom Proof
  storage.py    instrumented boto3 client, hashes, error evidence
  workload.py   asset-service, the app under test, and its storage router
  link.py       reversible TCP link to the source (the "cut")
  config.py     settings from the environment
web/            React 18 + htm, no build step, works offline (Light Liquid Glass design)
scripts/        setup · env · providers · run · stop · benchmark
benchmark/      scanner benchmark: 339 real repos, 40 M lines, every leftover call reviewed
tests/          119 tests: end-to-end journey on two real S3 servers, scanner accuracy corpus (24 SDK styles), risks, connections, agent, auth
```

**API:** `POST /api/analyses` · `GET /api/analyses/{id}` · `GET /api/analyses/{id}/proof` · `GET|POST|DELETE /api/connections` · `POST /api/connections/{id}/test` · `POST /api/agent` · `GET /api/events` (SSE)

## Honest limits

- RISE covers one category, **S3 object storage**, with 13 test kinds. Other services are listed as lock-in, not tested. Anything it did not test is listed as **untested** in the proof.
- Passing shows only that the observed operations work. It does not certify the whole application.
- The scanner and risk rules are pattern-based. The scanner was checked on 339 real repositories against the official S3 API (see [benchmark/](benchmark/README.md)), but code that reaches S3 without an S3 API call (a hand-built HTTP request) is outside that check. Every finding shows its evidence so you can check.
- The cut blocks only the simulated source link. It never touches a real cloud account.

## License

[Apache-2.0](LICENSE). Built in one day at **InfraHack Portugal 2026** (Leaseweb × Velv). *Built to rise when clouds fall.*
