import { db } from "../db";

/**
 * First-run detection for the setup wizard. The app is considered uninitialized
 * until at least one officer exists — that officer is the chapter's admin.
 * DB-backed (no marker file), so it's race-safe and survives redeploys.
 */
export async function isFirstRun(): Promise<boolean> {
  const officers = await db.user.count({ where: { role: "officer" } });
  return officers === 0;
}
