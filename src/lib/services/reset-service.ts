import { db } from "../db";

/** The exact phrase an officer must type to confirm, derived from the count. */
export function resetPhrase(memberCount: number): string {
  return `RESET ${memberCount} MEMBERS`;
}

export interface ResetSummary {
  members: number;
  events: number;
  signups: number;
  reports: number;
  invites: number;
}

export async function resetSummary(): Promise<ResetSummary> {
  const [members, events, signups, reports, invites] = await Promise.all([
    db.user.count({ where: { role: "member" } }),
    db.event.count(),
    db.eventSignup.count(),
    db.hourReport.count(),
    db.inviteToken.count(),
  ]);
  return { members, events, signups, reports, invites };
}

/**
 * Year-end reset: deletes all activity data and every member, keeping officers,
 * chapter/integration settings, and the audit log. Runs in one transaction in
 * FK-safe order. The acting officer is inherently safe (only members deleted).
 * Returns the counts that were removed.
 */
export async function runYearEndReset(): Promise<ResetSummary> {
  const summary = await resetSummary();
  await db.$transaction([
    db.eventSignup.deleteMany({}),
    db.hourReport.deleteMany({}),
    db.timeslot.deleteMany({}),
    db.event.deleteMany({}),
    db.inviteToken.deleteMany({}),
    // Member sessions + auth tokens cascade when the member is deleted.
    db.user.deleteMany({ where: { role: "member" } }),
  ]);
  return summary;
}
