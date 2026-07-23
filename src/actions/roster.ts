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
    await setFlash("warning", "Only the bootstrap officer can change roles.");
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
