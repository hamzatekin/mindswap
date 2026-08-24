#!/bin/sh
# Pull + rebuild when origin/main has new commits. Run from cron every minute:
#   * * * * * flock -n /tmp/mindswap-deploy.lock ~/mindswap/scripts/autodeploy.sh >> ~/mindswap-deploy.log 2>&1
set -e
cd "$(dirname "$0")/.."
git fetch origin main
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then
  exit 0
fi
echo "[deploy] $(date -u +%FT%TZ) deploying $(git rev-parse --short origin/main)"
git merge --ff-only origin/main
docker compose up -d --build
echo "[deploy] $(date -u +%FT%TZ) done"
