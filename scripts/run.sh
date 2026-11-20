#!/usr/bin/env bash
# Start providers (if needed) and RISE. Open http://localhost:8080 (dashboard) and /pitch.
set -euo pipefail
cd "$(dirname "$0")/.."
VENV="${RISE_VENV:-$HOME/.venvs/rise}"
./scripts/providers.sh
# 127.0.0.1 by default: on the event VM use `ssh -L 8080:127.0.0.1:8080 <vm>` instead of exposing the API.
exec "$VENV/bin/uvicorn" rise.server:app --host "${RISE_HOST:-127.0.0.1}" --port "${RISE_PORT:-8080}"
