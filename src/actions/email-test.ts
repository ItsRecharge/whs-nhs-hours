"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { emailSchema } from "@/lib/validation";
import { sendMail } from "@/lib/email/mailer";
import { TEST_TEMPLATES } from "@/lib/email/test-registry";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

export async function sendTestEmailAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");

  const templateKey = String(formData.get("template") ?? "");
  const entry = TEST_TEMPLATES[templateKey];
  if (!entry) {
    await setFlash("danger", "Unknown email template.");
    redirect("/officer/admin");
  }

  const parsedTo = emailSchema.safeParse(formData.get("to"));
  if (!parsedTo.success) {
    await setFlash("danger", "Enter a valid recipient email address.");
    redirect("/officer/admin");
  }
  const to = parsedTo.data;

  const values: Record<string, string> = {};
  for (const field of entry.fields) {
    values[field.name] = String(formData.get(field.name) ?? field.default);
  }

  const content = entry.build(values);

  try {
    const sent = await sendMail({ to, ...content });
    if (sent) {
      await recordAudit({
        actor: officer,
        action: "email.test",
        summary: `Sent test email "${entry.label}" to ${to}`,
      });
      await setFlash("success", `Test email sent to ${to}.`);
    } else {
      await setFlash(
        "warning",
        "Email isn't configured yet — set it up under Integrations.",
      );
    }
  } catch (err) {
    console.error("[email-test] send failed:", err);
    await setFlash("danger", "Sending failed — check the email configuration.");
  }

  redirect("/officer/admin");
}
