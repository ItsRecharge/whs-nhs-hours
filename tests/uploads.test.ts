import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import os from "os";
import path from "path";
import { resolveUploadPath, contentTypeForPath, savePhotoUpload } from "@/lib/uploads";
import { hourReportSchema } from "@/lib/validation";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "nhs-uploads-"));
  process.env.UPLOAD_DIR = dir;
});

afterEach(() => {
  delete process.env.UPLOAD_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("resolveUploadPath", () => {
  it("resolves a stored file inside the upload dir", () => {
    mkdirSync(path.join(dir, "hour-reports"), { recursive: true });
    writeFileSync(path.join(dir, "hour-reports", "a.jpg"), "x");
    expect(resolveUploadPath("hour-reports/a.jpg")).toBe(
      path.join(dir, "hour-reports", "a.jpg"),
    );
  });

  it("rejects path traversal", () => {
    writeFileSync(path.join(os.tmpdir(), "nhs-outside.txt"), "secret");
    expect(resolveUploadPath("../nhs-outside.txt")).toBeNull();
    expect(resolveUploadPath("../../etc/passwd")).toBeNull();
    expect(resolveUploadPath("/etc/passwd")).toBeNull();
  });

  it("returns null for missing files", () => {
    expect(resolveUploadPath("hour-reports/missing.jpg")).toBeNull();
  });
});

describe("savePhotoUpload", () => {
  const jpegBytes = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(64),
  ]);

  it("stores a valid JPEG under a UUID name", async () => {
    const file = new File([jpegBytes], "../../evil.jpg", { type: "image/jpeg" });
    const result = await savePhotoUpload(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.relPath).toMatch(/^hour-reports\/\d{4}\/\d{2}\/[0-9a-f-]+\.jpg$/);
      expect(resolveUploadPath(result.relPath)).not.toBeNull();
    }
  });

  it("rejects non-image content regardless of filename", async () => {
    const file = new File(["not an image"], "photo.jpg", { type: "image/jpeg" });
    const result = await savePhotoUpload(file);
    expect(result.ok).toBe(false);
  });
});

describe("hourReportSchema category/origin rules", () => {
  const base = {
    description: "Helped out",
    date: "2026-05-01",
    hoursRequested: "2",
  };

  it("accepts an outside soup-kitchen report", () => {
    const parsed = hourReportSchema.safeParse({
      ...base,
      category: "soup_kitchen",
      origin: "outside",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects outside gardening (in-school only)", () => {
    const parsed = hourReportSchema.safeParse({
      ...base,
      category: "gardening",
      origin: "outside",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows inside gardening reports (forgot-to-log NHS event)", () => {
    const parsed = hourReportSchema.safeParse({
      ...base,
      category: "gardening",
      origin: "inside",
    });
    expect(parsed.success).toBe(true);
  });

  it("defaults to general/inside", () => {
    const parsed = hourReportSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.category).toBe("general");
      expect(parsed.data.origin).toBe("inside");
    }
  });
});
