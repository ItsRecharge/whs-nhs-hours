/**
 * Local test mode: super admins' edits are not written to the audit log.
 * Enabled by NHS_TEST_MODE=true, but never in production builds — `next start`
 * always runs with NODE_ENV=production, so the server ignores the flag.
 */
export function isTestMode(): boolean {
  return process.env.NHS_TEST_MODE === "true" && process.env.NODE_ENV !== "production";
}
