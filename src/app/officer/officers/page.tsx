import Link from "next/link";
import { ArrowLeft, Crown, ShieldCheck } from "lucide-react";
import { requireUser, fullName } from "@/lib/current-user";
import { listOfficers } from "@/lib/services/roster-service";
import { listOrganizers } from "@/lib/services/organizer-service";
import { setActiveAction } from "@/actions/roster";
import { transferBootstrapAction } from "@/actions/officers";
import { ResetLinkReveal } from "@/components/ResetLinkReveal";
import { OfficerActionsMenu } from "@/components/OfficerActionsMenu";
import { SubmitButton } from "@/components/SubmitButton";

export default async function OfficersPage() {
  const me = await requireUser("officer");
  const [officers, organizers] = await Promise.all([listOfficers(), listOrganizers()]);
  const meIsBootstrap = me.isBootstrapOfficer;
  const transferTargets = officers.filter(
    (o) => !o.isBootstrapOfficer && o.deactivatedAt === null,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/officer/admin"
          className="flex items-center gap-1.5 text-sm text-primary-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Officers</h1>
        <p className="text-sm text-gray-500">
          Everyone with officer access. Reset a password or remove an officer as the
          roster changes. The admin is protected from removal until the
          role is handed off.
        </p>
      </div>

      <ResetLinkReveal />

      {meIsBootstrap && transferTargets.length > 0 ? (
        <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-5">
          <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
            <Crown className="h-4 w-4 text-primary-800" />
            Transfer admin role
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Hand the admin role to another officer. They become
            protected from removal; you no longer will be. Confirm with your password.
          </p>
          <form
            action={transferBootstrapAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="targetId" className="mb-1 block text-xs font-medium text-gray-700">
                New admin
              </label>
              <select
                id="targetId"
                name="targetId"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                {transferTargets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {fullName(o)} ({o.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-700">
                Your password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <SubmitButton pendingText="Transferring…">Transfer</SubmitButton>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Officer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {officers.map((o) => {
              const isSelf = o.id === me.id;
              const protectedNow = o.isBootstrapOfficer;
              const active = o.deactivatedAt === null;
              return (
                <tr key={o.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      {fullName(o)}
                      {isSelf ? <span className="text-xs text-gray-400">(you)</span> : null}
                    </div>
                    <div className="text-xs text-gray-500">{o.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Deactivated
                        </span>
                      )}
                      {o.isBootstrapOfficer ? (
                        <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-800">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      ) : null}
                    </div>
                    {protectedNow ? (
                      <div className="mt-1 text-xs text-gray-400">
                        Protected — transfer the role to remove
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      {isSelf ? (
                        <span className="text-xs text-gray-400">
                          Manage your own account in Settings
                        </span>
                      ) : (
                        <OfficerActionsMenu
                          officerId={o.id}
                          active={active}
                          protectedNow={protectedNow}
                          meIsBootstrap={meIsBootstrap}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="px-6 pt-5">
          <h2 className="text-lg font-semibold text-gray-900">Partner organizers</h2>
          <p className="text-sm text-gray-500">
            Outside partners with their own login. They see the read-only roster
            and take attendance for events they&apos;re linked to (linked from
            each event&apos;s edit page).
          </p>
        </div>
        {organizers.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No organizer accounts. Create an organizer invite from the Invites
            page.
          </p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Linked events</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizers.map((o) => (
                <tr key={o.id} className={o.deactivatedAt ? "opacity-50" : ""}>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {o.firstName} {o.lastName}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{o.email}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {o.organizerEvents.length === 0
                      ? "—"
                      : o.organizerEvents.map((l) => l.event.title).join(", ")}
                  </td>
                  <td className="px-6 py-3">
                    {o.deactivatedAt ? (
                      <span className="text-xs font-medium text-gray-500">Inactive</span>
                    ) : o.emailVerifiedAt ? (
                      <span className="text-xs font-medium text-green-700">Verified</span>
                    ) : (
                      <span className="text-xs font-medium text-yellow-700">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <form action={setActiveAction}>
                      <input type="hidden" name="userId" value={o.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={o.deactivatedAt ? "true" : "false"}
                      />
                      <button
                        type="submit"
                        className={`text-sm font-medium hover:underline ${
                          o.deactivatedAt ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {o.deactivatedAt ? "Reactivate" : "Deactivate"}
                      </button>
                    </form>
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
