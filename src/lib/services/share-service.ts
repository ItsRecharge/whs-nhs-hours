import type { ShareLink } from "@prisma/client";
import { db } from "../db";
import { generateToken, hashToken } from "../tokens";
import type { ShareLinkKind } from "../constants";

/**
 * Tokenized public links for outside organizers — no account needed. Mirrors
 * the invite-token pattern: only a sha256 of the token is stored, the raw link
 * is shown once, and links can expire or be revoked.
 */

export async function createShareLink(params: {
  kind: ShareLinkKind;
  eventId?: number;
  organizerName: string;
  organizerEmail?: string;
  createdById: number;
  expiresInDays: number;
}): Promise<{ link: ShareLink; rawToken: string }> {
  if (params.kind === "attendance" && !params.eventId) {
    throw new Error("Attendance share links need an event");
  }
  const rawToken = generateToken();
  const link = await db.shareLink.create({
    data: {
      tokenHash: hashToken(rawToken),
      kind: params.kind,
      eventId: params.kind === "attendance" ? params.eventId : null,
      organizerName: params.organizerName,
      organizerEmail: params.organizerEmail || null,
      createdById: params.createdById,
      expiresAt: new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000),
    },
  });
  return { link, rawToken };
}

/** Validates a raw token for the given kind; null if unusable. */
export async function validateShareLink(
  raw: string,
  kind: ShareLinkKind,
): Promise<ShareLink | null> {
  if (!raw || raw.length > 128) return null;
  const link = await db.shareLink.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!link || link.kind !== kind) return null;
  if (link.revokedAt || link.expiresAt < new Date()) return null;
  return link;
}

export async function revokeShareLink(id: number): Promise<void> {
  await db.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
}

export async function listShareLinks() {
  return db.shareLink.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: {
      event: { select: { id: true, title: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
