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

  const originFor = (category?: string) => {
    const parsed = hourReportSchema.safeParse({ ...base, category });
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    return parsed.data;
  };

  it("derives outside origin only from the outside category", () => {
    expect(originFor("outside").origin).toBe("outside");
    for (const c of ["inside", "tutoring", "soup_kitchen", "gardening"]) {
      expect(originFor(c).origin).toBe("inside");
    }
  });

  it("ignores a submitted origin field", () => {
    const parsed = hourReportSchema.safeParse({ ...base, category: "tutoring", origin: "outside" });
    expect(parsed.success && parsed.data.origin).toBe("inside");
  });

  it("rejects the removed general category", () => {
    expect(hourReportSchema.safeParse({ ...base, category: "general" }).success).toBe(false);
  });

  it("defaults to inside", () => {
    const data = originFor(undefined);
    expect(data.category).toBe("inside");
    expect(data.origin).toBe("inside");
  });
});
