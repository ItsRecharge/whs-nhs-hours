"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { chapterSettingsSchema } from "@/lib/validation";
import { updateChapterSettings } from "@/lib/services/chapter-service";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

export async function updateChapterAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const parsed = chapterSettingsSchema.safeParse({
    chapterName: formData.get("chapterName"),
    totalHoursGoal: formData.get("totalHoursGoal"),
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
