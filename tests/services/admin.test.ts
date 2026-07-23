import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import {
  getMailConfig,
  getSheetsConfig,
  updateMailConfig,
  updateSheetsConfig,
} from "@/lib/services/integration-service";
import { recordAudit, listAuditLog } from "@/lib/services/audit-service";
import { resetSummary, runYearEndReset } from "@/lib/services/reset-service";
import { createEvent } from "@/lib/services/event-service";
import { signupForSlot } from "@/lib/services/slot-signup-service";
import { createReport } from "@/lib/services/hour-report-service";

async function clearIntegrations() {
  await db.integrationSettings.deleteMany({});
}

beforeEach(async () => {
  await truncateAll(db);
  await clearIntegrations();
});
afterEach(clearIntegrations);

describe("integration config", () => {
  it("falls back to env when the DB is empty", async () => {
    process.env.GMAIL_USER = "envuser@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "env-pass";
    expect(await getMailConfig()).toEqual({
      user: "envuser@gmail.com",
      pass: "env-pass",
    });
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
  });

  it("DB config overrides env and decrypts back to the original", async () => {
    process.env.GMAIL_USER = "envuser@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "env-pass";
    await updateMailConfig({ user: "db@gmail.com", appPassword: "db-secret" });

    expect(await getMailConfig()).toEqual({ user: "db@gmail.com", pass: "db-secret" });
    // the password is stored encrypted, not in plaintext
    const row = await db.integrationSettings.findUnique({ where: { id: 1 } });
    expect(row?.gmailAppPasswordEnc).not.toContain("db-secret");

    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
  });

  it("stores and decrypts the Sheets private key", async () => {
    await updateSheetsConfig({
      spreadsheetId: "sheet123",
      serviceEmail: "svc@project.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----",
    });
    const config = await getSheetsConfig();
    expect(config?.spreadsheetId).toBe("sheet123");
    expect(config?.privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("is null when neither DB nor env is configured", async () => {
    expect(await getMailConfig()).toBeNull();
    expect(await getSheetsConfig()).toBeNull();
  });
});

describe("audit log", () => {
  it("records and lists newest-first", async () => {
    const actor = { id: 1, firstName: "Pat", lastName: "Officer" };
    await recordAudit({ actor, action: "event.create", summary: "first" });
    await recordAudit({ actor, action: "event.delete", summary: "second" });
    const log = await listAuditLog();
    expect(log[0].summary).toBe("second");
    expect(log[0].actorName).toBe("Pat Officer");
    expect(log).toHaveLength(2);
  });
});

describe("year-end reset", () => {
  it("removes members + activity, keeps officers and audit log", async () => {
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
    const member = await db.user.create({
      data: {
        firstName: "M",
        lastName: "B",
        email: "m@test.local",
        passwordHash: await hashPassword("password123"),
        role: "member",
        emailVerifiedAt: new Date(),
      },
    });
    const event = await createEvent(
      {
        title: "E",
        slots: [
          {
            date: new Date(Date.UTC(2026, 0, 1)),
            startTime: "09:00",
            endTime: "11:00",
            hoursValue: 2,
            quota: 5,
          },
        ],
      },
      officer.id,
    );
    const slot = await db.timeslot.findFirst({ where: { eventId: event.id } });
    await signupForSlot(slot!.id, member.id);
    await createReport({
      userId: member.id,
      description: "x",
      date: new Date(Date.UTC(2026, 0, 1)),
      hoursRequested: 1,
    });
    await recordAudit({ actor: officer, action: "x", summary: "pre-reset" });

    const summary = await resetSummary();
    expect(summary.members).toBe(1);
    expect(summary.events).toBe(1);

    const removed = await runYearEndReset();
    expect(removed.members).toBe(1);

    expect(await db.user.count({ where: { role: "member" } })).toBe(0);
    expect(await db.user.count({ where: { role: "officer" } })).toBe(1);
    expect(await db.event.count()).toBe(0);
    expect(await db.eventSignup.count()).toBe(0);
    expect(await db.hourReport.count()).toBe(0);
    // audit log is retained through the reset
    expect((await listAuditLog()).some((e) => e.summary === "pre-reset")).toBe(true);
  });
});
