"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { inviteSchema } from "@/lib/validation";
import { createInvite, revokeInvite } from "@/lib/services/invite-service";
import { getChapterSettings, getPublicBaseUrl } from "@/lib/services/chapter-service";
import { sendMail } from "@/lib/email/mailer";
import { inviteEmail } from "@/lib/email/templates";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

export async function createInviteAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const parsed = inviteSchema.safeParse({
    expiresInDays: formData.get("expiresInDays"),
    maxUses: formData.get("maxUses") || undefined,
    role: formData.get("role") || "member",
  });
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect("/officer/invites");
  }

  const { invite, rawToken } = await createInvite({
    createdById: officer.id,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays,
    maxUses: parsed.data.maxUses,
  });

  const link = `${await getPublicBaseUrl()}/signup?invite=${rawToken}`;

  const sendTo = String(formData.get("email") ?? "").trim().toLowerCase();
  if (sendTo) {
    try {
      const chapterName = (await getChapterSettings()).chapterName;
      await sendMail({
        to: sendTo,
        ...inviteEmail(link, invite.expiresAt, fullName(officer), chapterName),
      });
      await setFlash("success", `Invite created and emailed to ${sendTo}.`);
    } catch {
      await setFlash("warning", "Invite created, but the email failed to send.");
    }
  } else {
    await setFlash("success", "Invite link created — copy it below to share.");
  }

  await recordAudit({
    actor: officer,
    action: "invite.create",
    summary: `Created a ${parsed.data.role} invite${sendTo ? ` for ${sendTo}` : ""}`,
    targetType: "invite",
    targetId: invite.id,
  });

  // The raw link is shown once via a short-lived cookie, then cleared.
  const { cookies } = await import("next/headers");
  (await cookies()).set("nhs_last_invite", link, {
    path: "/officer/invites",
    maxAge: 120,
    sameSite: "lax",
  });

  revalidatePath("/officer/invites");
  redirect("/officer/invites");
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const id = Number(formData.get("inviteId"));
  if (Number.isInteger(id)) {
    await revokeInvite(id);
    await recordAudit({
      actor: officer,
      action: "invite.revoke",
      summary: `Revoked invite #${id}`,
      targetType: "invite",
      targetId: id,
    });
    await setFlash("info", "Invite revoked.");
  }
  revalidatePath("/officer/invites");
  redirect("/officer/invites");
}
