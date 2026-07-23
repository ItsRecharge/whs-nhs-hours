"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { chapterSettingsSchema } from "@/lib/validation";
import { updateChapterSettings } from "@/lib/services/chapter-service";
import { listHouses, renameHouse } from "@/lib/services/house-service";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

export async function updateChapterAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const parsed = chapterSettingsSchema.safeParse({
    chapterName: formData.get("chapterName"),
    totalHoursGoal: formData.get("totalHoursGoal"),
    outsideHoursCap: formData.get("outsideHoursCap"),
    schoolYearEndMonth: formData.get("schoolYearEndMonth"),
    schoolYearEndDay: formData.get("schoolYearEndDay"),
    publicUrl: formData.get("publicUrl") ?? "",
  });
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect("/officer/admin");
  }

  await updateChapterSettings(parsed.data);
  await recordAudit({
    actor: officer,
    action: "chapter.settings",
    summary: `Updated chapter settings (goal ${parsed.data.totalHoursGoal} hrs)`,
  });
  await setFlash("success", "Chapter settings updated.");
  revalidatePath("/officer/admin");
  redirect("/officer/admin");
}

export async function updateHousesAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const houses = await listHouses();

  const renames: string[] = [];
  for (const house of houses) {
    const name = String(formData.get(`house-${house.id}`) ?? "").trim();
    if (!name || name.length > 40) {
      await setFlash("danger", "House names must be 1–40 characters.");
      redirect("/officer/admin");
    }
    if (name !== house.name) {
      await renameHouse(house.id, name);
      renames.push(`"${house.name}" → "${name}"`);
    }
  }

  if (renames.length > 0) {
    await recordAudit({
      actor: officer,
      action: "chapter.houses",
      summary: `Renamed houses: ${renames.join(", ")}`,
    });
  }
  await setFlash("success", "House names saved.");
  revalidatePath("/officer/admin");
  redirect("/officer/admin");
}
