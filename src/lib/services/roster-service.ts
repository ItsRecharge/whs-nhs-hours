import type { HourReport } from "@prisma/client";
import { db } from "../db";
import { revokeAllUserSessions } from "./session-service";
import type { Role } from "../constants";
import { isBootstrapProtected } from "./bootstrap-service";

export interface OfficerRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  deactivatedAt: Date | null;
  isBootstrapOfficer: boolean;
  createdAt: Date;
}

/** Every officer account. The bootstrap officer is protected until the role is handed off. */
export async function listOfficers(): Promise<OfficerRow[]> {
  return db.user.findMany({
    where: { role: "officer" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      deactivatedAt: true,
      isBootstrapOfficer: true,
      createdAt: true,
    },
    orderBy: { firstName: "asc" },
  });
}

export class BootstrapOfficerProtectionError extends Error {
  constructor() {
    super("The bootstrap officer cannot be changed during the first year.");
    this.name = "BootstrapOfficerProtectionError";
  }
}

async function assertBootstrapOfficerEditable(userId: number): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, isBootstrapOfficer: true },
  });
  if (user && isBootstrapProtected(user)) {
    throw new BootstrapOfficerProtectionError();
  }
}

/**
 * Records an officer hours adjustment as a pre-approved HourReport. `hours` may
 * be negative to deduct hours; it flows through the normal earned-hours sum.
 */
export async function createAdjustment(input: {
  userId: number;
  description: string;
  date: Date;
  hours: number;
  officerId: number;
}): Promise<HourReport> {
  return db.hourReport.create({
    data: {
      userId: input.userId,
      description: input.description,
      date: input.date,
      hoursRequested: input.hours,
      status: "approved",
      reviewedById: input.officerId,
      reviewedAt: new Date(),
    },
  });
}

export async function setMemberRole(userId: number, role: Role): Promise<void> {
  if (role === "member" || role === "officer") {
    await assertBootstrapOfficerEditable(userId);
  }
  await db.user.update({ where: { id: userId }, data: { role } });
}

/** Deactivating a member also revokes their sessions so they're logged out. */
export async function setMemberActive(userId: number, active: boolean): Promise<void> {
  if (!active) {
    await assertBootstrapOfficerEditable(userId);
  }
  await db.user.update({
    where: { id: userId },
    data: { deactivatedAt: active ? null : new Date() },
  });
  if (!active) await revokeAllUserSessions(userId);
}
