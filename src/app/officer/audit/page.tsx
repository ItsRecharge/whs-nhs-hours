import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { listAuditLog } from "@/lib/services/audit-service";
import { ClearAuditLogButton } from "@/components/ClearAuditLogButton";

function formatWhen(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AuditLogPage() {
  const me = await requireUser("officer");
  const entries = await listAuditLog(300);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/officer/admin"
            className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Audit log</h1>
          <p className="text-sm text-gray-500">
            A record of officer actions, newest first.
          </p>
        </div>
        {me.isBootstrapOfficer ? <ClearAuditLogButton /> : null}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No actions recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Officer</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                    {formatWhen(e.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{e.actorName}</td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {e.action}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
