# WHS NHS Hours Log

Volunteer-hours tracker for the WHS chapter of the National Honor Society.
Members log community-service hours by signing up for events and getting marked
present; officers create events, approve member-requested events, take attendance,
and manage the roster. Rewritten from the original Flask demo as a multi-user
**Next.js** app with real authentication, email, and a Google Sheets backup.

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions) + **Tailwind CSS v4**
- **Prisma** ORM on **SQLite** (swap `provider` to Postgres for scale)
- **jose** HS256 session cookies (HTTP-only), gated in `middleware.ts`
- **Nodemailer** (Gmail SMTP) for verification + notification emails
- **googleapis** service account for the hours backup sheet
- **Vitest** for unit + service tests

## Features

- Email + password auth with **invite-only signup** (officers generate links with
  expiry and optional max-uses), **email verification** required before first login,
  and **password reset** — all over email.
- Role-based access (member vs officer) enforced in middleware and re-checked in
  every server action against the database.
- **Email notifications**: new event posted → all members; request approved/denied
  → the requester; hours credited → the member; new request → all officers.
- **Google Sheets backup**: each attendance submission appends credited-hours rows
  (member, hours, event, date).
- Hardening: zod validation, in-memory rate limiting on auth endpoints, no account
  enumeration on login/reset, hashed (sha256) one-time tokens, bcrypt password hashes.

## Setup

```bash
npm install
cp .env.example .env          # then fill in the values below
npx prisma migrate dev        # create the SQLite database
npm run db:seed               # create the bootstrap officer (+ demo data if enabled)
npm run dev                   # http://localhost:3000
```

### Required env

- `DATABASE_URL` — e.g. `file:../data/app.db`
- `SESSION_SECRET` — `openssl rand -base64 32`
- `APP_URL` — base URL used in email links (`http://localhost:3000` for dev)
- `BOOTSTRAP_OFFICER_EMAIL` / `BOOTSTRAP_OFFICER_PASSWORD` / `BOOTSTRAP_OFFICER_NAME`
  — the first officer, created pre-verified by the seed script
- `SEED_DEMO=true` — also seeds demo events + a demo member (local only)

### Email (optional — emails become no-ops if unset)

Uses a single Gmail account for all outgoing mail. Enable 2-Step Verification on
the account, create an **App Password** at <https://myaccount.google.com/apppasswords>,
and set `GMAIL_USER` + `GMAIL_APP_PASSWORD`. Gmail caps at ~500 recipients/day;
broadcasts are sent BCC in chunks to stay within it.

### Google Sheets backup (optional — no-ops if unset)

1. Create a Google Cloud service account, enable the Sheets API, and download its
   JSON key.
2. **Share the target spreadsheet with the service account's email** (editor).
3. Set `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and
   `GOOGLE_SERVICE_ACCOUNT_KEY` (base64-encode the private key to avoid newline
   issues). Rows are appended to `Sheet1!A:D`.

## First run

1. Log in with the bootstrap officer account.
2. Go to **Invites** → create an invite link (and optionally email it).
3. Open the link to sign up as a member → verify via the emailed link → log in.
4. Officers create events / approve requests / take attendance; members sign up
   and watch their progress bar fill toward the 10-hour yearly goal.

## Tests

```bash
npm test          # vitest: pure logic + service tests against a temp SQLite DB
npm run typecheck # tsc --noEmit
npm run build     # production build
```

## Notes for scaling

- In-memory rate limiting is per-process; move to Redis/Upstash before any
  serverless or multi-instance deployment.
- SQLite is fine for a single chapter. For higher concurrency, point Prisma at
  Postgres (`provider = "postgresql"`) and convert the String role/status/type
  columns to native enums.
