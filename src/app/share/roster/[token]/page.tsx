import { redirect } from "next/navigation";
import { validateShareLink } from "@/lib/services/share-service";
import { listMembersWithProgress } from "@/lib/services/member-service";
import { getChapterSettings } from "@/lib/services/chapter-service";
import { RosterReadOnly } from "@/components/RosterReadOnly";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";

export const metadata = { title: "Roster — Aberjona NHS" };
export const dynamic = "force-dynamic";

export default async function ShareRosterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ip = await requestIp();
  if (!rateLimit(`share-view:${ip}`, 60, 60 * 60 * 1000)) redirect("/share/expired");

  const link = await validateShareLink(token, "roster");
  if (!link) redirect("/share/expired");

  const [members, settings] = await Promise.all([
    listMembersWithProgress(),
    getChapterSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {settings.chapterName} — member roster
        </h1>
        <p className="text-sm text-gray-500">
          Shared with {link.organizerName}. Read-only; hours are out of the{" "}
          {settings.totalHoursGoal}-hour goal.
        </p>
      </div>
      <RosterReadOnly members={members} />
    </div>
  );
}
