import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "./helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import { notifyEventPosted } from "@/lib/email/notify";
import { sendMail } from "@/lib/email/mailer";

vi.mock("@/lib/email/mailer", () => ({
  sendMail: vi.fn().mockResolvedValue(true),
}));

const sendMailMock = vi.mocked(sendMail);

async function seedVerifiedMember() {
  return db.user.create({
    data: {
      firstName: "Vera",
      lastName: "Verified",
      email: "vera@test.local",
      passwordHash: await hashPassword("Password1!"),
      role: "member",
      emailVerifiedAt: new Date(),
    },
  });
}

const SLOT_A = { date: new Date("2026-10-01T00:00:00Z"), startTime: "09:00", endTime: "11:00" };
const SLOT_B = { date: new Date("2026-10-02T00:00:00Z"), startTime: "17:00", endTime: "19:00" };

beforeEach(async () => {
  await truncateAll(db);
  sendMailMock.mockClear();
});

describe("notifyEventPosted", () => {
  it("returns quietly on an empty slots array (no send, no swallowed error)", async () => {
    await seedVerifiedMember();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyEventPosted({ title: "Ghost Event", slots: [] });

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("labels a single slot with its date and times", async () => {
    await seedVerifiedMember();

    await notifyEventPosted({ title: "Cleanup", slots: [SLOT_A] });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0] as { html?: string; text?: string };
    const body = `${arg.html ?? ""}${arg.text ?? ""}`;
    expect(body).toContain("09:00");
  });

  it("labels multiple slots with a count", async () => {
    await seedVerifiedMember();

    await notifyEventPosted({ title: "Cleanup", slots: [SLOT_A, SLOT_B] });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0] as { html?: string; text?: string };
    const body = `${arg.html ?? ""}${arg.text ?? ""}`;
    expect(body).toContain("2 timeslots");
  });
});
