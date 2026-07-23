import { cookies } from "next/headers";
import { getSessionClaims } from "./session";
import { revokeSession } from "./services/session-service";
import {
  IMPERSONATOR_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "./constants";

/**
 * If an impersonation is active, end it: revoke the impersonated session and
 * restore the admin's own session from the stashed cookie. Returns true if an
 * impersonation was ended (so callers can redirect back to the admin area instead
 * of logging out).
 */
export async function endImpersonationIfActive(): Promise<boolean> {
  const jar = await cookies();
  const saved = jar.get(IMPERSONATOR_COOKIE)?.value;
  if (!saved) return false;

  const claims = await getSessionClaims();
  if (claims) await revokeSession(claims.sid);

  jar.set(SESSION_COOKIE, saved, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  jar.delete(IMPERSONATOR_COOKIE);

  // Impersonation is intentionally not recorded in the audit log.
  return true;
}
