# RISE — The Proof of Cloud Freedom
**InfraHack Portugal 2026 | Leaseweb × Velv**

- **Brand:** RISE
- **Slogan:** *Built to rise when clouds fall.*
- **Positioning:** Don't hope your cloud migration works. Prove it before you move.
- **Design system:** see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (Option E · Pearl Pro)
- **Event rules:** see [INFRAHACK_CONTEXTO.md](INFRAHACK_CONTEXTO.md) and the official PDF in this folder.

## Mission
Build a polished, technically credible, fully functional hackathon MVP. Premium-startup quality, serious infra engineering depth, Apple-keynote visual sophistication.
**Not** a generic AI dashboard, chatbot wrapper, superficial cloud comparison, or an animation pretending to be a technical achievement. Everything shown must really happen.
Development starts from scratch on the event day (20 Nov 2026) — respect that.

---

## 1. Problem
Companies depend on AWS/Azure/GCP. Many want to move to alternatives (e.g. Leaseweb) but face uncertainty: even "S3-compatible" APIs differ in behaviours, configuration and capabilities. Risks: failures after migration, undocumented dependencies, integration incompatibilities, downtime, data-integrity risk, costly manual testing, deeper hyperscaler lock-in.

**Leaseweb Digital Independence Survey 2026** (published 4 Nov 2026, 800 senior leaders in UK, US, DE, NL):
- **89%** estimated they could not migrate business-critical workloads away from their largest provider within three weeks.
- **79%** expect AI adoption to increase dependence on a few providers.
- **73%** would pay at least 11% more for greater digital independence.
- Source: https://www.leaseweb.com/fr/press/releases/nearly-nine-in-ten-businesses-cannot-leave
- These are **survey responses, not measured migration results**. Always describe them that way.

Companies need **confidence, backed by evidence, that their applications will work after switching.**

## 2. What RISE is
An AI-powered cloud compatibility and portability **verification** platform. It analyzes how an app actually uses a cloud service, generates app-specific compatibility tests, compares providers, finds incompatibilities, proposes controlled adaptations, and produces verifiable evidence of what can safely run on the alternative.

> RISE helps companies prove that an application can work with another cloud provider before committing to migration.

Never claim universal compatibility or autonomous migration of whole AWS estates. RISE builds confidence one dependency at a time.

### Product journey
**CONNECT → DISCOVER → ANALYZE → CHALLENGE → ADAPT → VERIFY → SWITCH → PROVE**

| Step | What it does |
|---|---|
| CONNECT | Configure source + destination S3-compatible storage. Credentials in env vars, minimum permissions. |
| DISCOVER | Observe how a sample app uses object storage: upload, download, head/metadata, list, presigned URLs, delete (isolated env). Via SDK instrumentation / observed calls → structured data. |
| ANALYZE (AI) | LLM interprets observed behaviour → **structured, validated test plan** (not prose). |
| CHALLENGE | Deterministic engine runs tests against both envs with controlled data. Distinguish **passed / failed / unsupported / untested**. Same HTTP status ≠ equivalent. |
| ADAPT | On a real (or deliberately prepared) incompatibility, AI proposes a **constrained** adaptation (endpoint config, addressing style, region, metadata transform…). Apply + retest. No uncontrolled commands, never production changes. |
| VERIFY | Prove destination performs the selected operations. **SHA-256 over real object bytes** (never treat ETag as content hash). |
| SWITCH | Make a **real** change to the app's routing/provider config. Verify new operations on destination without the source. |
| PROVE | Generate the **RISE Freedom Proof** (see below). |

### RISE Freedom Proof contents
Source & destination envs · observed dependencies · tests executed · results & incompatibilities · changes applied · integrity verification · provider used for new requests · **remaining untested behaviour** · timestamps + request IDs.
It is **not** a certificate of universal safety — it is a trustworthy record of exactly what was demonstrated.

## 3. Central innovation
**Application-aware, evidence-driven cloud portability:**
behaviour discovery + AI-generated tests + controlled adaptation + real provider verification + evidence-based switching.
AI generates the testing logic/plan from observed requirements; **deterministic software executes and produces the evidence.**

Commercial angle: a migration-readiness engine a provider like Leaseweb could integrate into customer onboarding. MVP goes **deep on one category (S3 object storage)**; architecture allows more adapters later.

## 4. MVP — must actually work
1. Working sample app using S3-compatible storage.
2. Two independent storage environments.
3. Real observable storage operations.
4. AI-assisted generation of app-specific tests.
5. Real test execution + comparison.
6. Detection of ≥1 incompatibility in a controlled scenario.
7. Constrained adaptation/config correction (if feasible).
8. Retest showing the change.
9. Objects actually moved/available on destination.
10. Real switch source → destination.
11. New operations verified on destination.
12. Concise technical evidence report.

### Environment honesty
- The event VM is compute, **not** a Leaseweb Object Storage account. Inspect available credentials first.
- Preferred if authorized: Source = dedicated AWS S3 test bucket, Destination = Leaseweb Object Storage (S3 API).
- Otherwise: two genuinely isolated local test storage envs, **clearly labelled simulated**. Never pretend a local container is Leaseweb.

### Controlled incompatibility
Prepare a deterministic fixture where a behaviour really differs between two independently configured envs; the test must fail for a **real technical reason**, detected by RISE's engine; AI proposes a fix; retest passes. **Never attribute the injected incompatibility to Leaseweb.**

## 5. The live proof (most important)
- **Before:** app uses source; RISE analyzes + generates tests; destination tested; required objects made available there.
- **During:** RISE changes app storage routing to the verified destination; real requests go there.
- **Source disconnection:** in a disposable test env, reversibly cut the app's access to the source (scoped policy / endpoint block). Never revoke shared/production creds. Never say "we destroyed AWS".
- **After:** a brand-new, never-cached operation (upload → retrieve via destination → SHA-256 match → show provider + request ID).
- Must be observable in real backend state and requests. **Prove what happened, don't animate what should have happened.**

## 6. Presentation experience
- Fullscreen HTML pitch, integrated with the real RISE product. **Judges only watch** — no QR codes, no phones, no uploads, no accounts.
- Some pitch visuals/cards/evidence are **served through RISE's storage routing layer**. During the demo the source becomes inaccessible, RISE switches, and the pitch requests **fresh** content (unique request IDs, `Cache-Control: no-store`) served by the destination.
- Final reveal (only if literally true): **YOU DIDN'T JUST WATCH RISE. RISE POWERED WHAT YOU JUST WATCHED.** → RISE. *Built to rise when clouds fall.* + real request traces.
- A locally loaded page still showing is not proof — show fresh requests.

### 5-minute narrative (suggested)
0:00–0:40 problem + survey stats · 0:40–1:20 the idea · 1:20–2:20 discovery, generated tests, incompatibility · 2:20–3:30 verify, switch, cut source, new op succeeds · 3:30–4:20 evidence, remaining risk, how Leaseweb could use it · 4:20–5:00 reveal + traces + brand.

## 7. AI strategy
- Cheap reliable model via **OpenRouter** (GLM Flash candidate — verify exact id, price, availability before using).
- AI does: interpret operations, identify risks, generate **structured** test specs, recommend constrained adaptations, explain failures.
- AI does **not**: destructive changes, shell commands, touch secrets, declare success without executed tests, own switching reliability.
- Structured outputs + validation; small prompts; reuse valid results.
- Cached AI response allowed for replay/fallback but **must be labelled as cached**, never shown as live.
- Core demo must keep working if OpenRouter is down.

## 8. Security & reliability
No API keys in browser · no credentials in Git · env vars · separate test buckets · least privilege · destructive actions only in disposable envs · synthetic data only · real hashes · separate results from assumptions · auditable log of changes/operations · cannot touch unrelated infra · failures show diagnostics, never silently continue.

## 9. Live demo reliability
Path: **DISCOVER → GENERATE TESTS → EXECUTE → VERIFY → SWITCH → PROVE** (+ ADAPT if reliable).
Required: pre-demo health checks · separate test envs · stable fixtures · recovery/reset · real-time backend status · request tracing · rehearsed sequence · honest replay mode · recorded backup video labelled as recording.

## 10. Priorities
- **P0** sample app, two envs, tests, verification, switching
- **P1** real AI test generation from observed behaviour
- **P2** controlled incompatibility + validated adaptation
- **P3** premium Liquid Glass dashboard + evidence visualization
- **P4** cinematic HTML pitch + integrated live content + reveal
Stabilize code ~15:00. Never drop working functionality for decoration.

## 11. Success conditions (all must be objectively demonstrable)
- **A** App performed operations against the original S3-compatible env.
- **B** RISE discovered relevant behaviour.
- **C** AI produced a real structured compatibility test plan.
- **D** Tests ran against the destination with real results.
- **E** An incompatibility was identified and explained (limits stated).
- **F** Destination verified for the selected operations.
- **G** App switched to destination.
- **H** Original env became inaccessible to the app.
- **I** A completely new operation succeeded on the destination.
- **J** Evidence report accurately reflects what happened.
- Bonus: AI adaptation fixes the incompatibility and passes retest.

## 12. Future (vision, not MVP claims)
Multiple object-storage providers · PostgreSQL · queues/events · functions · IaC checks · continuous portability tests in CI/CD · policy-based verification · enterprise evidence reporting · provider onboarding integration. RISE complements providers like Leaseweb.

## 13. Principles
1. Proof over promises. 2. Engineering over decoration. 3. AI with a real purpose. 4. Reliability over complexity. 5. Transparency (supported / unsupported / unknown). 6. Premium design everywhere. 7. Commercial relevance. 8. A memorable, *true* demonstration.

> **Show that a cloud migration can be tested, verified and trusted before the customer commits to it — and prove it through working software.**
