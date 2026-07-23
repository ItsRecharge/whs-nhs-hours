import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { getChapterSettings } from "@/lib/services/chapter-service";
import { updateChapterAction } from "@/actions/chapter";
import { SubmitButton } from "@/components/SubmitButton";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

export default async function ChapterSettingsPage() {
  await requireUser("officer");
  const settings = await getChapterSettings();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/officer/dashboard"
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Chapter settings</h1>
        <p className="text-sm text-gray-500">
          These apply to every member&apos;s progress toward the total goal.
        </p>
      </div>

      <form action={updateChapterAction} className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="chapterName" className={label}>
              Chapter name
            </label>
            <input
              id="chapterName"
              name="chapterName"
              defaultValue={settings.chapterName}
              required
              className={field}
            />
          </div>
          <div>
            <label htmlFor="totalHoursGoal" className={label}>
              Total service-hours goal (junior + senior year)
            </label>
            <input
              id="totalHoursGoal"
              name="totalHoursGoal"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue={settings.totalHoursGoal}
              required
              className={field}
            />
            <p className="mt-1 text-xs text-gray-500">
              Progress bars turn yellow at 30% and green at 70% of this goal.
            </p>
          </div>
          <div>
            <label htmlFor="outsideHoursCap" className={label}>
              Outside-hours cap
            </label>
            <input
              id="outsideHoursCap"
              name="outsideHoursCap"
              type="number"
              step="0.5"
              min="0"
              defaultValue={settings.outsideHoursCap}
              required
              className={field}
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum hours from outside (non-NHS) volunteering that count toward
              the goal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="schoolYearEndMonth" className={label}>
                School year ends — month
              </label>
              <input
                id="schoolYearEndMonth"
                name="schoolYearEndMonth"
                type="number"
                min="1"
                max="12"
                defaultValue={settings.schoolYearEndMonth}
                required
                className={field}
              />
            </div>
            <div>
              <label htmlFor="schoolYearEndDay" className={label}>
                Day
              </label>
              <input
                id="schoolYearEndDay"
                name="schoolYearEndDay"
                type="number"
                min="1"
                max="31"
                defaultValue={settings.schoolYearEndDay}
                required
                className={field}
              />
            </div>
            <p className="col-span-2 -mt-2 text-xs text-gray-500">
              After this date, a &quot;deactivate graduated seniors&quot; button
              appears on the members page.
            </p>
          </div>
          <div>
            <label htmlFor="publicUrl" className={label}>
              Public site URL
            </label>
            <input
              id="publicUrl"
              name="publicUrl"
              type="url"
              defaultValue={settings.publicUrl ?? ""}
              placeholder={process.env.APP_URL ?? "https://example.com"}
              className={field}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used for the buttons in emails (verify, reset, notifications). Leave
              blank to use the server&apos;s configured address.
            </p>
          </div>
          <SubmitButton pendingText="Saving…">Save Settings</SubmitButton>
        </div>
      </form>
    </div>
  );
}
