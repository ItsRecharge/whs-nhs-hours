import { db } from "../db";
import { schoolYearRange, hoursRemaining } from "../hours";
import { getTotalGoal } from "./chapter-service";

export interface MemberProgress {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  graduationYear: number | null;
  emailVerifiedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  earned: number;
  remaining: number;
}

/**
 * Hours a user has earned this school year: attended timeslots (by slot date)
 * plus approved manual hour reports (by activity date).
 */
export async function hoursEarnedForUser(userId: number): Promise<number> {
  const { start, end } = schoolYearRange();

  const signups = await db.eventSignup.findMany({
    where: {
      userId,
      attended: true,
      timeslot: { date: { gte: start, lte: end } },
    },
    include: { timeslot: { select: { hoursValue: true } } },
  });
  const eventHours = signups.reduce((sum, s) => sum + s.timeslot.hoursValue, 0);

  const reports = await db.hourReport.findMany({
    where: { userId, status: "approved", date: { gte: start, lte: end } },
    select: { hoursRequested: true },
  });
  const reportHours = reports.reduce((sum, r) => sum + r.hoursRequested, 0);

  return eventHours + reportHours;
}

/** All members with computed hours, sorted by remaining (most-needed first). */
export async function listMembersWithProgress(): Promise<MemberProgress[]> {
  const [members, goal] = await Promise.all([
    db.user.findMany({
      where: { role: "member" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        graduationYear: true,
        emailVerifiedAt: true,
        deactivatedAt: true,
        createdAt: true,
      },
      orderBy: { firstName: "asc" },
    }),
    getTotalGoal(),
  ]);

  const withHours = await Promise.all(
    members.map(async (m) => {
      const earned = await hoursEarnedForUser(m.id);
      return { ...m, earned, remaining: hoursRemaining(earned, goal) };
    }),
  );

  return withHours.sort((a, b) => b.remaining - a.remaining);
}
