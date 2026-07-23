import type { MemberProgress } from "@/lib/services/member-service";

/**
 * Read-only roster for outside organizers (public share links and organizer
 * accounts). Deliberately minimal: no emails, no per-category detail.
 */
export function RosterReadOnly({ members }: { members: MemberProgress[] }) {
  const active = members.filter((m) => !m.deactivatedAt);

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      {active.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">No active members.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">House</th>
              <th className="px-5 py-3 text-center">Class</th>
              <th className="px-5 py-3 text-right">Hours</th>
              <th className="px-5 py-3 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {m.firstName} {m.lastName ? `${m.lastName[0]}.` : ""}
                </td>
                <td className="px-5 py-3 text-gray-600">{m.house?.name ?? "—"}</td>
                <td className="px-5 py-3 text-center text-gray-600">
                  {m.graduationYear ?? "—"}
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {m.earned}
                </td>
                <td className="px-5 py-3 text-right text-gray-600">{m.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
