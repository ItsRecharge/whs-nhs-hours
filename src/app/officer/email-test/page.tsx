import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { getIntegrationStatus } from "@/lib/services/integration-service";
import { EmailTestForm } from "@/components/EmailTestForm";

export const metadata = { title: "Email test" };

export default async function EmailTestPage() {
  const officer = await requireUser("officer");
  const status = await getIntegrationStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email test</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send any chapter email template, with sample data, to an address of your
          choice to verify delivery and preview formatting.
        </p>
      </div>

      {status.mailConfigured ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Email is configured — sending as{" "}
          <span className="font-medium">{status.gmailUser}</span>.
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Email isn&apos;t configured yet. Set it up under{" "}
          <Link href="/officer/integrations" className="font-medium underline">
            Integrations
          </Link>{" "}
          before sending a test.
        </div>
      )}

      <EmailTestForm defaultTo={officer.email} />
    </div>
  );
}
