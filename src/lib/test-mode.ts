/**
 * Local test mode: super admins' edits are not written to the audit log.
 * Starts from NHS_TEST_MODE=true and can be flipped from the Operations Console
 * (in-memory, resets on restart). Never active in production builds — `next start`
 * always runs with NODE_ENV=production, so the server ignores both.
 */
const store = globalThis as unknown as { nhsTestModeOverride?: boolean };

export function isTestModeAvailable(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isTestMode(): boolean {
  if (!isTestModeAvailable()) return false;
  return store.nhsTestModeOverride ?? process.env.NHS_TEST_MODE === "true";
}

export function setTestMode(on: boolean): void {
  if (!isTestModeAvailable()) return;
  store.nhsTestModeOverride = on;
}
