import { describe, expect, it } from "vitest";
import { runShellCommand } from "@/lib/services/ops-service";

describe("runShellCommand", () => {
  it("returns stdout and a zero exit code on success", async () => {
    const { output, exitCode } = await runShellCommand("echo hello-shell");
    expect(output).toContain("hello-shell");
    expect(exitCode).toBe(0);
  });

  it("captures the non-zero exit code and stderr on failure", async () => {
    const { output, exitCode } = await runShellCommand("echo oops 1>&2; exit 3");
    expect(output).toContain("oops");
    expect(exitCode).toBe(3);
  });
});
