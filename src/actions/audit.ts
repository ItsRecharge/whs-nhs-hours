"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { clearAuditLog, recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

const AUDIT_PATH = "/officer/admin";

/** Bootstrap-only: wipe the audit log, leaving a single entry recording the clear. */
export async function clearAuditLogAction(): Promise<void> {
  const me = await requireUser("officer");
  if (!me.isBootstrapOfficer) {
    await setFlash("danger", "Only the bootstrap officer can clear the audit log.");
    redirect(AUDIT_PATH);
  }

  await clearAuditLog();
  await recordAudit({
    actor: me,
    action: "audit.clear",
    summary: "Cleared the audit log",
  });

  await setFlash("success", "Audit log cleared.");
  revalidatePath(AUDIT_PATH);
  redirect(AUDIT_PATH);
}
