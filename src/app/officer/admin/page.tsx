import { requireUser } from "@/lib/current-user";
import { isOpsConsoleEnabled } from "@/lib/ops-access";
import { getChapterSettings } from "@/lib/services/chapter-service";
import { getIntegrationStatus } from "@/lib/services/integration-service";
import { listAuditLog } from "@/lib/services/audit-service";
import { resetSummary, resetPhrase } from "@/lib/services/reset-service";
import { AdminModals } from "@/components/AdminModals";

export default async function AdminPage() {
  const officer = await requireUser("officer");
  const [settings, integrationStatus, auditLog, summary] = await Promise.all([
    getChapterSettings(),
    getIntegrationStatus(),
    listAuditLog(300),
    resetSummary(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500">Chapter configuration and officer tools.</p>
      </div>

      <AdminModals
        chapterName={settings.chapterName}
        totalHoursGoal={settings.totalHoursGoal}
        outsideHoursCap={settings.outsideHoursCap}
        schoolYearEndMonth={settings.schoolYearEndMonth}
        schoolYearEndDay={settings.schoolYearEndDay}
        integrationStatus={integrationStatus}
        emailTestTo={officer.email}
        auditLog={auditLog}
        resetStats={summary}
        resetConfirmPhrase={resetPhrase(summary.members)}
        opsEnabled={isOpsConsoleEnabled()}
      />
    </div>
  );
}
