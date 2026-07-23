import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { listMembersWithProgress } from "@/lib/services/member-service";

export default async function OfficerMembersPage() {
  await requireUser("officer");
  const members = await listMembersWithProgress();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member roster</h1>
          <p className="mt-1 text-sm text-gray-500">
            Click a member to edit their info and adjust hours.
          </p>
        </div>
        <a
          href="/officer/export/members.csv"
          className="text-sm font-medium text-indigo-700 hover:underline"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {members.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3 text-center">Class</th>
                <th className="px-5 py-3 text-right">Earned</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr
                  key={m.id}
                  className={`transition hover:bg-gray-50 ${m.deactivatedAt ? "opacity-50" : ""}`}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/officer/members/${m.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-700 hover:underline"
                    >
                      {m.firstName} {m.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{m.email}</td>
                  <td className="px-5 py-3 text-center text-gray-600">
                    {m.graduationYear ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {m.earned}
                  </td>
                  <td className="px-5 py-3">
                    {m.deactivatedAt ? (
                      <span className="text-xs font-medium text-gray-500">Inactive</span>
                    ) : m.emailVerifiedAt ? (
                      <span className="text-xs font-medium text-green-700">Verified</span>
                    ) : (
                      <span className="text-xs font-medium text-yellow-700">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/officer/members/${m.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
