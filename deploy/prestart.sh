#!/usr/bin/env bash
#
# Pre-start hook for the systemd unit. Pulls the latest code, installs deps when the
# lockfile changed, applies pending DB migrations, then rebuilds the app ONLY when
# the checked-out commit differs from the last one we built (or no build exists yet).
# If nothing changed, the existing .next build is reused, so a plain restart is fast.
#
# A failed pull (offline, git error) is non-fatal: the service still starts on the
# existing build so the app comes up even without network at boot.
#
# Runs inside the service sandbox (ProtectHome=read-only), so it only writes inside
# the project dir (on ReadWritePaths) — including the npm cache, which normally
# lives in $HOME. The built-commit marker lives in data/ because `next build`
# rewrites .next.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# $HOME is read-only in the sandbox; keep npm's cache inside the project dir.
export npm_config_cache="$PROJECT_DIR/.npm-cache"

mkdir -p data uploads  # SQLite DB + markers / proof-photo storage

# --- Self-update: fetch and fast-forward to origin. Never fatal. ---
# No credential prompts (would hang a boot) and a hard cap so a dead network
# can't eat the whole TimeoutStartSec budget.
export GIT_TERMINAL_PROMPT=0
if timeout 60 git pull --ff-only 2>&1; then
  echo "prestart: pulled latest from origin."
else
  echo "prestart: git pull failed (offline or diverged) — starting with the existing checkout."
fi

# --- Install deps when the lockfile changed (or node_modules is missing). ---
LOCK_MARKER="data/.installed-lock-hash"
LOCK_HASH="$({ sha256sum package-lock.json 2>/dev/null || shasum -a 256 package-lock.json 2>/dev/null || echo none; } | cut -d' ' -f1)"
INSTALLED_HASH="$(cat "$LOCK_MARKER" 2>/dev/null || echo missing)"
if [ ! -d node_modules ] || [ "$LOCK_HASH" != "$INSTALLED_HASH" ]; then
  echo "prestart: installing dependencies (lockfile changed or node_modules missing)."
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
  printf '%s' "$LOCK_HASH" > "$LOCK_MARKER"
fi

MARKER="data/.built-commit"
CURRENT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
PREVIOUS="$(cat "$MARKER" 2>/dev/null || echo none)"

# Always apply pending migrations — idempotent and a fast no-op when none are pending.
npx prisma migrate deploy

if [ "$CURRENT" = "unknown" ] || [ "$CURRENT" != "$PREVIOUS" ] || [ ! -f .next/BUILD_ID ]; then
  echo "prestart: building (was '$PREVIOUS', now '$CURRENT', build present: $([ -f .next/BUILD_ID ] && echo yes || echo no))"
  npx prisma generate
  npm run build
  printf '%s' "$CURRENT" > "$MARKER"
else
  echo "prestart: no new commit ('$CURRENT') and a build exists — reusing the old build."
fi
