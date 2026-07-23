import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Runs once per test file (vitest setupFile). Ensures a migrated SQLite DB at
// the path in DATABASE_URL (set in vitest.config.ts) so the @/lib/db singleton
// — imported by the services under test — points at it. `migrate deploy` is a
// fast no-op once applied; service tests isolate via truncateAll in beforeEach.
const url = process.env.DATABASE_URL ?? "";
const abs = path.resolve(process.cwd(), url.replace(/^file:/, ""));

mkdirSync(path.dirname(abs), { recursive: true });

execSync("npx prisma migrate deploy", {
  env: { ...process.env, DATABASE_URL: `file:${abs}` },
  stdio: "ignore",
});

// Normalize to an absolute path so the runtime client resolves identically.
process.env.DATABASE_URL = `file:${abs}`;
