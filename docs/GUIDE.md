# RISE: the complete guide

This guide explains exactly how RISE works, how to run it, and how to put it online for free with automatic updates on every push. For the short version, see the [README](../README.md).

- [1. What RISE does](#1-what-rise-does)
- [2. What runs where](#2-what-runs-where)
- [3. An analysis, step by step](#3-an-analysis-step-by-step)
- [4. How the answer is decided](#4-how-the-answer-is-decided)
- [5. The 13 tests](#5-the-13-tests)
- [6. Connections to real clouds](#6-connections-to-real-clouds)
- [7. The live switch](#7-the-live-switch)
- [8. Where the AI is used, and where it is not](#8-where-the-ai-is-used-and-where-it-is-not)
- [9. Run it locally](#9-run-it-locally)
- [10. Deploy for free (Render)](#10-deploy-for-free-render)
- [11. Deploy on your own VM, updated on every push](#11-deploy-on-your-own-vm-updated-on-every-push)
- [12. Configuration reference](#12-configuration-reference)
- [13. Troubleshooting](#13-troubleshooting)

---

## 1. What RISE does

You give RISE a GitHub repository and pick two or more object-storage providers. RISE then answers one question: **if this code moved to the target cloud, would its storage keep working?**

It does not guess. It reads the code to see which storage operations the app really uses. Then it runs those operations against both clouds and compares the real results. The answer is one of:

| Answer | Meaning |
|---|---|
| **Ready to migrate** | Every storage behaviour the code uses passed on the target. |
| **Ready to migrate · 1 change** | One behaviour failed at first. One allowed config change (for example the signing region) fixed it, and a full retest passed. The change is shown. |
| **Partially verified** | Everything RISE tested passed, but the code uses something RISE cannot test yet. It is listed as *untested*. |
| **Not ready to migrate** | At least one behaviour fails or is unsupported on the target, even after the allowed fix. |
| **No object storage found** | The code makes no S3 calls RISE recognises. |

## 2. What runs where

```
Browser (React 18 + htm, no build)
   │  HTTP + Server-Sent Events (live progress)
   ▼
RISE server (Python 3.12, FastAPI)  ── rise/server.py
   ├─ analysis pipeline          rise/analysis.py
   ├─ code fetch + scan + risks  rise/repo.py · scan.py · risks.py
   ├─ AI (OpenRouter)            rise/ai.py · agent.py
   ├─ test engine (boto3)        rise/engine.py · storage.py
   ├─ connections (encrypted)    rise/connect.py
   └─ live switch demo           rise/journey.py · workload.py · link.py
   │
   ├──► moto S3 · local     (simulated source, 127.0.0.1:9001, us-east-1)
   ├──► Garage S3 · local   (simulated destination, 127.0.0.1:3900)
   └──► your real clouds    (AWS S3, Leaseweb, Backblaze B2, Wasabi, … over HTTPS)
```

- The two **local providers** start with RISE (`scripts/providers.sh`). The whole product works with no cloud account. They are always labelled **simulated** in the UI.
- **Real clouds** are added by you in *Connections*. Each request to them carries a real request ID, which RISE shows as evidence.
- **State**: analyses, encrypted connections and the AI cache live in `.rise/` (in Docker: the volume `/app/.rise`).

## 3. An analysis, step by step

Everything below is real, and each stage is streamed live to the browser.

1. **Fetch.** RISE downloads the repository archive from GitHub **into memory**. Limits: 200 MB archive, 50,000 files, 400 KB per file, text source only. Nothing is written to disk and **no repository code is ever executed**. For a private repo you give a read-only token. It is used for this one download and then dropped: never stored, logged or sent to the AI.
2. **Scan** (no AI), by **RISE Fast**. Deterministic rules find every S3 call site with its `file:line`. They cover boto3, AWS SDK JS v2/v3, Go, Java and PHP. The scan records the behaviours each call relies on: metadata, ranges, presigned URLs, multipart, tags, encryption, ACLs, storage classes, and the region the client signs with. It also lists other cloud services the code depends on (SQS, DynamoDB, Lambda…) as lock-in.
3. **Risks** (no AI). Rules flag architecture risks, each with `file:line` evidence:
   - a single provider with no fallback (single point of failure);
   - regions or AWS endpoints written in the code;
   - cloud keys in the code (shown redacted);
   - public ACLs and provider-only features;
   - no retries or timeouts.
4. **AI plan + AI briefing**, in parallel.
   - The **plan** turns the scan into a list of tests, as strict JSON. RISE validates it: unknown tests are dropped, parameters are clamped, and anything the AI missed is added by rules.
   - The **briefing** explains the situation in plain words, in your language, for your stated goal, with 2–4 next steps.
5. **Real tests.** The plan runs on the **reference** and the **target** at the same time (thread pool). It uses synthetic data and the region the code actually signs with. A test passes only if checks on the **real bytes** pass (SHA-256), never on ETags. Each result records request IDs and timings. Test objects are deleted afterwards.
6. **Adapt.** If something failed, the AI may propose **one** change, and only from an allow-list: `region` or `addressing_style`. RISE validates the value, applies it and **retests everything**.
7. **Report.** It contains the answer, a portability score, the failures, unsupported and untested items, and the lock-in. It also produces the **Freedom Proof**, a downloadable JSON with everything above plus a SHA-256 digest (`GET /api/analyses/{id}/proof`).

**Compare** runs steps 5–7 for up to 4 targets in parallel. It ranks them by answer, then verified behaviours, then speed, and names the **Best fit**.

## 4. How the answer is decided

Code decides the answer, never the AI. From [`rise/analysis.py`](../rise/analysis.py):

1. Each behaviour found in the code is mapped to the tests that cover it.
2. A behaviour is **pass** only if every covering test passed on the target. It is **unsupported** if the target refused the operation, **fail** otherwise, and **untested** if no test covers it.
3. If any behaviour is *fail* or *unsupported* → **Not ready** (an adaptation that did not fully fix it counts as not ready too). If some are untested → **Partially verified**. If the adaptation fixed everything → **Ready · 1 change**. Otherwise → **Ready**.

## 5. The 13 tests

| Test | What it proves |
|---|---|
| `put_get_roundtrip` | Write then read returns the same bytes (SHA-256) and content-type |
| `head_metadata` | User metadata survives |
| `list_prefix` | Prefix listing works with hierarchical keys |
| `presigned_get` | A presigned URL downloads the right bytes |
| `range_get` | Range reads return the right slice |
| `unicode_key` | Non-ASCII keys round-trip |
| `delete_object` | Delete really removes the object |
| `copy_object` | Server-side copy keeps the bytes |
| `multipart_upload` | Multipart upload assembles correctly |
| `object_tagging` | Tags are stored and returned |
| `server_side_encryption` | SSE is accepted and data still reads back |
| `storage_class` | The storage class the code asks for is accepted |
| `acl` | The ACL the code sets is accepted |

## 6. Connections to real clouds

Go to *Connections → + Add connection* and click a preset: **AWS S3, Leaseweb, Backblaze B2, Wasabi, Scaleway, Hetzner, Cloudflare R2**. Then pick a region. The name, endpoint and region are filled in, and the preset shows where to create keys at that provider. You add the access key, secret key and bucket.

- **Test** makes real calls: it writes a probe object, reads it back, compares SHA-256 and deletes it. Each step shows its request ID. If something fails, it explains why (wrong region, rejected key, missing bucket).
- **Keys are encrypted at rest** with Fernet (AES-128-CBC + HMAC-SHA256). The master key comes from `RISE_MASTER_KEY` or an owner-only file `.rise/master.key`. Keys never reach the browser or the AI.
- Use a **dedicated test bucket** and a key limited to that bucket. Never use production.
- A connection whose endpoint is `localhost`/`127.0.0.1` is labelled simulated.

## 7. The live switch

Open `/demo`. RISE runs a small app, `asset-service`, that stores files in the simulated source. It sends a request every 300 ms and plots each one by provider and latency. Then it goes through:

`CONNECT → DISCOVER → ANALYZE → CHALLENGE → ADAPT → VERIFY → SWITCH → CUT → PROVE`

1. It records the app's real S3 calls.
2. It tests the destination and applies one allowed fix.
3. It copies the objects and checks the SHA-256 of every one.
4. It switches the app's storage route. The switch is **refused** until the evidence passes.
5. It **cuts** the network link to the old provider (the TCP connection is refused, and the cut is reversible).
6. The app writes and reads a brand-new object on the new provider.

The demo incompatibility (a signing-region mismatch) was prepared on purpose and is not a fault of any vendor. The cut only affects the local simulated link, never a real account.

## 8. Where the AI is used, and where it is not

| AI does | AI never does |
|---|---|
| Writes the test plan (strict JSON, validated) | Runs a shell or any code |
| Proposes one config change from an allow-list | Touches storage, keys or tokens |
| Writes the plain-words briefing | Decides the answer or the switch |
| Answers in the RISE agent (`Ctrl K`), with validated actions | Sees secrets (key-like text is redacted first) |

- **Model:** OpenRouter `z-ai/glm-5.3-flash`, 40 s timeout.
- **If the AI is down:** RISE uses the last valid plan for the same behaviours, labelled **CACHED**. If there is none, it uses a rule-based plan, labelled **RULES**. Analyses still finish.

## 9. Run it locally

**Docker (any OS):**
```bash
git clone https://github.com/franciscogfsm/Rise.git && cd Rise
OPENROUTER_API_KEY=sk-or-... docker compose up --build
# → http://localhost:8080
```

**Linux / WSL without Docker:**
```bash
bash scripts/setup.sh     # venv, Garage binary, .env with generated local keys
nano .env                 # set OPENROUTER_API_KEY
bash scripts/run.sh       # providers + RISE on 127.0.0.1:8080
bash scripts/stop.sh      # stop the providers
```

**Tests:** `python -m pytest -q`. They run 119 tests, including an end-to-end journey on two real S3 servers in-process and the real link cut.

### From Claude Code: `/rise` (MCP)

`rise/mcp.py` is an MCP server over stdio, written with the Python standard library only. It exposes two tools:

- `rise_connections` lists the configured clouds, with no keys;
- `rise_check(path, goal, reference, targets)` analyses a folder.

The `rise_check` flow:
1. It reads the folder, skipping `.env*` (except `.env.example`), `node_modules`, build folders, binaries and files over 400 KB.
2. It POSTs the files to `/api/analyses` as `files` instead of `url`.
3. The server filters them again with the same rules as a GitHub archive (`repo.local`) and runs the normal pipeline.
4. The client polls until the analysis is done and returns a text summary with the evidence link.

[.mcp.json](../.mcp.json) registers the server for this repo, and [.claude/commands/rise.md](../.claude/commands/rise.md) adds `/rise <goal>`. For any other project, run `claude mcp add rise -- python /path/to/Rise/rise/mcp.py`. The client reads `RISE_URL` and `RISE_PASSWORD` from its environment.

## 10. Deploy for free (Render)

[Render](https://render.com) builds the [`Dockerfile`](../Dockerfile) for free and **redeploys automatically on every push to `main`**. The repo already contains the blueprint, [`render.yaml`](../render.yaml).

1. Push the repository to GitHub (public or private).
2. Sign in at **render.com** with GitHub. No card is needed for the free plan.
3. Click **New → Blueprint** and pick the `Rise` repository. Render reads `render.yaml`.
4. Render asks for two values:
   - `OPENROUTER_API_KEY`: your key from openrouter.ai (optional; without it the AI parts use RULES).
   - `RISE_PASSWORD`: **required**, because the URL is public. The browser will ask for it; any user name works.
5. Click **Apply**. The first build takes about 3–5 minutes. You get a URL like `https://rise-xxxx.onrender.com`.
6. From now on, **every `git push` to `main` rebuilds and redeploys** it. Render checks `/healthz` before switching traffic to the new version.

Or use the button (it opens the same blueprint):

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/franciscogfsm/Rise)

**Limits of the free plan (be aware before a demo):**
- It **sleeps after 15 minutes without traffic**. The next visit takes about a minute to wake it, so open the URL a few minutes before you present.
- **No persistent disk.** Analyses and saved connections are lost on every redeploy or restart. Re-add real connections after a deploy.
- 512 MB RAM and a shared CPU: fine for one user at a time. The local providers run inside the same container.

## 11. Deploy on your own VM, updated on every push

For a machine that never sleeps and keeps its data (for example the hackathon's Linux VM), use the GitHub Actions workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). On every push to `main` it:

1. runs all tests on GitHub; if any fail, nothing is deployed;
2. SSHes into the VM, runs `git reset --hard origin/main` and `docker compose up -d --build`;
3. waits for `/healthz`, and prints the container logs if RISE does not come up.

**One-time setup on the VM:**
```bash
sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER          # log out and back in
git clone https://github.com/franciscogfsm/Rise.git ~/Rise && cd ~/Rise
cp .env.example .env && nano .env      # OPENROUTER_API_KEY, RISE_PASSWORD, RISE_BIND=0.0.0.0
docker compose up -d --build           # → http://<vm-ip>:8080
```

**In GitHub:** go to *Settings → Secrets and variables → Actions* and add:

| Secret | Value |
|---|---|
| `VM_HOST` | the VM's IP or hostname |
| `VM_USER` | your SSH user on the VM |
| `VM_SSH_KEY` | a private key whose public half is in the VM's `~/.ssh/authorized_keys` |

Edit only `.env` on the VM. Each deploy resets the code to `main`, but `.env` and the data volume are kept.

## 12. Configuration reference

All settings are environment variables. In local runs they are read from `.env`. Real environment variables win over `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | empty | Enables the live AI. Without it: CACHED or RULES |
| `OPENROUTER_MODEL` | `z-ai/glm-5.3-flash` | The model used |
| `RISE_PASSWORD` | empty | HTTP basic auth on every route except `/healthz`. **Set it before going public** |
| `RISE_BIND` | `127.0.0.1` | Docker compose: `0.0.0.0` publishes the port |
| `RISE_HOST` / `RISE_PORT` | `127.0.0.1` / `8080` | Where the server listens (`0.0.0.0` in Docker) |
| `RISE_MASTER_KEY` | auto file | Fernet key that encrypts connection keys |
| `RISE_DATA_DIR` | `.rise/` | Analyses, connections, AI cache |
| `SOURCE_*` / `DEST_*` | local moto / Garage | The two built-in simulated providers |

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| Page keeps asking for a password | That is `RISE_PASSWORD`; any user name works |
| Briefing or plan says RULES | No `OPENROUTER_API_KEY`, or OpenRouter was unreachable. The results are still real |
| Connection test: "wrong region" | Pick the bucket's real region (for AWS, see the bucket's properties) |
| "Stored keys cannot be decrypted" | The master key changed (for example a fresh free deploy). Remove the connection and add it again |
| Render URL slow on the first visit | The free plan was asleep. Wait about a minute |
| GitHub deploy job fails at SSH | Check the three secrets, and that the VM's port 22 is reachable |
