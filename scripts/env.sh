#!/usr/bin/env bash
# Create .env from .env.example with freshly generated local Garage keys. Never overwrites an existing .env.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo "✓ .env already exists (left untouched)"; exit 0; fi
cp .env.example .env
# Garage needs a GK-prefixed key id and a 64-hex secret; generated locally, never committed.
sed -i "s/^DEST_ACCESS_KEY=.*/DEST_ACCESS_KEY=GK$(openssl rand -hex 12)/" .env
sed -i "s/^DEST_SECRET_KEY=.*/DEST_SECRET_KEY=$(openssl rand -hex 32)/" .env
sed -i "s/^GARAGE_RPC_SECRET=.*/GARAGE_RPC_SECRET=$(openssl rand -hex 32)/" .env
echo "✓ .env created — add your OPENROUTER_API_KEY to it"
