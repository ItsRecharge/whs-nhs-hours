# Bootstrap-officer powers & ops-console access — design

**Date:** 2026-06-20
**Status:** Approved

## Context

The chapter app has one "bootstrap officer" — the first officer created at setup —
who acts as the master admin. We are reshaping how that role and the operations
console work:

- The ops console (file editor + git + shell) should be **on by default** and
  **visible to every officer**, but only **unlockable with the bootstrap officer's
  password**.
- Bootstrap status should be **transferable** (only by the current bootstrap), and
  the bootstrap officer is **protected from removal until they hand the role off**
  (replacing the old "protected for 1 year" timer).
- The **bootstrap officer account** should be able to **directly edit any user's
  data** (name, email, password, hours) with no reset links.

## Decisions

1. **Protection model:** protected-until-handoff. `isBootstrapProtected(user)` is
   simply `user.isBootstrapOfficer`.
2. **God-mode editing:** available only when logged in as the bootstrap account.
   Other officers keep the link-based reset.
3. **Direct email/password edits:** apply immediately (no verification link),
   auto-verify the email, and revoke that user's sessions.

## Design

### 1. Ops console on by default, visible to all officers
- `isOpsConsoleEnabled()` defaults true; only `OPS_CONSOLE_ENABLED=false` disables it.
- `/officer/ops` drops the super-admin redirect — any officer reaches the unlock
  screen. The Admin card shows for all officers.

### 2. Unlock requires the bootstrap officer's password
- `requestOpsGrantAction`: gate becomes `requireUser("officer")`; the entered
  password is verified against the **bootstrap account** (not the current user).
  On success a grant is issued bound to the current session officer.
- The privileged ops actions (`saveOpsFileAction`, `runOpsGitAction`,
  `runOpsShellAction`) switch from `requireSuperAdmin()` to
  `requireUser("officer")` + `requireOpsGrant()`. The grant — obtainable only with
  the bootstrap password — is the gate.
- New helper `verifyPassword(hash, password)` in `auth-service.ts`; new
  `getBootstrapOfficer()` lookup.
- If no bootstrap officer exists, unlock fails with a clear message.

### 3. Protection = until handoff
- `isBootstrapProtected(user)` → `user.isBootstrapOfficer`. Remove
  `BOOTSTRAP_PROTECTION_YEARS` and `bootstrapProtectionEndsAt`.
- `assertBootstrapOfficerEditable` then blocks demote/deactivate while the flag is
  held. `isSuperAdmin` = `isBootstrapOfficer || OPS_ADMIN_EMAILS`.
- `OfficerRow` drops `protectedUntil`; officers list shows "Bootstrap — protected".
  Member detail note loses the "first year" wording.

### 4. Transfer bootstrap role (bootstrap-only)
- New `transferBootstrapAction`: only the current bootstrap; confirmed with their
  password; target must be an active officer. One transaction flips the flag on the
  target and off the caller (exactly one bootstrap). Audited.
- Surfaced on `/officer/officers` as a "Make bootstrap" control with a password
  field, visible only to the bootstrap officer.

### 5. God-mode direct edit (bootstrap account only)
- New section on the member detail page, server-gated on `officer.isBootstrapOfficer`:
  - **Edit profile** — first/last name, email, graduation year. Email applies
    immediately: uniqueness-checked, `pendingEmail` cleared, `emailVerifiedAt=now`,
    sessions revoked.
  - **Set password** — applied immediately (hashed), sessions revoked.
- New actions in `src/actions/admin-user.ts`: `bootstrapEditProfileAction`,
  `bootstrapSetPasswordAction`. Both assert `isBootstrapOfficer` server-side, audit,
  and revoke sessions where relevant.

### Security note
The bootstrap password becomes the effective master key to the box (anyone with it
can unlock a full server shell), while user-data editing stays bootstrap-account-only.
Intentional asymmetry per the decisions above.

## Files
- `src/lib/ops-access.ts`, `src/actions/ops.ts`, `src/app/officer/ops/page.tsx`
- `src/lib/services/auth-service.ts`, `src/lib/services/bootstrap-service.ts`
- `src/lib/services/roster-service.ts`, `src/app/officer/officers/page.tsx`
- `src/app/officer/members/[id]/page.tsx`, `src/app/officer/admin/page.tsx`
- `src/actions/officers.ts` (or new `src/actions/bootstrap.ts`), `src/actions/admin-user.ts`
- `src/lib/validation.ts` (profile/password schemas)
- Tests: update `tests/services/officers.test.ts`; add transfer/unlock/edit coverage.

## Verification
- `tsc` clean, `npm run build` exit 0, `npm test` green.
- Manual: every officer sees `/officer/ops`; only the bootstrap password unlocks it;
  transfer moves the badge and flips who's removable; bootstrap can edit a user's
  name/email/password directly and that user is logged out.
