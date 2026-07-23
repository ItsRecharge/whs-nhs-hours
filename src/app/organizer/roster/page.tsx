import { requireUser } from "@/lib/current-user";
import { listMembersWithProgress } from "@/lib/services/member-service";
import { getChapterSettings } from "@/lib/services/chapter-service";
import { RosterReadOnly } from "@/components/RosterReadOnly";

export default async function OrganizerRosterPage() {
  await requireUser("organizer");
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
          Read-only. Hours are out of the {settings.totalHoursGoal}-hour goal.
        </p>
      </div>
      <RosterReadOnly members={members} />
    </div>
  );
}
