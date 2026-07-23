import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { getIntegrationStatus } from "@/lib/services/integration-service";
import { getFlash } from "@/lib/flash";
import { FlashMessages } from "@/components/FlashMessages";
import { MailForm, SheetsForm } from "./IntegrationForms";

export default async function IntegrationsPage() {
  await requireUser("officer");
  const [status, flash] = await Promise.all([getIntegrationStatus(), getFlash()]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/officer/admin"
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500">
          Email and Google Sheets backup. Secrets are encrypted at rest and never shown
          again. Saving requires your password.
        </p>
      </div>

      <FlashMessages messages={flash} />

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <MailForm gmailUser={status.gmailUser} configured={status.mailConfigured} />
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <SheetsForm
          spreadsheetId={status.sheetsSpreadsheetId}
          serviceEmail={status.sheetsServiceEmail}
          rosterTab={status.sheetsRosterTab}
          logTab={status.sheetsLogTab}
          configured={status.sheetsConfigured}
        />
      </section>
    </div>
  );
}
