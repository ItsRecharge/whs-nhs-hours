"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { createShareLink, revokeShareLink } from "@/lib/services/share-service";
import { getPublicBaseUrl } from "@/lib/services/chapter-service";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

/**
 * Officer creates a public share link for an outside organizer. `kind` is
 * "roster" (from the members page) or "attendance" (from an event's attendance
 * page, with eventId). The raw link is revealed once via a short-lived cookie
 * on the page it was created from.
 */
export async function createShareLinkAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");

  const kind = String(formData.get("kind"));
  const organizerName = String(formData.get("organizerName") ?? "").trim();
  const organizerEmail = String(formData.get("organizerEmail") ?? "").trim();
  const expiresInDays = Number(formData.get("expiresInDays") || 30);
  const eventId = Number(formData.get("eventId")) || undefined;

  const returnPath =
    kind === "attendance" && eventId
      ? `/officer/events/${eventId}/attendance`
      : "/officer/members";

  if (kind !== "roster" && kind !== "attendance") redirect(returnPath);
  if (!organizerName || organizerName.length > 80) {
    await setFlash("danger", "Enter the organizer's name (up to 80 characters).");
    redirect(returnPath);
  }
  if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
    await setFlash("danger", "Expiry must be between 1 and 365 days.");
    redirect(returnPath);
  }
  if (kind === "attendance") {
    const event = await db.event.findUnique({ where: { id: eventId ?? 0 } });
    if (!event) {
      await setFlash("danger", "Event not found.");
      redirect("/officer/events");
    }
  }

  const { link, rawToken } = await createShareLink({
    kind,
    eventId,
    organizerName,
    organizerEmail: organizerEmail || undefined,
    createdById: officer.id,
    expiresInDays,
  });

  const url = `${await getPublicBaseUrl()}/share/${kind}/${rawToken}`;

  await recordAudit({
    actor: officer,
    action: "share.create",
    summary: `Created a ${kind} share link for ${organizerName}${organizerEmail ? ` <${organizerEmail}>` : ""}`,
    targetType: "shareLink",
    targetId: link.id,
  });
  await setFlash("success", `Share link created for ${organizerName} — copy it below.`);

  (await cookies()).set("nhs_last_share", url, {
    path: returnPath,
    maxAge: 120,
    sameSite: "lax",
  });

  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function revokeShareLinkAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const id = Number(formData.get("shareLinkId"));
  if (Number.isInteger(id)) {
    await revokeShareLink(id);
    await recordAudit({
      actor: officer,
      action: "share.revoke",
      summary: `Revoked share link #${id}`,
      targetType: "shareLink",
      targetId: id,
    });
    await setFlash("info", "Share link revoked.");
  }
  revalidatePath("/officer/invites");
  redirect("/officer/invites");
}
