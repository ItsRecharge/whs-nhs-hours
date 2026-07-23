"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { activeCycleYear } from "@/lib/domain-reminder";

/** Officer dismisses the domain-renewal popup for the current cycle year. */
export async function dismissDomainReminderAction(): Promise<void> {
  const officer = await requireUser("officer");
  const year = activeCycleYear();
  if (year === null) return;

  await db.domainReminderDismissal.upsert({
    where: { userId_year: { userId: officer.id, year } },
    update: {},
    create: { userId: officer.id, year },
  });

  revalidatePath("/officer", "layout");
}
