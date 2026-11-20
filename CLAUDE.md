# RISE — InfraHack Portugal 2026 (Leaseweb × Velv) — 20 Nov 2026

We are building **RISE — The Proof of Cloud Freedom** live at the hackathon. Goal: win 1st prize (5.000 €).

## Read before doing anything
1. [RISE_CONTEXTO.md](RISE_CONTEXTO.md) — full product spec, MVP, live-proof demo, success conditions A–J. **Source of truth for what we build.**
2. [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — chosen design system (Option E · Pearl Pro, Light Liquid Glass). All UI and the pitch follow it.
3. [INFRAHACK_CONTEXTO.md](INFRAHACK_CONTEXTO.md) — event, organizers, schedule, judging.
4. `Hackathon Portugal 2026 - Challenge & guidelines overview 1 Finalito.pdf` — the official rules (summarized below).

## Official rules (from the PDF — non-negotiable)
- **Start from scratch on the day.** No pre-built project code.
- **Public Git repo** that stays available, with: a working version, build + run instructions, a concise `README.md` (goals + structure).
- **Open license allowing commercial and non-commercial reuse** → use **Apache-2.0** (`LICENSE` file).
- Open-source frameworks OK if publicly available and listed in dependencies / build instructions.
- Clear docs on build, usage and setup.
- **Pitch ≤ 5 minutes.** Live demos appreciated, **but their functioning is scored**.
- Common languages strongly preferred: **Python, Go, PHP** → backend in Python.
- One Linux VM per team, **decommissioned after the event** → nothing may depend on it afterwards; repo must be self-contained.
- Judging: Innovation, Applicability, Technical complexity (quality, implementation, use of AI and cloud infra), Presentation & clarity — each 1–5, **equal weight**.
- Schedule: hack 08:45–12:30 and 13:30–15:45 · pitches 15:45–16:55. Internal code freeze **15:00**.

## Stack (decided)
- Backend: Python 3.12 · FastAPI · boto3 · httpx · pydantic (`rise/`). Run on Linux (event VM or WSL) via `scripts/run.sh`.
- Dashboard: **React 18 + htm**, vendored in `web/vendor` (no Node build, works offline). UI code in `web/app.js`, tokens in `web/rise.css`.
- Simulated providers: moto (source, us-east-1) + Garage (destination, `DEST_REGION`). AI: OpenRouter `z-ai/glm-5.3-flash`.
- Tests: `python -m pytest -q` (end-to-end journey on two real S3 servers).

## Hard rules for the code
- Every thing the UI shows must come from real backend state/events. No fake animations of things that did not happen.
- Secrets only in env vars (`.env`, git-ignored). Never in browser, never committed.
- Simulated/local providers are labelled **simulated**. Never claim a local container is Leaseweb. Never blame Leaseweb for the injected incompatibility.
- SHA-256 over real object bytes, never ETags.
- AI (OpenRouter) output is structured + validated; AI never runs shell, never touches secrets, never owns switching. Demo must work if OpenRouter is down; cached AI output is labelled "cached".
- Judges only watch: no QR codes, no phones, no uploads from the audience.
- Reliability > features. Keep a reset + health-check path for the demo.
