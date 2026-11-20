# RISE — The Proof of Cloud Freedom

*Built to rise when clouds fall.* · InfraHack Portugal 2026 (Leaseweb × Velv) · Apache-2.0

**Don't hope your cloud migration works. Prove it before you move.**

RISE checks whether an application can really run on another cloud provider, and proves it, before anyone commits to a migration. It watches how the app actually uses object storage. An LLM turns those observations into a structured, validated test plan. Deterministic code then runs the plan against both providers, applies one constrained fix when something is incompatible, copies and hash-verifies the data, and switches the app over. After cutting the app off from the original provider, RISE proves that a brand-new operation still works and writes everything into an evidence report, the **Freedom Proof**.

## Why
The Leaseweb Digital Independence Survey 2026 (published 4 Nov 2026) asked 800 senior leaders in the UK, US, DE and NL:
- **89%** said they could not move business-critical workloads off their largest provider within three weeks.
- **79%** expect AI to increase their dependence on a few providers.

These are survey answers, not measured migrations. Even "S3-compatible" providers differ in behaviour and configuration, so teams need evidence, not assumptions.

## The journey
`CONNECT → DISCOVER → ANALYZE → CHALLENGE → ADAPT → VERIFY → SWITCH → (CUT) → PROVE`

| Step | What really happens |
|---|---|
| Discover | RISE instruments the app's boto3 client (botocore event hooks) and records each real call: operation, status, request ID, and behaviours such as metadata, range reads, non-ASCII keys and presigned URLs. |
| Analyze | An OpenRouter LLM (default `z-ai/glm-5.3-flash`) receives the observed profile and returns a test plan as **strict JSON schema** output. RISE drops unknown test kinds, clamps parameters and adds tests for any observed behaviour the AI missed. |
| Challenge | Deterministic tests run on both providers with synthetic data. A test passes only if the checks on the real bytes pass (SHA-256, metadata, listings, ranges, 404 after delete). |
| Adapt | For each failure, the AI proposes **one** change to the app's S3 client, chosen from an allow-list (`region`, `addressing_style`). RISE applies it to the destination only and retests everything. |
| Verify | RISE copies the app's objects, reads them back from the destination and compares the **SHA-256 of the bytes** (never the ETag). |
| Switch | RISE changes the app's storage route. Switching is refused until the evidence passes. |
| Cut | RISE closes the network link between the app and the source (TCP refused). This is reversible. |
| Prove | The app writes a new, unique object and reads it back from the destination. The Freedom Proof (`/api/proof`) records all of this, with a digest. It also lists what remained **untested**. |

The pitch (`/pitch`) loads its visuals through the same app route (`/app/assets/…`, unique request id, `no-store`), so the audience sees content that RISE switched over live.

**AI safety:** the model never touches storage, secrets or a shell. If OpenRouter is down, RISE uses the last valid AI plan, **labelled CACHED**, or a rule-based plan, **labelled RULES**. The demo keeps working either way.

## Demo providers (simulated, clearly labelled)
- **Source:** [moto](https://github.com/getmoto/moto) S3 server, region `us-east-1`.
- **Destination:** [Garage](https://garagehq.deuxfleurs.fr/), an open-source S3 server, with its own region (`nl-ams-1`).

Neither is AWS or Leaseweb. The incompatibility in the demo is genuine but prepared on purpose: the app reuses one signing region (`APP_REGION=us-east-1`) for every S3 client, and the destination rejects that signature. The failure comes from our setup, not from any vendor.

To use real providers, point `SOURCE_*` at a dedicated AWS S3 test bucket and/or `DEST_*` at Leaseweb Object Storage (S3 API), set `*_SIMULATED=0`, and use least-privilege keys limited to `rise-*` buckets. The source cut is available only for the simulated link.

## Run (Linux: event VM or WSL)
```bash
./scripts/setup.sh             # venv in ~/.venvs/rise, Garage binary, .env with generated local keys
nano .env                      # add OPENROUTER_API_KEY
./scripts/run.sh               # starts moto + Garage + RISE on 127.0.0.1:8080
```
Open `http://localhost:8080` (dashboard) and `http://localhost:8080/pitch`. On a remote VM, tunnel instead of exposing the port: `ssh -L 8080:127.0.0.1:8080 <vm>`.
Stop the providers with `./scripts/stop.sh`. **Reset demo** in the UI empties the destination's `rise-*` buckets and restores the source link.

Tests (two real S3 servers in-process, plus the real link cut): `~/.venvs/rise/bin/python -m pytest -q`

## Structure
```
rise/config.py     providers + settings from env (.env)
rise/storage.py    instrumented boto3 client, hashes, error evidence
rise/workload.py   asset-service (the app under test) + its storage router
rise/link.py       reversible TCP link to the source (the "cut")
rise/engine.py     test catalogue + deterministic executor + rule-based plan
rise/ai.py         OpenRouter: plan + adaptation, schema + validation + fallbacks
rise/journey.py    the step orchestration, state and Freedom Proof
rise/server.py     FastAPI: dashboard, pitch, /api/*, /app/assets/*
web/               dashboard (Light Liquid Glass design system), pitch, brand
scripts/           setup / providers / run / stop
tests/             end-to-end journey test
```

## Limits (honest)
- The MVP covers one category, S3 object storage, and 7 test kinds. Operations it did not test are listed in the proof.
- Passing these tests shows only that the observed operations work. It does not certify the whole application.
- The cut is a network-level block of the simulated source link and does not affect any real cloud account.
