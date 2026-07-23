import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileClock,
  Mail,
  Settings,
  Target,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/current-user";
import {
  graduatedSeniorInfo,
  listMembersWithProgress,
} from "@/lib/services/member-service";
import { getTotalGoal } from "@/lib/services/chapter-service";
import { listEvents, listPendingRequests } from "@/lib/services/event-service";
import { listPendingReports } from "@/lib/services/hour-report-service";
import { sendHoursSummaryAction } from "@/actions/reminders";
import { ProgressBar } from "@/components/ProgressBar";
import { GraduatesBanner } from "@/components/GraduatesBanner";
import { SubmitButton } from "@/components/SubmitButton";

export default async function OfficerDashboard() {
  await requireUser("officer");
  const [members, goal, pendingRequests, pendingReports, events, graduates] =
    await Promise.all([
      listMembersWithProgress(),
      getTotalGoal(),
      listPendingRequests(),
      listPendingReports(),
      listEvents(),
      graduatedSeniorInfo(),
    ]);

  const active = members.filter((m) => !m.deactivatedAt);
  const hitGoal = active.filter((m) => m.remaining <= 0).length;
  const atRisk = active.length - hitGoal;
  const totalEarned = active.reduce((sum, m) => sum + m.earned, 0);
  const avgEarned = active.length ? totalEarned / active.length : 0;
  const activeEvents = events.filter((e) => e.status === "active").length;
  const pendingTotal = pendingRequests.length + pendingReports.length;

  const stats: {
    label: string;
    value: string | number;
    sub: string;
    icon: typeof Users;
    href?: string;
    accent: string;
    alert?: boolean;
  }[] = [
    {
      label: "Members",
      value: members.length,
      sub: `${active.length} active`,
      icon: Users,
      href: "/officer/members",
      accent: "text-indigo-700",
    },
    {
      label: "Goal met",
      value: hitGoal,
      sub: `of ${active.length} active`,
      icon: CheckCircle2,
      accent: "text-green-700",
    },
    {
      label: "Still working",
      value: atRisk,
      sub: `toward ${goal} hrs`,
      icon: Target,
      accent: "text-amber-700",
    },
    {
      label: "Avg hours",
      value: avgEarned.toFixed(1),
      sub: `${Math.round((avgEarned / goal) * 100)}% of goal`,
      icon: FileClock,
      accent: "text-sky-700",
    },
    {
      label: "Pending approvals",
      value: pendingTotal,
      sub: `${pendingRequests.length} events · ${pendingReports.length} reports`,
      icon: ClipboardList,
      href: "/officer/requests",
      accent: "text-rose-700",
      alert: pendingTotal > 0,
    },
    {
      label: "Active events",
      value: activeEvents,
      sub: "open for sign-ups",
      icon: CalendarClock,
      href: "/officer/events",
      accent: "text-violet-700",
    },
  ];

  return (
    <div className="space-y-6">
      {graduates.show && (
        <GraduatesBanner count={graduates.count} cutoffYear={graduates.cutoffYear} />
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Officer dashboard</h1>
          <p className="text-sm text-gray-500">
            {members.length} members · {atRisk} still working toward {goal} hrs
          </p>
        </div>
        <div className="flex items-center gap-4">
          <form action={sendHoursSummaryAction}>
            <SubmitButton pendingText="Sending…">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                Email hours reminder
              </span>
            </SubmitButton>
          </form>
          <Link
            href="/officer/admin"
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline"
          >
            <Settings className="h-4 w-4" />
            Admin
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const inner = (
            <div
              className={`h-full rounded-2xl border bg-white p-4 shadow-sm transition ${
                s.alert ? "border-rose-200 ring-1 ring-rose-100" : "border-gray-100"
              } ${s.href ? "hover:shadow-md" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {s.label}
                </span>
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{s.sub}</p>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <h2 className="pt-2 text-lg font-semibold text-gray-900">Member progress</h2>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {members.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3 w-1/3">Progress</th>
                <th className="px-5 py-3 text-right">Earned</th>
                <th className="px-5 py-3 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id} className={m.deactivatedAt ? "opacity-50" : ""}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/officer/members/${m.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-700 hover:underline"
                    >
                      {m.firstName} {m.lastName}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {m.email}
                      {m.graduationYear ? ` · '${String(m.graduationYear).slice(-2)}` : ""}
                      {m.deactivatedAt ? " · inactive" : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <ProgressBar earned={m.earned} goal={goal} />
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
    </div>
  );
}
