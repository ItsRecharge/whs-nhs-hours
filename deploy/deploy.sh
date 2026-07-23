#!/usr/bin/env bash
#
# Deploy the latest code for the WHS NHS Hours app.
#
# Run as the service user (musicserver) from anywhere:
#   ./deploy/deploy.sh
#
# On restart the systemd unit runs deploy/prestart.sh, which now pulls the latest
# code itself, runs `npm ci` when the lockfile changed, applies migrations, and
# rebuilds only when HEAD changed since the last build. So a deploy is simply:
#   sudo systemctl restart whs-nhs-hours
# This script is a convenience wrapper that does the pull/install up front (with
# visible output, outside the service sandbox) and then restarts.
#
# Troubleshooting — Ops Console "git pull" fails with:
#   error: insufficient permission for adding an object to repository database .git/objects
#   fatal: failed to write object
# This means part of .git is owned by a different user (usually root, from an
# initial `sudo git clone`/pull), so the service user (musicserver) can't write
# new objects. The service already has filesystem write access (systemd
# ReadWritePaths), so the fix is plain ownership — run once on the server:
#   sudo chown -R musicserver:musicserver /home/musicserver/whs-nhs-hours
# Then only ever run git in this repo as musicserver. If a "dubious ownership"
# warning appears afterward:
#   sudo -u musicserver git config --global --add safe.directory /home/musicserver/whs-nhs-hours

set -euo pipefail

SERVICE="whs-nhs-hours"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

log "Pulling latest from origin/main"
git pull --ff-only

log "Installing dependencies (npm ci)"
# Run here (outside the systemd sandbox) so the npm cache in \$HOME is writable.
if [ -f package-lock.json ]; then npm ci; else npm install; fi

log "Restarting the service ($SERVICE) — it will migrate, generate, and build"
if command -v sudo >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE"
else
  systemctl restart "$SERVICE"
fi

log "Done. Recent status:"
systemctl --no-pager --lines=0 status "$SERVICE" || true
