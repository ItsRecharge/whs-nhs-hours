import type { User } from "@prisma/client";
import { db } from "../db";

/**
 * Admins (`isBootstrapOfficer`) are protected from demotion/removal for as long
 * as they hold the role. There can be any number of admins; an admin can grant
 * the role to another officer or revoke it from another admin (see
 * grantAdminAction / revokeAdminAction). The last admin can never be revoked.
 */
export function isBootstrapProtected(user: Pick<User, "isBootstrapOfficer">): boolean {
  return user.isBootstrapOfficer;
}

/** Every active admin account. */
export function listAdmins(): Promise<User[]> {
  return db.user.findMany({
    where: { isBootstrapOfficer: true, deactivatedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export class LastAdminError extends Error {
  constructor() {
    super("There must always be at least one admin.");
    this.name = "LastAdminError";
  }
}

export class NotAnOfficerError extends Error {
  constructor() {
    super("Only an active officer can be made an admin.");
    this.name = "NotAnOfficerError";
  }
}

/** Flags an active officer as an admin. Idempotent. */
export async function grantAdmin(userId: number): Promise<User> {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "officer" || target.deactivatedAt) {
    throw new NotAnOfficerError();
  }
  if (target.isBootstrapOfficer) return target;
  return db.user.update({ where: { id: userId }, data: { isBootstrapOfficer: true } });
}

/**
 * Removes the admin flag from a user. Refuses when they are the only remaining
 * active admin, so the chapter can never end up with none.
 */
export async function revokeAdmin(userId: number): Promise<User> {
  return db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotAnOfficerError();
    if (!target.isBootstrapOfficer) return target;
    const otherAdmins = await tx.user.count({
      where: { isBootstrapOfficer: true, deactivatedAt: null, id: { not: userId } },
    });
    if (otherAdmins === 0) throw new LastAdminError();
    return tx.user.update({ where: { id: userId }, data: { isBootstrapOfficer: false } });
  });
}
