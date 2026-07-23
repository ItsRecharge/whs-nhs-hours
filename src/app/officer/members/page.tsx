import { requireUser } from "@/lib/current-user";
import {
  graduatedSeniorInfo,
  listMembersWithProgress,
} from "@/lib/services/member-service";
import { listHouses } from "@/lib/services/house-service";
import { MembersTable, type MemberRow } from "@/components/MembersTable";
import { GraduatesBanner } from "@/components/GraduatesBanner";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { ShareLinkReveal } from "@/components/ShareLinkReveal";

export default async function OfficerMembersPage() {
  await requireUser("officer");
  const [members, houses, graduates] = await Promise.all([
    listMembersWithProgress(),
    listHouses(),
    graduatedSeniorInfo(),
  ]);

  const rows: MemberRow[] = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    graduationYear: m.graduationYear,
    houseId: m.house?.id ?? null,
    houseName: m.house?.name ?? null,
    emailVerifiedAt: m.emailVerifiedAt?.toISOString() ?? null,
    deactivatedAt: m.deactivatedAt?.toISOString() ?? null,
    earned: m.earned,
    remaining: m.remaining,
    inside: m.breakdown.inside,
    outside: m.breakdown.outside,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member roster</h1>
          <p className="mt-1 text-sm text-gray-500">
            Click a member to edit their info and adjust hours. Select rows for
            bulk actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShareLinkButton kind="roster" />
          <a
            href="/officer/export/members.csv"
            className="text-sm font-medium text-blue-800 hover:underline"
          >
            Export CSV
          </a>
        </div>
      </div>

      <ShareLinkReveal path="/officer/members" />

      {graduates.show && (
        <GraduatesBanner count={graduates.count} cutoffYear={graduates.cutoffYear} />
      )}

      <MembersTable members={rows} houses={houses.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
