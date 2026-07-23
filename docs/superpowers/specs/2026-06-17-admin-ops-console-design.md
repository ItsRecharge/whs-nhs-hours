# Admin Ops Console — Design

**Date:** 2026-06-17
**Status:** Approved (design); pending implementation plan

## Summary

A scoped, super-admin-only operations console at `/officer/ops` that lets an
authorized administrator do two things from a browser:

1. **Edit files** inside the project directory.
2. **Pull git updates** (and inspect git state).

It is deliberately **not** an arbitrary OS shell. The user originally asked for a
full public shell with `sudo` to the host; that was rejected during brainstorming
because (a) a process's working directory does not confine filesystem or network
access, (b) "confined to its folder" and "sudo to the host" are mutually
exclusive (sudo-to-host = root compromise = the opposite of confined), and
(c) the real need — edit files + git pull — is fully met by a bounded console
whose confinement *can* be enforced in application code.

## Goals

- Edit text files within the project root from the browser.
- Run a fixed set of git commands (status / fetch / pull / log).
- Be safe enough to expose public-behind-login, via enforceable confinement and
  defense-in-depth safeguards.

## Non-Goals

- Arbitrary OS command execution / raw shell.
- `sudo` or any privilege escalation.
- Restarting or rebuilding the running service from the UI (fragile; kills the
  request mid-flight). Handled by the host's process manager. Documented only.
- Editing `.env`, the SQLite database, `node_modules/`, or `.next/`.
- Access outside the project root.

## Threat Model

The app is internet-facing and holds member PII, bcrypt password hashes, and
AES-GCM-encrypted Gmail/Sheets credentials (key derived from `SESSION_SECRET`).
The console is reachable from the public internet behind the officer login, and
the app currently has only a single auth factor (password + email verification).
Therefore the console must:

- Be dormant unless explicitly enabled.
- Be reachable only by an explicit super-admin allowlist, not every officer.
- Require step-up re-authentication with a short-lived grant.
- Never expose secrets or the database through the editor.
- Confine all file access to the project root in code (traversal + symlink safe).
- Log every action to an append-only audit trail.
- Rely on an OS-level sandbox (documented) as the ultimate blast-radius limit.

## Architecture

Follows the existing service + server-action layering.

- **`src/lib/services/ops-service.ts`** — pure logic, no auth:
  - File ops: `listDir`, `readFile`, `writeFile`, all confined to `PROJECT_ROOT`.
  - Git ops: `gitStatus`, `gitFetch`, `gitPull`, `gitLog`, `gitHead` — fixed
    commands via `execFile` (no shell), `cwd = PROJECT_ROOT`, 30 s timeout,
    output size-capped (e.g. 64 KB).
- **`src/lib/ops-access.ts`** — access control:
  - `isOpsConsoleEnabled()` — reads `OPS_CONSOLE_ENABLED`.
  - `isSuperAdmin(user)` — email ∈ `OPS_ADMIN_EMAILS` (comma list, lowercased).
  - `requireSuperAdmin()` — `requireUser("officer")` + enabled + allowlist, else
    redirect/deny.
  - Step-up grant: issue/verify a short-lived (~10 min) signed `ops_grant` cookie
    after password re-entry (reuses the existing JWT signing util used by
    `session-token.ts`). `requireOpsGrant()` checks it on every mutating action.
- **`src/actions/ops.ts`** — server actions wrapping the service. Each action:
  `requireSuperAdmin()` → `requireOpsGrant()` (mutations) → rate-limit check →
  service call → `recordAudit(...)`.
- **`src/app/officer/ops/page.tsx`** + components under `src/components/forms/`:
  - A step-up password gate when no valid grant.
  - A file pane: directory tree, file viewer/editor with save.
  - A git panel: current branch + HEAD, and buttons for status / fetch /
    pull / log, each showing captured output.
- **Env schema** (`src/lib/env.ts`): add `OPS_CONSOLE_ENABLED` (optional,
  default unset = off) and `OPS_ADMIN_EMAILS` (optional, comma-separated).
  Document both in `.env.example`.

## File Confinement (the core safety property)

```
PROJECT_ROOT = path.resolve(process.cwd())

resolve(rel):
  abs = path.resolve(PROJECT_ROOT, rel)
  real = fs.realpathSync(existing ancestor of abs)   // defeat symlink escape
  if !(abs + sep).startsWith(PROJECT_ROOT + sep): reject
  if !(real).startsWith(PROJECT_ROOT + sep):        reject
```

- Blocked paths (read and write): `.env`, `.env.*`, anything under `data/`,
  `node_modules/`, `.next/`, and the `.git/` internals (git state is reached
  through the git panel, not the file editor).
- Text-only: reject files containing NUL bytes; ~1 MB size cap on read and write.
- Operations limited to list / read / write. No delete, no rename, no mkdir in v1
  (YAGNI; add later if needed).

## Git Operations

Fixed subcommands only; **no user-supplied arguments ever**.

| Action      | Command                       |
|-------------|-------------------------------|
| status      | `git status -sb`              |
| fetch       | `git fetch`                   |
| pull        | `git pull --ff-only`          |
| log         | `git log -n 20 --oneline`     |
| head/branch | `git rev-parse --abbrev-ref HEAD` + `git rev-parse --short HEAD` |

All via `execFile("git", [...])` (no shell interpolation), `cwd = PROJECT_ROOT`,
30 s timeout, stdout+stderr captured and truncated to the output cap. `--ff-only`
prevents a pull from hanging on a merge requiring manual conflict resolution.

## Safeguards Summary

- **Off by default** — `OPS_CONSOLE_ENABLED !== "true"` ⇒ route 404s/redirects.
- **Super-admin allowlist** via `OPS_ADMIN_EMAILS` — not the `officer` role at large.
- **Step-up re-auth** — password re-entry → ~10 min signed `ops_grant` cookie,
  checked per mutating action.
- **Rate limiting** — reuse `src/lib/rate-limit.ts` on the step-up and on actions.
- **Audit logging** — `recordAudit` for every file write (`ops.file.write`, path +
  byte count) and git command (`ops.git.pull` etc., command + truncated output).
- **`execFile`, not `exec`** — no shell, fixed git subcommands, timeouts, output caps.
- **No sudo / no privilege escalation / no self-restart.**

## Deployment Hardening (documented requirement)

The OS jail is what ultimately limits blast radius; app code cannot create its own
jail. Document (in the deploy section of the README / a new `docs/deploy.md`):

- Run the service as a **dedicated unprivileged user**.
- systemd unit hardening: `NoNewPrivileges=true`, `ProtectSystem=strict`,
  `ProtectHome=true`, `PrivateTmp=true`, `ReadWritePaths=<app dir>`,
  restricted address families. (Or an equivalent container: read-only rootfs,
  only the app dir writable.)
- `NoNewPrivileges=true` makes `sudo` impossible by design — consistent with the
  no-escalation non-goal.

## Testing (vitest, mirroring `tests/services/*`)

- **Path confinement:** `../` traversal rejected; symlink escape rejected; blocked
  dirs (`.env`, `data/`, `node_modules/`, `.next/`, `.git/`) rejected; in-root
  text file read/write succeeds; binary/oversize rejected.
- **Git wrapper:** `execFile` mocked — asserts fixed argv, cwd, timeout, output
  truncation; never passes user input as args.
- **Access control:** console disabled ⇒ denied; officer not in allowlist ⇒
  denied; valid grant required for mutations; expired/missing grant ⇒ denied.

## Future Considerations (out of scope now)

- Optional localhost/SSH-tunnel-only raw shell as a separate, non-public surface.
- TOTP 2FA on accounts (would let the step-up gate require a second factor).
- Build/restart orchestration hook tied to the host process manager.
