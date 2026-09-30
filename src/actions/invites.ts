"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { inviteSchema, parseEmailList } from "@/lib/validation";
import { createInvite, revokeInvite } from "@/lib/services/invite-service";
import { getChapterSettings, getPublicBaseUrl } from "@/lib/services/chapter-service";
import { sendMailBatch } from "@/lib/email/mailer";
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

  // Optional recipients: one or many, separated by commas (or ; / whitespace).
  const { emails: recipients, invalid } = parseEmailList(
    String(formData.get("email") ?? ""),
  );
  if (invalid.length > 0) {
    await setFlash("danger", `Not a valid email: ${invalid.join(", ")}`);
    redirect("/officer/invites");
  }
  if (parsed.data.maxUses !== undefined && parsed.data.maxUses < recipients.length) {
    await setFlash(
      "danger",
      `Max uses (${parsed.data.maxUses}) is lower than the number of recipients (${recipients.length}). Raise it or leave it blank.`,
    );
    redirect("/officer/invites");
  }

  const { invite, rawToken } = await createInvite({
    createdById: officer.id,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays,
    maxUses: parsed.data.maxUses,
  });

  const link = `${await getPublicBaseUrl()}/signup?invite=${rawToken}`;

  if (recipients.length > 0) {
    const chapterName = (await getChapterSettings()).chapterName;
    const content = inviteEmail(link, invite.expiresAt, fullName(officer), chapterName);
    const { unconfigured, sent, failed } = await sendMailBatch(recipients, content);
    if (unconfigured) {
      await setFlash(
        "warning",
        "Invite created, but email isn't set up, so nothing was sent. Copy the link below.",
      );
    } else if (failed.length === 0) {
      await setFlash(
        "success",
        recipients.length === 1
          ? `Invite created and emailed to ${recipients[0]}.`
          : `Invite created and emailed to ${sent} people.`,
      );
    } else if (sent === 0) {
      await setFlash("warning", "Invite created, but the email failed to send. Copy the link below.");
    } else {
      // Flash lives in a cookie (~4 KB) — don't list every failure.
      const shown = failed.slice(0, 10).join(", ");
      const more = failed.length > 10 ? ` and ${failed.length - 10} more` : "";
      await setFlash(
        "warning",
        `Invite created and emailed to ${sent} of ${recipients.length}. Failed: ${shown}${more}. Copy the link below.`,
      );
    }
  } else {
    await setFlash("success", "Invite link created — copy it below to share.");
  }

  await recordAudit({
    actor: officer,
    action: "invite.create",
    summary: `Created a ${parsed.data.role} invite${
      recipients.length > 0 ? ` for ${recipients.join(", ")}` : " link"
    }`,
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
