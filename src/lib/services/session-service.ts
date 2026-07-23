import type { Session, User } from "@prisma/client";
import { db } from "../db";
import { generateToken, hashToken } from "../tokens";
import { SESSION_TTL_SECONDS } from "../constants";

// Refresh lastUsedAt at most this often to avoid a write on every request.
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Creates a Session row and returns the id + raw secret to embed in the cookie. */
export async function createSessionRow(
  userId: number,
  userAgent?: string,
): Promise<{ sid: string; secret: string }> {
  const secret = generateToken();
  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(secret),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
      userAgent: userAgent ?? null,
    },
  });
  return { sid: session.id, secret };
}

/**
 * Validates a session against the database: it must exist, match the secret,
 * not be revoked, and not be expired. Returns the session + user, or null.
 */
export async function validateSession(
  sid: string,
  secret: string,
): Promise<(Session & { user: User }) | null> {
  const session = await db.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    session.tokenHash !== hashToken(secret)
  ) {
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({
      where: { id: sid },
      data: { lastUsedAt: new Date() },
    });
  }
  return session;
}

export async function revokeSession(sid: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sid, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes every active session for a user (password reset, log out everywhere). */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
