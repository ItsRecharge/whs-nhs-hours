#!/usr/bin/env bash
#
# Pre-start hook for the systemd unit. Applies pending DB migrations, then rebuilds
# the app ONLY when the checked-out commit differs from the last one we built (or no
# build exists yet). If nothing changed, the existing .next build is reused, so a
# plain restart is fast.
#
# Runs inside the service sandbox, so it only writes to data/, .next, and
# node_modules (all on ReadWritePaths). The built-commit marker lives in data/
# because `next build` rewrites .next.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

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
