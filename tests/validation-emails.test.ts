import { describe, expect, it } from "vitest";
import { isStudentEmail, parseEmailList } from "@/lib/validation";

describe("isStudentEmail", () => {
  it("accepts only the student school domain (case-insensitive)", () => {
    expect(isStudentEmail("jane@wpsstudent.com")).toBe(true);
    expect(isStudentEmail("jane@WPSStudent.com")).toBe(true);
    expect(isStudentEmail("jane@gmail.com")).toBe(false);
    expect(isStudentEmail("jane@winpublic.org")).toBe(false);
    expect(isStudentEmail("jane@notwpsstudent.com")).toBe(false);
    expect(isStudentEmail("jane@wpsstudent.com.evil.io")).toBe(false);
    expect(isStudentEmail("nope")).toBe(false);
  });
});

describe("parseEmailList", () => {
  it("returns nothing for a blank list", () => {
    expect(parseEmailList("")).toEqual({ emails: [], invalid: [] });
    expect(parseEmailList("   \n ")).toEqual({ emails: [], invalid: [] });
  });

  it("splits on commas, semicolons, and whitespace; lowercases; de-dupes", () => {
    const res = parseEmailList("A@x.com, b@x.com;c@x.com\n a@X.COM  d@x.com");
    expect(res.emails).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
    expect(res.invalid).toEqual([]);
  });

  it("reports invalid entries without dropping the valid ones", () => {
    const res = parseEmailList("good@x.com, not-an-email, also@bad");
    expect(res.emails).toEqual(["good@x.com"]);
    expect(res.invalid).toEqual(["not-an-email", "also@bad"]);
  });
});
