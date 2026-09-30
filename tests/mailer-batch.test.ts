import { beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { sendMailBatch } from "@/lib/email/mailer";
import { getMailConfig } from "@/lib/services/integration-service";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));
vi.mock("@/lib/services/integration-service", () => ({ getMailConfig: vi.fn() }));

const createTransportMock = vi.mocked(nodemailer.createTransport);
const getMailConfigMock = vi.mocked(getMailConfig);
const content = { subject: "Join", html: "<p>hi</p>", text: "hi" };

let inFlight = 0;
let maxInFlight = 0;
const transport = {
  sendMail: vi.fn(async ({ to }: { to: string }) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 1));
    inFlight--;
    if (to.startsWith("bad")) throw new Error("421 try again later");
  }),
  close: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  inFlight = 0;
  maxInFlight = 0;
  getMailConfigMock.mockResolvedValue({ user: "nhs@gmail.com", pass: "x" } as never);
  createTransportMock.mockReturnValue(transport as never);
});

describe("sendMailBatch", () => {
  it("sends one at a time over a single transport", async () => {
    const recipients = Array.from({ length: 20 }, (_, i) => `s${i}@wpsstudent.com`);
    const result = await sendMailBatch(recipients, content);

    expect(result).toEqual({ unconfigured: false, sent: 20, failed: [] });
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(transport.sendMail).toHaveBeenCalledTimes(20);
    expect(maxInFlight).toBe(1);
    expect(transport.close).toHaveBeenCalled();
  });

  it("keeps going past failures and reports them", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendMailBatch(["a@x.com", "bad@x.com", "c@x.com"], content);

    expect(result).toEqual({ unconfigured: false, sent: 2, failed: ["bad@x.com"] });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("reports unconfigured mail instead of claiming success", async () => {
    getMailConfigMock.mockResolvedValue(null as never);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await sendMailBatch(["a@x.com"], content);

    expect(result).toEqual({ unconfigured: true, sent: 0, failed: [] });
    expect(createTransportMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
