/**
 * Test mode: super admins' edits are not written to the audit log.
 * Starts from NHS_TEST_MODE=true and can be flipped from the Operations Console
 * (in-memory, resets on restart). Turning it on/off is itself audit-logged.
 */
const store = globalThis as unknown as { nhsTestModeOverride?: boolean };

export function isTestMode(): boolean {
  return store.nhsTestModeOverride ?? process.env.NHS_TEST_MODE === "true";
}

export function setTestMode(on: boolean): void {
  store.nhsTestModeOverride = on;
}
