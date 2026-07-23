import type { InviteToken } from "@prisma/client";
import { db } from "../db";
import { generateToken, hashToken } from "../tokens";
import type { Role } from "../constants";

export interface InviteValidation {
  valid: boolean;
  reason?: "not_found" | "revoked" | "expired" | "exhausted";
  invite?: InviteToken;
}

export async function createInvite(params: {
  createdById: number;
  role: Role;
  expiresInDays: number;
  maxUses?: number;
}): Promise<{ invite: InviteToken; rawToken: string }> {
  const rawToken = generateToken();
  const invite = await db.inviteToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      createdById: params.createdById,
      role: params.role,
      expiresAt: new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000),
      maxUses: params.maxUses ?? null,
    },
  });
  return { invite, rawToken };
}

export async function validateInvite(raw: string): Promise<InviteValidation> {
  const invite = await db.inviteToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!invite) return { valid: false, reason: "not_found" };
  if (invite.revokedAt) return { valid: false, reason: "revoked" };
  if (invite.expiresAt < new Date()) return { valid: false, reason: "expired" };
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return { valid: false, reason: "exhausted" };
  }
  return { valid: true, invite };
}

export async function revokeInvite(id: number): Promise<void> {
  await db.inviteToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function listActiveInvites(): Promise<
  (InviteToken & { createdBy: { firstName: string; lastName: string } })[]
> {
  return db.inviteToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}
