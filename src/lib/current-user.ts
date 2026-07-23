import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { getSessionClaims } from "./session";
import { validateSession } from "./services/session-service";
import type { Role } from "./constants";

/**
 * Resolve the logged-in user from the session cookie. Validates the session row
 * against the DB so a revoked/expired session — or a deleted/demoted user —
 * can't keep acting on a stale cookie.
 */
export async function getCurrentUser(): Promise<User | null> {
  const claims = await getSessionClaims();
  if (!claims) return null;
  const session = await validateSession(claims.sid, claims.secret);
  return session?.user ?? null;
}

export async function requireUser(role?: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) {
    redirect(user.role === "officer" ? "/officer/dashboard" : "/member/dashboard");
  }
  return user;
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
