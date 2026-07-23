import type { User } from "@prisma/client";
import { db } from "../db";
import { fullName } from "../current-user";

export interface AuditInput {
  actor: Pick<User, "id" | "firstName" | "lastName">;
  action: string; // e.g. "event.create"
  summary: string;
  targetType?: string;
  targetId?: number;
}

/** Records an officer action. Never throws into the caller. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actor.id,
        actorName: fullName(input.actor),
        action: input.action,
        summary: input.summary,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record:", err);
  }
}

export async function listAuditLog(limit = 200) {
  return db.auditLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}

/** Deletes every audit log entry. Bootstrap-only; gate at the action layer. */
export async function clearAuditLog(): Promise<void> {
  await db.auditLog.deleteMany({});
}
