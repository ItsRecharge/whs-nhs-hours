"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifySessionToken } from "@/lib/session-token";
import { validateSession } from "@/lib/services/session-service";
import { setFlash } from "@/lib/flash";
import {
  IMPERSONATOR_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/constants";
import type { Role } from "@/lib/constants";

const OFFICERS_PATH = "/officer/officers";

function homeFor(role: string): string {
  return role === "officer" ? "/officer/dashboard" : "/member/dashboard";
}

/**
 * The stashed token only means "impersonating" if it's a live session for someone
 * other than the current user. Anything else (expired, revoked, or the admin's own
 * session left behind after logging back in) is stale and gets overwritten.
 */
async function impersonationActive(
  saved: string | undefined,
  currentUserId: number,
): Promise<boolean> {
  if (!saved) return false;
  const claims = await verifySessionToken(saved);
  if (!claims) return false;
  const session = await validateSession(claims.sid, claims.secret);
  return !!session && session.userId !== currentUserId;
}

/**
 * Bootstrap-only: start acting as another user. The admin's own session token is
 * stashed in a cookie so logging out can restore it; the main session cookie is
 * pointed at a fresh session for the target, so the whole app behaves as the
 * target. To exit, the admin just logs out (see endImpersonationIfActive).
 */
export async function startImpersonationAction(formData: FormData): Promise<void> {
  const admin = await requireUser("officer");
  if (!admin.isBootstrapOfficer) {
    await setFlash("danger", "Only an admin can impersonate users.");
    redirect(OFFICERS_PATH);
  }

  const jar = await cookies();
  if (await impersonationActive(jar.get(IMPERSONATOR_COOKIE)?.value, admin.id)) {
    await setFlash("warning", "Log out of your current impersonation first.");
    redirect(OFFICERS_PATH);
  }

  const targetId = Number(formData.get("userId"));
  if (targetId === admin.id) {
    await setFlash("info", "You can't impersonate yourself.");
    redirect(OFFICERS_PATH);
  }

  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target || target.deactivatedAt) {
    await setFlash("danger", "That account is unavailable to impersonate.");
    redirect(OFFICERS_PATH);
  }

  // Stash the admin's current session token to restore on logout.
  const current = jar.get(SESSION_COOKIE)?.value;
  if (current) {
    jar.set(IMPERSONATOR_COOKIE, current, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  // Point the session cookie at a new session for the target.
  await createSession({
    userId: target.id,
    role: target.role as Role,
    name: fullName(target),
  });

  // Impersonation is intentionally not recorded in the audit log.

  redirect(homeFor(target.role));
}
