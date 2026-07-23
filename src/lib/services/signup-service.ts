import { Prisma } from "@prisma/client";
import { db } from "../db";
import { hashToken } from "../tokens";
import { hashPassword } from "./auth-service";
import { issueAuthToken } from "./token-service";
import type { Role } from "../constants";

export type SignupResult =
  | { ok: true; userId: number; email: string; firstName: string; verificationToken: string }
  | {
      ok: false;
      reason: "invalid_invite" | "invite_exhausted" | "email_taken";
    };

/**
 * Creates a user from an invite atomically: re-validates the invite and bumps
 * its useCount inside the same transaction as the user create, so concurrent
 * signups can't exceed maxUses. Returns a verification token to email.
 */
export async function signupWithInvite(params: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  graduationYear?: number;
  rawInviteToken: string;
}): Promise<SignupResult> {
  const passwordHash = await hashPassword(params.password);
  const inviteHash = hashToken(params.rawInviteToken);

  try {
    return await db.$transaction(async (tx) => {
      const invite = await tx.inviteToken.findUnique({ where: { tokenHash: inviteHash } });
      const now = new Date();
      if (!invite || invite.revokedAt || invite.expiresAt < now) {
        return { ok: false, reason: "invalid_invite" } as const;
      }
      if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
        return { ok: false, reason: "invite_exhausted" } as const;
      }

      const user = await tx.user.create({
        data: {
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          passwordHash,
          graduationYear: params.graduationYear ?? null,
          role: invite.role as Role,
        },
      });

      // This use either bumps the count or, if it exhausts a limited invite,
      // removes it entirely so the spent link disappears from the roster.
      const exhaustsInvite =
        invite.maxUses !== null && invite.useCount + 1 >= invite.maxUses;
      if (exhaustsInvite) {
        await tx.inviteToken.delete({ where: { id: invite.id } });
      } else {
        await tx.inviteToken.update({
          where: { id: invite.id },
          data: { useCount: { increment: 1 } },
        });
      }

      const verificationToken = await issueAuthToken(user.id, "email_verification", tx);

      return {
        ok: true,
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        verificationToken,
      } as const;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "email_taken" };
    }
    throw err;
  }
}
