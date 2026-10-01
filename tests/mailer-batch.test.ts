import { beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { BATCH_SIZE, sendMailBatch, sendMailEach } from "@/lib/email/mailer";
import { getMailConfig } from "@/lib/services/integration-service";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));
vi.mock("@/lib/services/integration-service", () => ({ getMailConfig: vi.fn() }));

const createTransportMock = vi.mocked(nodemailer.createTransport);
const getMailConfigMock = vi.mocked(getMailConfig);
const content = { subject: "Join", html: "<p>hi</p>", text: "hi" };

let inFlight = 0;
let maxInFlight = 0;
const transport = {
  sendMail: vi.fn(async ({ to, bcc }: { to: string; bcc?: string[] }) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 1));
    inFlight--;
    if ((bcc ?? [to]).some((a) => a.startsWith("bad"))) throw new Error("421 try again later");
    return { rejected: (bcc ?? []).filter((a) => a.startsWith("reject")) };
  }),
  close: vi.fn(),
};

const addrs = (n: number, prefix = "s") =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}@wpsstudent.com`);

beforeEach(() => {
  vi.clearAllMocks();
  inFlight = 0;
  maxInFlight = 0;
  getMailConfigMock.mockResolvedValue({ user: "nhs@gmail.com", pass: "x" } as never);
  createTransportMock.mockReturnValue(transport as never);
});

describe("sendMailBatch", () => {
  it("splits recipients into BCC batches sent one at a time over one connection", async () => {
    const recipients = addrs(BATCH_SIZE * 2 + 5);
    const result = await sendMailBatch(recipients, content, 0);

    expect(result).toEqual({ unconfigured: false, sent: recipients.length, failed: [] });
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(transport.sendMail).toHaveBeenCalledTimes(3);
    const sizes = transport.sendMail.mock.calls.map((c) => c[0].bcc!.length);
    expect(sizes).toEqual([BATCH_SIZE, BATCH_SIZE, 5]);
    expect(maxInFlight).toBe(1);
    expect(transport.close).toHaveBeenCalled();
  });

  it("keeps going past a failed batch and reports its addresses", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const recipients = [...addrs(BATCH_SIZE), "bad@x.com", "c@x.com"];
    const result = await sendMailBatch(recipients, content, 0);

    expect(result.sent).toBe(BATCH_SIZE);
    expect(result.failed).toEqual(["bad@x.com", "c@x.com"]);
    errorSpy.mockRestore();
  });

  it("reports addresses the server rejected", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendMailBatch(["a@x.com", "reject@x.com"], content, 0);

    expect(result).toEqual({ unconfigured: false, sent: 1, failed: ["reject@x.com"] });
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

describe("sendMailEach", () => {
  it("sends personalized messages sequentially over one connection", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const messages = [...addrs(60), "bad@x.com"].map((to) => ({ to, ...content }));
    const result = await sendMailEach(messages, 0);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(transport.sendMail).toHaveBeenCalledTimes(61);
    expect(maxInFlight).toBe(1);
    expect(result).toEqual({ unconfigured: false, sent: 60, failed: ["bad@x.com"] });
    errorSpy.mockRestore();
  });
});
