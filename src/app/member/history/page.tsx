import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { hoursHistoryForUser } from "@/lib/services/history-service";
import { hoursEarnedForUser } from "@/lib/services/member-service";
import { getTotalGoal } from "@/lib/services/chapter-service";
import { schoolYearRange } from "@/lib/hours";
import { formatEventDate } from "@/lib/format";

export default async function MemberHistoryPage() {
  const user = await requireUser("member");
  const [history, earned, goal] = await Promise.all([
    hoursHistoryForUser(user.id),
    hoursEarnedForUser(user.id),
    getTotalGoal(),
  ]);
  const { start, end } = schoolYearRange();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/member/dashboard"
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Hours history</h1>
        <p className="text-sm text-gray-500">
          {earned} of {goal} hours · school year {start.getUTCFullYear()}–
          {end.getUTCFullYear()}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {history.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No credited hours yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Activity</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((e, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 text-gray-600">{formatEventDate(e.date)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{e.source}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {e.kind === "event" ? "Event" : "Reported"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {e.hours}
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
