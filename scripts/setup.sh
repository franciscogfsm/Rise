#!/usr/bin/env bash
# One-time setup on Linux (event VM or WSL): Python venv, Garage binary, local .env with generated keys.
set -euo pipefail
cd "$(dirname "$0")/.."

VENV="${RISE_VENV:-$HOME/.venvs/rise}"
GARAGE_VERSION="${GARAGE_VERSION:-v1.0.1}"
BIN="$HOME/.local/bin"

python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r requirements.txt
echo "✓ Python deps in $VENV"

mkdir -p "$BIN"
if [ ! -x "$BIN/garage" ]; then
  curl -sfL -o "$BIN/garage" "https://garagehq.deuxfleurs.fr/_releases/$GARAGE_VERSION/x86_64-unknown-linux-musl/garage"
  chmod +x "$BIN/garage"
fi
echo "✓ $("$BIN/garage" --version 2>/dev/null | head -1 || echo garage) in $BIN"

bash scripts/env.sh
