#!/usr/bin/env bash
# Start the two SIMULATED, isolated S3-compatible providers and create their rise-* buckets.
#   Source      = moto server (Python), region us-east-1
#   Destination = Garage (open-source S3 server), its own region from DEST_REGION
# Neither is Leaseweb or AWS. Idempotent: safe to run again.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . <(tr -d '\r' < .env); set +a  # tolerate a .env saved with Windows line endings

VENV="${RISE_VENV:-$HOME/.venvs/rise}"
GARAGE="${GARAGE_BIN:-$HOME/.local/bin/garage}"
DATA="${RISE_PROVIDERS_DIR:-$HOME/.rise-providers}"
mkdir -p "$DATA/garage/meta" "$DATA/garage/data" "$DATA/logs"
SRC_PORT="$(echo "$SOURCE_ENDPOINT" | sed -E 's#.*:([0-9]+)/?$#\1#')"
DST_PORT="$(echo "$DEST_ENDPOINT" | sed -E 's#.*:([0-9]+)/?$#\1#')"

# ---- source: moto ----
if ! curl -s -o /dev/null "$SOURCE_ENDPOINT"; then
  nohup "$VENV/bin/moto_server" -H 127.0.0.1 -p "$SRC_PORT" >"$DATA/logs/moto.log" 2>&1 &
  echo $! >"$DATA/moto.pid"
  for _ in $(seq 40); do curl -s -o /dev/null "$SOURCE_ENDPOINT" && break; sleep 0.25; done
fi
"$VENV/bin/python" - <<'PY'
import os, boto3
c = boto3.client("s3", endpoint_url=os.environ["SOURCE_ENDPOINT"], region_name=os.environ.get("SOURCE_REGION", "us-east-1"),
                 aws_access_key_id=os.environ["SOURCE_ACCESS_KEY"], aws_secret_access_key=os.environ["SOURCE_SECRET_KEY"])
have = {b["Name"] for b in c.list_buckets().get("Buckets", [])}
for b in {os.environ["SOURCE_BUCKET"], os.environ["SOURCE_TEST_BUCKET"]} - have:
    c.create_bucket(Bucket=b)
print("✓ source (moto) buckets ready")
PY

# ---- destination: Garage ----
CFG="$DATA/garage/garage.toml"
cat >"$CFG" <<EOF
metadata_dir = "$DATA/garage/meta"
data_dir = "$DATA/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "127.0.0.1:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$GARAGE_RPC_SECRET"

[s3_api]
s3_region = "$DEST_REGION"
api_bind_addr = "127.0.0.1:$DST_PORT"
root_domain = ".s3.garage.localhost"
EOF
g() { "$GARAGE" -c "$CFG" "$@"; }

if ! g status >/dev/null 2>&1; then
  nohup "$GARAGE" -c "$CFG" server >"$DATA/logs/garage.log" 2>&1 &
  echo $! >"$DATA/garage.pid"
  for _ in $(seq 40); do g status >/dev/null 2>&1 && break; sleep 0.25; done
fi
if [ ! -f "$DATA/garage/.initialized" ]; then
  NODE="$(g node id -q | cut -d@ -f1)"
  g layout assign -z dc1 -c 1G "$NODE" >/dev/null
  g layout apply --version 1 >/dev/null
  g key import --yes -n rise "$DEST_ACCESS_KEY" "$DEST_SECRET_KEY" >/dev/null 2>&1 \
    || g key import -n rise "$DEST_ACCESS_KEY" "$DEST_SECRET_KEY" >/dev/null
  for b in "$DEST_BUCKET" "$DEST_TEST_BUCKET"; do
    g bucket create "$b" >/dev/null
    g bucket allow --read --write --owner "$b" --key rise >/dev/null
  done
  touch "$DATA/garage/.initialized"
fi
echo "✓ destination (Garage, region $DEST_REGION) buckets ready"
