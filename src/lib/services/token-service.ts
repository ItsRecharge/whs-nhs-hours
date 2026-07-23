import type { Prisma, User } from "@prisma/client";
import { db } from "../db";
import { generateToken, hashToken } from "../tokens";
import {
  RESET_TOKEN_TTL_MS,
  VERIFICATION_TOKEN_TTL_MS,
  type TokenType,
} from "../constants";

type Client = Prisma.TransactionClient | typeof db;

/**
 * Issues a fresh auth token, invalidating any prior unused tokens of the same
 * type for the user. Returns the raw token (only emailed, never stored).
 */
export async function issueAuthToken(
  userId: number,
  type: TokenType,
  client: Client = db,
): Promise<string> {
  const raw = generateToken();
  const ttl = type === "password_reset" ? RESET_TOKEN_TTL_MS : VERIFICATION_TOKEN_TTL_MS;
  await client.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  await client.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttl),
    },
  });
  return raw;
}

/**
 * Consumes a token if valid (exists, right type, unused, unexpired), marking it
 * used. Returns the owning user, or null if invalid.
 */
export async function consumeAuthToken(
  raw: string,
  type: TokenType,
): Promise<User | null> {
  const token = await db.authToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }
  await db.authToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token.user;
}
