import Link from "next/link";
import { ArrowLeft, Crown, ShieldCheck } from "lucide-react";
import { requireUser, fullName } from "@/lib/current-user";
import { listOfficers } from "@/lib/services/roster-service";
import { transferBootstrapAction } from "@/actions/officers";
import { ResetLinkReveal } from "@/components/ResetLinkReveal";
import { OfficerActionsMenu } from "@/components/OfficerActionsMenu";
import { SubmitButton } from "@/components/SubmitButton";

export default async function OfficersPage() {
  const me = await requireUser("officer");
  const officers = await listOfficers();
  const meIsBootstrap = me.isBootstrapOfficer;
  const transferTargets = officers.filter(
    (o) => !o.isBootstrapOfficer && o.deactivatedAt === null,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/officer/admin"
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Officers</h1>
        <p className="text-sm text-gray-500">
          Everyone with officer access. Reset a password or remove an officer as the
          roster changes. The bootstrap officer is protected from removal until the
          role is handed off.
        </p>
      </div>

      <ResetLinkReveal />

      {meIsBootstrap && transferTargets.length > 0 ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
            <Crown className="h-4 w-4 text-indigo-700" />
            Transfer bootstrap role
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Hand the bootstrap (master admin) role to another officer. They become
            protected from removal; you no longer will be. Confirm with your password.
          </p>
          <form
            action={transferBootstrapAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="targetId" className="mb-1 block text-xs font-medium text-gray-700">
                New bootstrap officer
              </label>
              <select
                id="targetId"
                name="targetId"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                        <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          <ShieldCheck className="h-3 w-3" /> Bootstrap
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
    </div>
  );
}
