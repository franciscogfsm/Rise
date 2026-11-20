#!/usr/bin/env bash
# Stop the simulated providers started by providers.sh (their data stays, so a restart is instant).
DATA="${RISE_PROVIDERS_DIR:-$HOME/.rise-providers}"
for p in moto garage; do
  [ -f "$DATA/$p.pid" ] && kill "$(cat "$DATA/$p.pid")" 2>/dev/null && rm -f "$DATA/$p.pid" && echo "stopped $p"
done
true
