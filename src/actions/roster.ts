"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { adjustHoursSchema } from "@/lib/validation";
import {
  createAdjustment,
  BootstrapOfficerProtectionError,
  setMemberActive,
  setMemberRole,
} from "@/lib/services/roster-service";
import { recordAudit } from "@/lib/services/audit-service";
import {
  syncSheetsAfterChange,
} from "@/lib/services/sheet-sync-service";
import {
  assignHouse,
  bulkAssignHouse,
  HouseAssignmentError,
} from "@/lib/services/house-service";
import { graduatedSeniorInfo } from "@/lib/services/member-service";
import { setFlash } from "@/lib/flash";
import type { Role } from "@/lib/constants";

function memberPath(id: number) {
  return `/officer/members/${id}`;
}

async function targetName(userId: number): Promise<string> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return u ? fullName(u) : `user #${userId}`;
}

export async function adjustHoursAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userId = Number(formData.get("userId"));

  const parsed = adjustHoursSchema.safeParse({
    description: formData.get("description"),
    date: formData.get("date"),
    hours: formData.get("hours"),
  });
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect(memberPath(userId));
  }

  await createAdjustment({
    userId,
    description: parsed.data.description,
    date: parsed.data.date,
    hours: parsed.data.hours,
    officerId: officer.id,
  });
  const member = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  const adjustment = parsed.data;
  after(() =>
    syncSheetsAfterChange(
      member
        ? [
            {
              memberName: fullName(member),
              email: member.email,
              hours: adjustment.hours,
              source: `Adjustment: ${adjustment.description}`,
              date: adjustment.date,
              recordedBy: fullName(officer),
            },
          ]
        : undefined,
    ),
  );
  await recordAudit({
    actor: officer,
    action: "roster.adjustHours",
    summary: `Adjusted ${await targetName(userId)} by ${parsed.data.hours > 0 ? "+" : ""}${parsed.data.hours} hrs ("${parsed.data.description}")`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash(
    "success",
    `${parsed.data.hours > 0 ? "Added" : "Deducted"} ${Math.abs(parsed.data.hours)} hrs.`,
  );
  revalidatePath(memberPath(userId));
  redirect(memberPath(userId));
}

export async function setRoleAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userId = Number(formData.get("userId"));
  const role = String(formData.get("role")) as Role;

  // Promotions/demotions are a bootstrap-officer power.
  if (!officer.isBootstrapOfficer) {
    await setFlash("warning", "Only the admin can change roles.");
    redirect(memberPath(userId));
  }
  if (userId === officer.id) {
    await setFlash("warning", "You can't change your own role.");
    redirect(memberPath(userId));
  }
  if (role !== "member" && role !== "officer") {
    redirect(memberPath(userId));
  }

  try {
    await setMemberRole(userId, role);
  } catch (err) {
    if (err instanceof BootstrapOfficerProtectionError) {
      await setFlash("warning", err.message);
      redirect(memberPath(userId));
    }
    throw err;
  }
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: role === "officer" ? "roster.promote" : "roster.demote",
    summary: `${role === "officer" ? "Promoted" : "Demoted"} ${await targetName(userId)} to ${role}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash("success", role === "officer" ? "Promoted to officer." : "Set to member.");
  revalidatePath(memberPath(userId));
  redirect(memberPath(userId));
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userId = Number(formData.get("userId"));
  const active = formData.get("active") === "true";

  if (userId === officer.id) {
    await setFlash("warning", "You can't deactivate your own account.");
    redirect(memberPath(userId));
  }

  try {
    await setMemberActive(userId, active);
  } catch (err) {
    if (err instanceof BootstrapOfficerProtectionError) {
      await setFlash("warning", err.message);
      redirect(memberPath(userId));
    }
    throw err;
  }
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: active ? "roster.reactivate" : "roster.deactivate",
    summary: `${active ? "Reactivated" : "Deactivated"} ${await targetName(userId)}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash("info", active ? "Member reactivated." : "Member deactivated.");
  revalidatePath(memberPath(userId));
  redirect(memberPath(userId));
}

export async function setHouseAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userId = Number(formData.get("userId"));
  const raw = String(formData.get("houseId") ?? "");
  const houseId = raw ? Number(raw) : null;

  if (!Number.isInteger(userId) || userId <= 0) {
    await setFlash("warning", "Invalid member.");
    redirect("/officer/members");
  }
  if (houseId !== null && (!Number.isInteger(houseId) || houseId <= 0)) {
    await setFlash("warning", "Invalid house.");
    redirect(memberPath(userId));
  }

  try {
    await assignHouse(userId, houseId);
  } catch (err) {
    if (err instanceof HouseAssignmentError) {
      await setFlash("warning", err.message);
      redirect(memberPath(userId));
    }
    throw err;
  }
  const houseName = houseId
    ? (await db.house.findUnique({ where: { id: houseId } }))?.name ?? "a house"
    : null;
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "roster.house",
    summary: houseName
      ? `Assigned ${await targetName(userId)} to ${houseName}`
      : `Cleared house for ${await targetName(userId)}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash("success", houseName ? `Assigned to ${houseName}.` : "House cleared.");
  revalidatePath(memberPath(userId));
  redirect(memberPath(userId));
}

function selectedUserIds(formData: FormData): number[] {
  return formData
    .getAll("userIds")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function bulkDeactivateAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userIds = selectedUserIds(formData).filter((id) => id !== officer.id);
  if (userIds.length === 0) {
    await setFlash("warning", "No members selected.");
    redirect("/officer/members");
  }

  let count = 0;
  for (const id of userIds) {
    try {
      await setMemberActive(id, false); // also revokes their sessions
      count++;
    } catch (err) {
      if (!(err instanceof BootstrapOfficerProtectionError)) throw err;
    }
  }
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "roster.bulkDeactivate",
    summary: `Bulk-deactivated ${count} member${count === 1 ? "" : "s"}`,
  });
  await setFlash("info", `Deactivated ${count} member${count === 1 ? "" : "s"}.`);
  revalidatePath("/officer/members");
  redirect("/officer/members");
}

export async function bulkAssignHouseAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userIds = selectedUserIds(formData);
  const raw = String(formData.get("houseId") ?? "");
  const houseId = raw ? Number(raw) : null;
  if (userIds.length === 0) {
    await setFlash("warning", "No members selected.");
    redirect("/officer/members");
  }

  if (houseId !== null && (!Number.isInteger(houseId) || houseId <= 0)) {
    await setFlash("warning", "Invalid house.");
    redirect("/officer/members");
  }

  let count: number;
  try {
    count = await bulkAssignHouse(userIds, houseId);
  } catch (err) {
    if (err instanceof HouseAssignmentError) {
      await setFlash("warning", err.message);
      redirect("/officer/members");
    }
    throw err;
  }
  const houseName = houseId
    ? (await db.house.findUnique({ where: { id: houseId } }))?.name ?? "a house"
    : "no house";
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "roster.bulkHouse",
    summary: `Assigned ${count} member${count === 1 ? "" : "s"} to ${houseName}`,
  });
  await setFlash("success", `Assigned ${count} member${count === 1 ? "" : "s"} to ${houseName}.`);
  revalidatePath("/officer/members");
  redirect("/officer/members");
}

/** Deactivates every still-active member whose class has graduated. */
export async function deactivateGraduatesAction(): Promise<void> {
  const officer = await requireUser("officer");
  const { count, cutoffYear } = await graduatedSeniorInfo();
  if (count === 0) {
    await setFlash("info", "No graduated members to deactivate.");
    redirect("/officer/members");
  }

  const graduates = await db.user.findMany({
    where: {
      role: "member",
      deactivatedAt: null,
      graduationYear: { not: null, lte: cutoffYear },
    },
    select: { id: true },
  });

  let deactivated = 0;
  for (const g of graduates) {
    try {
      await setMemberActive(g.id, false);
      deactivated++;
    } catch (err) {
      if (!(err instanceof BootstrapOfficerProtectionError)) throw err;
    }
  }
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "roster.deactivateGraduates",
    summary: `Deactivated ${deactivated} graduated member${deactivated === 1 ? "" : "s"} (Class of ${cutoffYear} and earlier)`,
  });
  await setFlash(
    "success",
    `Deactivated ${deactivated} graduated member${deactivated === 1 ? "" : "s"}.`,
  );
  revalidatePath("/officer/members");
  redirect("/officer/members");
}
