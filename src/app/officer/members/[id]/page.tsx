import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserCog } from "lucide-react";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { hoursBreakdownForUser } from "@/lib/services/member-service";
import { hoursHistoryForUser } from "@/lib/services/history-service";
import { getTotalGoal } from "@/lib/services/chapter-service";
import { listHouses } from "@/lib/services/house-service";
import { hoursRemaining } from "@/lib/hours";
import { HOUR_CATEGORY_LABELS } from "@/lib/constants";
import { isBootstrapProtected } from "@/lib/services/bootstrap-service";
import { ProgressBar } from "@/components/ProgressBar";
import { SubmitButton } from "@/components/SubmitButton";
import {
  adjustHoursAction,
  setActiveAction,
  setHouseAction,
  setRoleAction,
} from "@/actions/roster";
import {
  bootstrapEditProfileAction,
  bootstrapSetPasswordAction,
} from "@/actions/admin-user";
import { startImpersonationAction } from "@/actions/impersonation";
import { formatEventDate } from "@/lib/format";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const officer = await requireUser("officer");
  const { id } = await params;
  const memberId = Number(id);
  const member = await db.user.findUnique({ where: { id: memberId } });
  if (!member) notFound();

  const [breakdown, goal, history, houses] = await Promise.all([
    hoursBreakdownForUser(member.id),
    getTotalGoal(),
    hoursHistoryForUser(member.id),
    listHouses(),
  ]);
  const earned = breakdown.total;
  const memberHouse = houses.find((h) => h.id === member.houseId);
  const isSelf = member.id === officer.id;
  const bootstrapProtected = isBootstrapProtected(member);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/officer/members"
          className="flex items-center gap-1.5 text-sm text-blue-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roster
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{fullName(member)}</h1>
        <p className="text-sm text-gray-500">
          {member.email}
          {member.graduationYear ? ` · Class of ${member.graduationYear}` : ""} ·{" "}
          {memberHouse ? memberHouse.name : "No house"} ·{" "}
          <span className="capitalize">{member.role}</span>
          {member.deactivatedAt ? " · inactive" : ""}
          {bootstrapProtected ? " · bootstrap admin" : ""}
        </p>
      </div>

      {member.role !== "officer" && (
        <>
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-end justify-between">
          <p className="text-sm text-gray-500">Hours earned</p>
          <p className="text-sm text-gray-600">
            {earned} / {goal} · {hoursRemaining(earned, goal)} remaining
          </p>
        </div>
        <ProgressBar earned={earned} goal={goal} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>Inside: {breakdown.inside}</span>
          <span>
            Outside: {breakdown.outside} ({breakdown.outsideCounted} counted)
          </span>
          <span className={breakdown.requirements.tutoring ? "text-green-700" : "text-red-600"}>
            {HOUR_CATEGORY_LABELS.tutoring}: {breakdown.requirements.tutoring ? "✓" : "✗"}
          </span>
          <span className={breakdown.requirements.soupKitchen ? "text-green-700" : "text-red-600"}>
            {HOUR_CATEGORY_LABELS.soup_kitchen}:{" "}
            {breakdown.requirements.soupKitchen ? "✓" : "✗"}
          </span>
          <span className={breakdown.requirements.gardening ? "text-green-700" : "text-red-600"}>
            {HOUR_CATEGORY_LABELS.gardening}: {breakdown.requirements.gardening ? "✓" : "✗"}
          </span>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">House</h2>
        <form action={setHouseAction} className="flex items-end gap-3">
          <input type="hidden" name="userId" value={member.id} />
          <div className="flex-1">
            <label htmlFor="houseId" className={label}>
              Assigned house
            </label>
            <select
              id="houseId"
              name="houseId"
              defaultValue={member.houseId ?? ""}
              className={field}
            >
              <option value="">— Unassigned —</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Adjust hours</h2>
        <p className="mb-4 text-sm text-gray-500">
          Add a correction directly. Use a negative number to deduct hours.
        </p>
        <form action={adjustHoursAction} className="space-y-4">
          <input type="hidden" name="userId" value={member.id} />
          <div>
            <label htmlFor="description" className={label}>
              Reason
            </label>
            <input
              id="description"
              name="description"
              required
              placeholder="e.g. Make-up hours for cancelled event"
              className={field}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={label}>
                Date
              </label>
              <input id="date" name="date" type="date" required className={field} />
            </div>
            <div>
              <label htmlFor="hours" className={label}>
                Hours (+/−)
              </label>
              <input
                id="hours"
                name="hours"
                type="number"
                step="0.5"
                required
                className={field}
              />
            </div>
          </div>
          <SubmitButton pendingText="Saving…">Apply Adjustment</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Hours breakdown</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No credited hours yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((e, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{e.source}</p>
                  <p className="text-xs text-gray-500">
                    {formatEventDate(e.date)} · {e.kind === "event" ? "Event" : "Reported"}
                  </p>
                </div>
                <span className="font-medium text-gray-900">{e.hours}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      )}

      {!isSelf && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Manage</h2>
          {bootstrapProtected ? (
            <p className="mb-4 text-sm text-amber-700">
              This is the bootstrap officer account. Transfer the bootstrap role to
              another officer before it can be demoted or removed.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {officer.isBootstrapOfficer ? (
              <form action={setRoleAction}>
                <input type="hidden" name="userId" value={member.id} />
                <input
                  type="hidden"
                  name="role"
                  value={member.role === "officer" ? "member" : "officer"}
                />
                <button
                  type="submit"
                  disabled={bootstrapProtected}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {member.role === "officer" ? "Demote to member" : "Promote to officer"}
                </button>
              </form>
            ) : null}
            <form action={setActiveAction}>
              <input type="hidden" name="userId" value={member.id} />
              <input
                type="hidden"
                name="active"
                value={member.deactivatedAt ? "true" : "false"}
              />
              <button
                type="submit"
                disabled={bootstrapProtected}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  member.deactivatedAt
                    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                {member.deactivatedAt ? "Reactivate" : "Deactivate"}
              </button>
            </form>
          </div>
        </section>
      )}

      {officer.isBootstrapOfficer && (
        <section className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Bootstrap admin — edit user</h2>
          <p className="mb-4 text-sm text-gray-500">
            Change this user&apos;s details directly, no links needed. Changing the
            email or password logs them out of all devices.
          </p>

          {!isSelf && !member.deactivatedAt ? (
            <form action={startImpersonationAction} className="mb-5">
              <input type="hidden" name="userId" value={member.id} />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                <UserCog className="h-4 w-4" />
                Impersonate this user
              </button>
            </form>
          ) : null}

          <form action={bootstrapEditProfileAction} className="space-y-4">
            <input type="hidden" name="userId" value={member.id} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={label}>First name</label>
                <input id="firstName" name="firstName" defaultValue={member.firstName} required className={field} />
              </div>
              <div>
                <label htmlFor="lastName" className={label}>Last name</label>
                <input id="lastName" name="lastName" defaultValue={member.lastName} className={field} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={label}>Email</label>
                <input id="email" name="email" type="email" defaultValue={member.email} required className={field} />
              </div>
              <div>
                <label htmlFor="graduationYear" className={label}>Graduation year</label>
                <input
                  id="graduationYear"
                  name="graduationYear"
                  type="number"
                  min="1980"
                  max="2100"
                  defaultValue={member.graduationYear ?? ""}
                  className={field}
                />
              </div>
            </div>
            <SubmitButton pendingText="Saving…">Save user details</SubmitButton>
          </form>

          <form action={bootstrapSetPasswordAction} className="mt-6 space-y-4 border-t border-gray-100 pt-6">
            <input type="hidden" name="userId" value={member.id} />
            <div>
              <label htmlFor="password" className={label}>Set new password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={field}
              />
            </div>
            <SubmitButton pendingText="Setting…">Set password</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
