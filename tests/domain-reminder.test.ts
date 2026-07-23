import { beforeAll, describe, expect, it } from "vitest";
import { activeCycleYear } from "@/lib/domain-reminder";
import { domainRenewalEmail } from "@/lib/email/templates";

beforeAll(() => {
  process.env.APP_URL = "http://localhost:3000";
});

// Noon UTC keeps these dates on the same calendar day in America/New_York.
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("activeCycleYear", () => {
  it("activates on Sept 15 and returns that year", () => {
    expect(activeCycleYear(at("2026-09-15"))).toBe(2026);
  });

  it("stays active through the ~46-day renewal window", () => {
    expect(activeCycleYear(at("2026-10-15"))).toBe(2026);
  });

  it("is inactive before Sept 15", () => {
    expect(activeCycleYear(at("2026-09-14"))).toBeNull();
  });

  it("is inactive well after the window closes", () => {
    expect(activeCycleYear(at("2026-12-01"))).toBeNull();
  });
});

describe("domainRenewalEmail", () => {
  it("includes the Cloudflare link and Google sign-in instructions", () => {
    const email = domainRenewalEmail();
    expect(email.subject).toContain("Renew the chapter domain");
    expect(email.html).toContain(
      "https://dash.cloudflare.com/fe4e8ca3c07a7eeee80feff9bff4e5c7/domains/registrations/wpsmusicdep.com",
    );
    expect(email.text).toContain("Winchestertri.m@gmail.com");
    expect(email.text).toContain("Sign in with Google");
  });
});
