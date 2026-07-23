"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { setEventOrganizers } from "@/lib/services/organizer-service";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

/** Officer sets which organizer accounts partner on an event. */
export async function setEventOrganizersAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const eventId = Number(formData.get("eventId"));
  const editPath = `/officer/events/${eventId}/edit`;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) redirect("/officer/events");

  const requestedIds = formData
    .getAll("organizerIds")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  // Only actual organizer-role accounts can be linked.
  const valid = await db.user.findMany({
    where: { id: { in: requestedIds }, role: "organizer" },
    select: { id: true },
  });
  await setEventOrganizers(eventId, valid.map((v) => v.id));

  await recordAudit({
    actor: officer,
    action: "event.organizers",
    summary: `Linked ${valid.length} organizer${valid.length === 1 ? "" : "s"} to "${event.title}"`,
    targetType: "event",
    targetId: eventId,
  });
  await setFlash("success", "Partner organizers updated.");
  revalidatePath(editPath);
  redirect(editPath);
}
