import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFile: vi.fn((cmd: string, args: string[], _opts: unknown, cb: Function) => {
    const joined = args.join(" ");
    if (cmd !== "git") {
      cb(new Error("unexpected command"));
      return;
    }
    if (joined === "status -sb") {
      cb(null, "## main\n M src/app/page.tsx\n", "");
      return;
    }
    if (joined === "rev-parse --abbrev-ref HEAD") {
      cb(null, "main\n", "");
      return;
    }
    if (joined === "rev-parse --short HEAD") {
      cb(null, "abc1234\n", "");
      return;
    }
    cb(null, "", "");
  }),
}));

describe("ops-service", () => {
  it("rejects traversal before touching the filesystem", async () => {
    const { listOpsDirectory } = await import("@/lib/services/ops-service");
    await expect(listOpsDirectory("../README.md")).rejects.toThrow("Path traversal");
  });

  it("uses fixed git commands only", async () => {
    const { gitHead, gitStatus } = await import("@/lib/services/ops-service");
    expect(await gitStatus()).toContain("## main");
    expect(await gitHead()).toEqual({ branch: "main", shortHead: "abc1234" });
  });
});