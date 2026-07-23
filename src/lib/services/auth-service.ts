import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { db } from "../db";

// Compared against when the email doesn't exist, so login takes the same time
// for unknown and known emails (no account enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; reason: "invalid_credentials" | "unverified" | "deactivated" };

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<LoginResult> {
  const user = await db.user.findUnique({ where: { email } });
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) return { ok: false, reason: "invalid_credentials" };
  if (user.deactivatedAt) return { ok: false, reason: "deactivated" };
  if (!user.emailVerifiedAt) return { ok: false, reason: "unverified" };
  return { ok: true, user };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Constant-time check of a plaintext password against a stored hash. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
