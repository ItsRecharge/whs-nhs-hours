import { cookies, headers } from "next/headers";
import {
  IMPERSONATOR_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type Role,
} from "./constants";
import {
  signSessionToken,
  verifySessionToken,
  type SessionClaims,
} from "./session-token";
import {
  createSessionRow,
  revokeSession,
  revokeAllUserSessions,
} from "./services/session-service";

export type { SessionClaims };

/** Creates a DB-backed session and sets the signed cookie. */
export async function createSession(payload: {
  userId: number;
  role: Role;
  name: string;
}): Promise<void> {
  const userAgent = (await headers()).get("user-agent") ?? undefined;
  const { sid, secret } = await createSessionRow(payload.userId, userAgent);
  const token = await signSessionToken({
    sid,
    secret,
    role: payload.role,
    name: payload.name,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Verifies only the JWT envelope (no DB) — for quick role/identity reads. */
export async function getSessionClaims(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Revokes the current session and clears the cookie (and any impersonation). */
export async function destroySession(): Promise<void> {
  const claims = await getSessionClaims();
  if (claims) await revokeSession(claims.sid);
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(IMPERSONATOR_COOKIE);
}

/** Revokes all of the current user's sessions, then clears the cookie. */
export async function destroyAllSessions(userId: number): Promise<void> {
  await revokeAllUserSessions(userId);
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(IMPERSONATOR_COOKIE);
}
