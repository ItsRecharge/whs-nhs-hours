"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings,
  Plug,
  ScrollText,
  AlertTriangle,
  Users,
  Send,
  X,
} from "lucide-react";
import { updateChapterAction } from "@/actions/chapter";
import { yearEndResetAction } from "@/actions/reset";
import { SubmitButton } from "@/components/SubmitButton";
import { MailForm, SheetsForm } from "@/app/officer/integrations/IntegrationForms";
import { EmailTestForm } from "@/components/EmailTestForm";

type ModalType = "chapter" | "integrations" | "email" | "audit" | "reset" | null;

interface AuditEntry {
  id: number | string;
  createdAt: Date;
  actorName: string;
  action: string;
  summary: string | null;
}

interface IntegrationStatus {
  gmailUser: string;
  mailConfigured: boolean;
  sheetsSpreadsheetId: string;
  sheetsServiceEmail: string;
  sheetsRosterTab: string;
  sheetsLogTab: string;
  sheetsConfigured: boolean;
}

interface ResetStats {
  members: number;
  events: number;
  signups: number;
  reports: number;
  invites: number;
}

interface Props {
  chapterName: string;
  totalHoursGoal: number;
  outsideHoursCap: number;
  schoolYearEndMonth: number;
  schoolYearEndDay: number;
  integrationStatus: IntegrationStatus;
  emailTestTo: string;
  auditLog: AuditEntry[];
  resetStats: ResetStats;
  resetConfirmPhrase: string;
  opsEnabled: boolean;
}

const field =
  "w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

function formatWhen(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        // transform-gpu + isolate force the panel onto its own compositing layer
        // so the rounded corners survive when the body below scrolls (Safari bug).
        className="flex max-h-[92dvh] w-full transform-gpu isolate flex-col overflow-hidden rounded-t-[28px] border border-white/30 bg-white shadow-2xl [backface-visibility:hidden] sm:max-w-xl sm:rounded-[28px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 pb-4 pt-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 rounded-full bg-gray-100 p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function AdminModals({
  chapterName,
  totalHoursGoal,
  outsideHoursCap,
  schoolYearEndMonth,
  schoolYearEndDay,
  integrationStatus,
  emailTestTo,
  auditLog,
  resetStats,
  resetConfirmPhrase,
  opsEnabled,
}: Props) {
  const [modal, setModal] = useState<ModalType>(null);
  const close = useCallback(() => setModal(null), []);

  const cards = [
    {
      id: "chapter" as const,
      title: "Chapter settings",
      desc: "Chapter name and the total service-hours goal.",
      icon: Settings,
      danger: false,
    },
    {
      id: "integrations" as const,
      title: "Integrations",
      desc: "Email (Gmail) and Google Sheets backup credentials.",
      icon: Plug,
      danger: false,
    },
    {
      id: "email" as const,
      title: "Email test",
      desc: "Send a sample of any email template to check delivery.",
      icon: Send,
      danger: false,
    },
    {
      id: "audit" as const,
      title: "Audit log",
      desc: "A record of every officer action.",
      icon: ScrollText,
      danger: false,
    },
    {
      id: "reset" as const,
      title: "Year-end reset",
      desc: "Nuclear option: removes ALL members (juniors lose progress). Normal rollover is deactivating graduated seniors on the Members page.",
      icon: AlertTriangle,
      danger: true,
    },
  ];

  const cardClass =
    "flex w-full items-start gap-3 rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/officer/officers" className={cardClass}>
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
          <div>
            <p className="font-semibold text-gray-900">Officers</p>
            <p className="mt-0.5 text-sm text-gray-500">
              View officers, reset passwords, and remove officers as they change.
            </p>
          </div>
        </Link>

        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setModal(c.id)}
            className={`${cardClass} ${c.danger ? "ring-1 ring-red-100" : ""}`}
          >
            <c.icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${c.danger ? "text-red-600" : "text-indigo-700"}`}
            />
            <div>
              <p className="font-semibold text-gray-900">{c.title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{c.desc}</p>
            </div>
          </button>
        ))}

        {opsEnabled && (
          <a
            href="/officer/ops"
            className="flex items-start gap-3 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <Settings className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
            <div>
              <p className="font-semibold text-gray-900">Operations console</p>
              <p className="mt-0.5 text-sm text-gray-500">
                Unlock terminal-grade admin tools.
              </p>
            </div>
          </a>
        )}
      </div>

      {/* Chapter settings modal */}
      {modal === "chapter" && (
        <Modal
          title="Chapter settings"
          subtitle="These apply to every member's progress toward the total goal."
          onClose={close}
        >
          <form action={updateChapterAction} className="space-y-4">
            <div>
              <label htmlFor="chapterName" className={label}>
                Chapter name
              </label>
              <input
                id="chapterName"
                name="chapterName"
                defaultValue={chapterName}
                required
                className={field}
              />
            </div>
            <div>
              <label htmlFor="totalHoursGoal" className={label}>
                Total service-hours goal
              </label>
              <input
                id="totalHoursGoal"
                name="totalHoursGoal"
                type="number"
                step="0.5"
                min="0.5"
                defaultValue={totalHoursGoal}
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
                defaultValue={outsideHoursCap}
                required
                className={field}
              />
              <p className="mt-1 text-xs text-gray-500">
                Max hours from outside (non-NHS) volunteering that count toward the
                goal.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="schoolYearEndMonth" className={label}>
                  Year ends — month
                </label>
                <input
                  id="schoolYearEndMonth"
                  name="schoolYearEndMonth"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue={schoolYearEndMonth}
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
                  defaultValue={schoolYearEndDay}
                  required
                  className={field}
                />
              </div>
            </div>
            <SubmitButton pendingText="Saving…">Save Settings</SubmitButton>
          </form>
        </Modal>
      )}

      {/* Integrations modal */}
      {modal === "integrations" && (
        <Modal
          title="Integrations"
          subtitle="Secrets are encrypted at rest. Saving requires your password."
          onClose={close}
        >
          <div className="space-y-8">
            <MailForm
              gmailUser={integrationStatus.gmailUser}
              configured={integrationStatus.mailConfigured}
            />
            <div className="border-t border-gray-100 pt-6">
              <SheetsForm
                spreadsheetId={integrationStatus.sheetsSpreadsheetId}
                serviceEmail={integrationStatus.sheetsServiceEmail}
                rosterTab={integrationStatus.sheetsRosterTab}
                logTab={integrationStatus.sheetsLogTab}
                configured={integrationStatus.sheetsConfigured}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Email test modal */}
      {modal === "email" && (
        <Modal
          title="Email test"
          subtitle="Send a sample template, with sample data, to verify delivery."
          onClose={close}
        >
          <div className="space-y-4">
            {integrationStatus.mailConfigured ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Email is configured — sending as{" "}
                <span className="font-medium">{integrationStatus.gmailUser}</span>.
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Email isn&apos;t configured yet. Set it up under Integrations before
                sending a test.
              </div>
            )}
            <EmailTestForm defaultTo={emailTestTo} />
          </div>
        </Modal>
      )}

      {/* Audit log modal */}
      {modal === "audit" && (
        <Modal
          title="Audit log"
          subtitle="Officer actions, newest first."
          onClose={close}
        >
          {auditLog.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">No actions recorded yet.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[540px] text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">When</th>
                    <th className="pb-2 pr-4 font-medium">Officer</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLog.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-4 whitespace-nowrap text-gray-500">
                        {formatWhen(e.createdAt)}
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{e.actorName}</td>
                      <td className="py-2 pr-4">
                        <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                          {e.action}
                        </code>
                      </td>
                      <td className="py-2 text-gray-700">{e.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Year-end reset modal */}
      {modal === "reset" && (
        <Modal title="Year-end reset" onClose={close}>
          <div className="space-y-5">
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">This permanently deletes:</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>{resetStats.members} members (officers are kept)</li>
                  <li>
                    {resetStats.events} events &amp; {resetStats.signups} sign-ups
                  </li>
                  <li>{resetStats.reports} hour reports</li>
                  <li>{resetStats.invites} invite links</li>
                </ul>
                <p className="mt-2">
                  Chapter settings, integrations, and the audit log are kept. There is no
                  undo — back up the database file first.
                </p>
              </div>
            </div>

            <form action={yearEndResetAction} className="space-y-4">
              <div>
                <label htmlFor="confirmPhrase" className={label}>
                  Type{" "}
                  <code className="rounded-md bg-gray-100 px-1.5 py-0.5">
                    {resetConfirmPhrase}
                  </code>{" "}
                  to confirm
                </label>
                <input
                  id="confirmPhrase"
                  name="confirmPhrase"
                  autoComplete="off"
                  required
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="resetPassword" className={label}>
                  Your password
                </label>
                <input
                  id="resetPassword"
                  name="password"
                  type="password"
                  required
                  className={field}
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" name="acknowledge" className="mt-0.5 h-4 w-4" required />
                I understand this is irreversible and have a database backup.
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Permanently reset for the new year
              </button>
              <p className="text-center text-xs text-gray-400">
                All three fields must be correct; the count is re-checked on the server.
              </p>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
