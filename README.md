# WHS NHS Hours Log

Volunteer-hours tracker for the WHS chapter of the National Honor Society.
Members log community-service hours by signing up for events and getting marked
present, or by self-reporting hours with proof; officers create events, approve
reports, take attendance, and manage the roster. Forked from the Aberjona Tri-M
Hours Log and adapted to NHS rules.

## NHS rules encoded in the app

- **30 hours over two years** (junior + senior year). Progress is cumulative —
  there is no yearly reset. The goal is configurable in chapter settings.
- **Inside vs outside hours.** Inside = NHS-organized events or NHS-partnered
  organizations. Outside = volunteering a member arranged themselves, submitted
  via self-report with a **required proof photo**. At most **14 outside hours**
  (configurable) count toward the goal.
- **Required hour types**: every member needs at least 1 **tutoring**, 1
  **soup kitchen**, and 1 **gardening** hour (each also counts toward the 30).
  Gardening is in-school only — it can only come from NHS gardening events.
  Events and reports both carry a type; requirement checkmarks appear on the
  member dashboard, roster, CSV, and Sheets export.
- **Self-report proof**: outside reports require a photo (portal screenshot,
  event photo, …), message optional; inside reports (an NHS event you forgot to
  log) need a photo **or** a message. Officers see the photo in the approval queue.
- **Houses**: members are split into 4 houses (names configurable). New signups
  are unassigned until an officer assigns them (member page or bulk bar).
- **Grad-year cohorts**: members pick Junior/Senior at signup (stored as a
  computed graduation year). After the configurable school-year-end date, a
  banner offers one-click deactivation of graduated seniors. The members table
  supports class/house/status filters and bulk deactivate/assign-house.
- **Outside organizers**, two tiers:
  - **Share links** (no account): officers generate tokenized public links for
    the read-only roster or a single event's attendance sheet
    (`/share/roster/<token>`, `/share/attendance/<token>`). Links carry the
    organizer's name/email, expire, and can be revoked from the Invites page.
  - **Organizer accounts**: invite with the *Organizer* role. Organizers log in
    to see the read-only roster and take attendance for events an officer has
    linked them to (event edit page → Partner organizers).

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions) + **Tailwind CSS v4**
- **Prisma** ORM on **SQLite** (swap `provider` to Postgres for scale)
- **jose** HS256 session cookies (HTTP-only), gated in `middleware.ts`
- **Nodemailer** (Gmail SMTP) for verification + notification emails
- **googleapis** service account for the live Sheets mirror
- **Vitest** for unit + service tests

## Setup

```bash
npm install
cp .env.example .env          # then fill in the values below
npx prisma migrate dev        # create the SQLite database (seeds 4 houses)
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
- `UPLOAD_DIR` (optional) — where proof photos are stored; defaults to
  `<repo>/uploads`. Served only through the authenticated `/api/uploads` route.

### Email (optional — emails become no-ops if unset)

Uses a single Gmail account for all outgoing mail. Enable 2-Step Verification on
the account, create an **App Password** at <https://myaccount.google.com/apppasswords>,
and set `GMAIL_USER` + `GMAIL_APP_PASSWORD`. Gmail caps at ~500 recipients/day;
broadcasts are sent BCC in chunks to stay within it.

### Google Sheets mirror (optional — no-ops if unset)

1. Create a Google Cloud service account, enable the Sheets API, and download its
   JSON key.
2. **Share the target spreadsheet with the service account's email** (editor).
3. Configure it in **Admin → Integrations** (or env fallbacks). Two tabs are
   kept: a **Roster** snapshot (member, email, grad year, house, inside/outside
   split, totals, requirement checks, events) overwritten on every change, and an
   append-only **Log** (member, hours, source, date, recorded-by, type,
   inside/outside).

## First run

1. Log in with the bootstrap officer account (or complete the setup wizard).
2. Go to **Invites** → create an invite link (Member, Officer, or Organizer).
3. Members pick Junior/Senior at signup → verify email → log in.
4. Officers assign houses, create typed events, approve hour reports (with proof
   photos), and watch progress toward the 30-hour goal.

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
- Proof photos live on local disk — include `uploads/` in backups alongside the
  database.
