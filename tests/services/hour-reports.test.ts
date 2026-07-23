import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import {
  createReport,
  listPendingReports,
  reviewReport,
} from "@/lib/services/hour-report-service";
import { hoursEarnedForUser } from "@/lib/services/member-service";

async function makeMember() {
  return db.user.create({
    data: {
      firstName: "M",
      lastName: "B",
      email: "m@test.local",
      passwordHash: await hashPassword("password123"),
      role: "member",
      emailVerifiedAt: new Date(),
    },
  });
}

function inYear(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

beforeEach(() => truncateAll(db));

describe("hour reports", () => {
  it("creates a pending report that does not yet count", async () => {
    const member = await makeMember();
    await createReport({
      userId: member.id,
      description: "Tutoring",
      date: inYear(),
      hoursRequested: 2.5,
    });
    expect((await listPendingReports()).length).toBe(1);
    expect(await hoursEarnedForUser(member.id)).toBe(0);
  });

  it("credits hours only after approval", async () => {
    const member = await makeMember();
    const officer = await db.user.create({
      data: {
        firstName: "O",
        lastName: "F",
        email: "o@test.local",
        passwordHash: await hashPassword("password123"),
        role: "officer",
        emailVerifiedAt: new Date(),
      },
    });
    const report = await createReport({
      userId: member.id,
      description: "Tutoring",
      date: inYear(),
      hoursRequested: 2.5,
    });

    const reviewed = await reviewReport(report.id, true, officer.id);
    expect(reviewed?.status).toBe("approved");
    expect(await hoursEarnedForUser(member.id)).toBe(2.5);
    expect((await listPendingReports()).length).toBe(0);
  });

  it("denied reports do not count and cannot be re-reviewed", async () => {
    const member = await makeMember();
    const report = await createReport({
      userId: member.id,
      description: "Tutoring",
      date: inYear(),
      hoursRequested: 2.5,
    });
    await reviewReport(report.id, false, member.id);
    expect(await hoursEarnedForUser(member.id)).toBe(0);
    expect(await reviewReport(report.id, true, member.id)).toBeNull();
  });
});
