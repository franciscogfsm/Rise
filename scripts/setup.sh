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

if [ ! -f .env ]; then
  cp .env.example .env
  # Garage needs a GK-prefixed key id and a 64-hex secret; generated locally, never committed.
  sed -i "s/^DEST_ACCESS_KEY=.*/DEST_ACCESS_KEY=GK$(openssl rand -hex 12)/" .env
  sed -i "s/^DEST_SECRET_KEY=.*/DEST_SECRET_KEY=$(openssl rand -hex 32)/" .env
  sed -i "s/^GARAGE_RPC_SECRET=.*/GARAGE_RPC_SECRET=$(openssl rand -hex 32)/" .env
  echo "✓ .env created — add your OPENROUTER_API_KEY to it"
else
  echo "✓ .env already exists (left untouched)"
fi
