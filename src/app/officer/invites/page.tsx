import { requireUser, fullName } from "@/lib/current-user";
import { listActiveInvites } from "@/lib/services/invite-service";
import { createInviteAction, revokeInviteAction } from "@/actions/invites";
import { SubmitButton } from "@/components/SubmitButton";
import { InviteLinkReveal } from "@/components/InviteLinkReveal";
import { formatEventDate } from "@/lib/format";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

export default async function OfficerInvitesPage() {
  await requireUser("officer");
  const invites = await listActiveInvites();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invite links</h1>
        <p className="text-sm text-gray-500">
          Generate links for new members to sign up. Optionally email a link directly.
        </p>
      </div>

      <InviteLinkReveal />

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Create invite</h2>
        <form action={createInviteAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiresInDays" className={label}>
                Expires in (days)
              </label>
              <select id="expiresInDays" name="expiresInDays" className={field}>
                <option value="7">7 days</option>
                <option value="30" defaultChecked>
                  30 days
                </option>
                <option value="90">90 days</option>
              </select>
            </div>
            <div>
              <label htmlFor="maxUses" className={label}>
                Max uses (blank = unlimited)
              </label>
              <input
                id="maxUses"
                name="maxUses"
                type="number"
                min="1"
                placeholder="Unlimited"
                className={field}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="role" className={label}>
                Role granted
              </label>
              <select id="role" name="role" className={field}>
                <option value="member">Member</option>
                <option value="officer">Officer</option>
              </select>
            </div>
            <div>
              <label htmlFor="email" className={label}>
                Email to (optional)
              </label>
              <input id="email" name="email" type="email" className={field} />
            </div>
          </div>
          <SubmitButton pendingText="Creating…">Create Invite</SubmitButton>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <h2 className="px-6 pt-5 text-lg font-semibold text-gray-900">Active invites</h2>
        {invites.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No active invites.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Created by</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Expires</th>
                <th className="px-6 py-3 text-center">Uses</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-6 py-3 text-gray-700">{fullName(inv.createdBy)}</td>
                  <td className="px-6 py-3 text-gray-600 capitalize">{inv.role}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {formatEventDate(inv.expiresAt)}
                  </td>
                  <td className="px-6 py-3 text-center text-gray-600">
                    {inv.useCount}
                    {inv.maxUses !== null ? ` / ${inv.maxUses}` : ""}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <button
                        type="submit"
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
