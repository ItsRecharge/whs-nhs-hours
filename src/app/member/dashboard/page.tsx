import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { hoursBreakdownForUser } from "@/lib/services/member-service";
import { getChapterSettings } from "@/lib/services/chapter-service";
import { hoursRemaining } from "@/lib/hours";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { cancelRequestAction } from "@/actions/events";
import { formatEventDate, formatSlot } from "@/lib/format";

const REQUIREMENTS: {
  key: "tutoring" | "soupKitchen" | "gardening";
  title: string;
  desc: string;
}[] = [
  {
    key: "tutoring",
    title: "Tutoring",
    desc: "At least 1 hour tutoring another student — self-report it or sign up for an NHS tutoring event.",
  },
  {
    key: "soupKitchen",
    title: "Soup Kitchen",
    desc: "At least 1 hour at a soup kitchen — an NHS event, or an outside one reported with photo proof.",
  },
  {
    key: "gardening",
    title: "Gardening",
    desc: "At least 1 hour of in-school gardening — earned through NHS gardening events only.",
  },
];

export default async function MemberDashboard() {
  const user = await requireUser("member");
  const [breakdown, settings, house] = await Promise.all([
    hoursBreakdownForUser(user.id),
    getChapterSettings(),
    user.houseId
      ? db.house.findUnique({ where: { id: user.houseId }, select: { name: true } })
      : Promise.resolve(null),
  ]);
  const goal = settings.totalHoursGoal;
  const earned = breakdown.total;
  const remaining = hoursRemaining(earned, goal);
  const todayUtc = new Date(new Date().toISOString().slice(0, 10));

  const upcoming = await db.eventSignup.findMany({
    where: {
      userId: user.id,
      timeslot: { date: { gte: todayUtc }, event: { status: "active" } },
    },
    include: { timeslot: { include: { event: true } } },
    orderBy: { timeslot: { date: "asc" } },
  });

  const myRequests = await db.event.findMany({
    where: {
      createdById: user.id,
      status: { in: ["pending_approval", "cancelled"] },
    },
    include: { timeslots: { orderBy: { date: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const pendingReports = await db.hourReport.count({
    where: { userId: user.id, status: "pending" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {fullName(user)}</h1>
        <p className="text-sm text-gray-500">
          {house ? house.name : "No house assigned yet"}
          {user.graduationYear ? ` · Class of ${user.graduationYear}` : ""}
        </p>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Service hours earned (junior + senior year)
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {earned}
              <span className="text-lg font-normal text-gray-400"> / {goal}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {remaining > 0 ? `${remaining} to go` : "Goal reached 🎉"}
            </p>
            <Link
              href="/member/history"
              className="text-xs font-medium text-blue-800 hover:underline"
            >
              View breakdown
            </Link>
          </div>
        </div>
        <ProgressBar earned={earned} goal={goal} />
        {pendingReports > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            {pendingReports} hour report{pendingReports === 1 ? "" : "s"} awaiting officer
            approval ·{" "}
            <Link href="/member/report-hours" className="text-blue-800 hover:underline">
              view
            </Link>
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Inside hours</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{breakdown.inside}</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Hours from NHS events and organizations partnered with NHS.
          </p>
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Outside hours</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {breakdown.outside}
            <span className="text-lg font-normal text-gray-400">
              {" "}
              ({breakdown.outsideCounted} of {settings.outsideHoursCap} count)
            </span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Volunteering you arranged yourself, not organized by NHS. At most{" "}
            {settings.outsideHoursCap} outside hours count toward your goal.
          </p>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Required hour types
        </h2>
        <ul className="space-y-3">
          {REQUIREMENTS.map((req) => {
            const done = breakdown.requirements[req.key];
            return (
              <li key={req.key} className="flex items-start gap-3">
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {req.title}{" "}
                    {done ? (
                      <span className="text-xs font-semibold text-green-700">Done</span>
                    ) : (
                      <span className="text-xs font-semibold text-yellow-700">
                        Needed
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{req.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Upcoming timeslots</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">
            You haven&apos;t signed up for any upcoming timeslots.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{s.timeslot.event.title}</p>
                  <p className="text-sm text-gray-500">
                    {formatSlot(s.timeslot)}
                    {s.timeslot.event.location ? ` · ${s.timeslot.event.location}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-indigo-700">
                    {s.timeslot.hoursValue} hrs
                  </p>
                  {s.status === "waitlisted" && (
                    <span className="text-xs font-medium text-yellow-700">Waitlisted</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {myRequests.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Your event requests</h2>
          <ul className="divide-y divide-gray-100">
            {myRequests.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-gray-900">{e.title}</p>
                  {e.timeslots[0] && (
                    <p className="text-sm text-gray-500">
                      {formatEventDate(e.timeslots[0].date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  {e.status === "pending_approval" && (
                    <form action={cancelRequestAction}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
