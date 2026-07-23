import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, Folder, GitBranch } from "lucide-react";
import { requestOpsGrantAction, runOpsGitAction, saveOpsFileAction } from "@/actions/ops";
import { requireUser } from "@/lib/current-user";
import { isOpsConsoleEnabled, hasValidOpsGrant } from "@/lib/ops-access";
import { SubmitButton } from "@/components/SubmitButton";
import { OpsSettingsModal } from "@/components/OpsSettingsModal";
import { OpsTerminal } from "@/components/OpsTerminal";
import { gitHead, loadOpsWorkspace } from "@/lib/services/ops-service";

const field =
  "w-full rounded-2xl border border-white/20 bg-white/85 px-3 py-2 text-sm text-gray-900 outline-none backdrop-blur-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const panel = "rounded-[28px] border border-white/30 bg-white/80 p-4 shadow-xl backdrop-blur-xl";

function safePath(value: string | undefined): string {
  return value?.trim() ?? "";
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; git?: string; output?: string }>;
}) {
  if (!isOpsConsoleEnabled()) notFound();

  const user = await requireUser("officer");

  const params = await searchParams;
  const granted = await hasValidOpsGrant(user);
  const activePath = safePath(params.path);
  const gitOutput = params.output ?? "";

  const [workspace, head] = granted
    ? await Promise.all([loadOpsWorkspace(activePath), gitHead()])
    : [{ directory: "", entries: [], file: null }, { branch: "", shortHead: "" }];

  if (!granted) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-3 py-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Console</h1>
          <p className="text-sm text-gray-500">
            Re-enter your password to unlock privileged console actions.
          </p>
        </div>

        <form action={requestOpsGrantAction} className={`${panel} space-y-4`}>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input id="password" name="password" type="password" required className={field} />
          </div>
          <SubmitButton pendingText="Unlocking…">Unlock Terminal</SubmitButton>
        </form>
      </div>
    );
  }

  const breadcrumb = workspace.directory ? workspace.directory.split("/").filter(Boolean) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 rounded-[32px] border border-white/30 bg-white/70 p-4 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[2px] text-gray-500 uppercase">
            <span className="rounded-full bg-indigo-600 px-2 py-1 text-white">Super Admin</span>
            Operations Console
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            File editor and git control
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Bootstrap-admin only. Confined to the project root.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gray-900 px-4 py-2 text-sm text-white/90">
            <div className="text-xs uppercase tracking-[2px] text-white/60">Git</div>
            <div className="font-semibold">
              {head.branch || "unknown"} · {head.shortHead || "???????"}
            </div>
          </div>
          <OpsSettingsModal />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
        <section className={`${panel} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project files</h2>
              <p className="text-sm text-gray-500">
                Browse the repository root and open a text file to edit.
              </p>
            </div>
            <Link href="/officer/ops" className="text-sm font-semibold text-indigo-700 hover:underline">
              Root
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
            <Link href="/officer/ops" className="hover:underline">
              root
            </Link>
            {breadcrumb.map((part, index) => {
              const target = breadcrumb.slice(0, index + 1).join("/");
              return (
                <div key={target} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link href={`/officer/ops?path=${encodeURIComponent(target)}`} className="hover:underline">
                    {part}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="max-h-[44vh] overflow-auto rounded-2xl border border-gray-200 bg-white/80 p-2">
            {workspace.entries.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">No entries in this folder.</p>
            ) : (
              <ul className="space-y-1">
                {workspace.entries.map((entry) => (
                  <li key={entry.path}>
                    <Link
                      href={`/officer/ops?path=${encodeURIComponent(entry.path)}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-indigo-50"
                    >
                      <span className="flex items-center gap-2 font-medium text-gray-900">
                        {entry.kind === "dir" ? (
                          <Folder className="h-4 w-4 text-indigo-700" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500" />
                        )}
                        {entry.name}
                      </span>
                      <span className="text-xs text-gray-500">{entry.kind}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={`${panel} space-y-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editor</h2>
              <p className="text-sm text-gray-500">
                {workspace.file ? workspace.file.path : "Choose a file to edit."}
              </p>
            </div>
            {workspace.file ? (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {workspace.file.size} bytes
              </span>
            ) : null}
          </div>

          {workspace.file ? (
            <form action={saveOpsFileAction} className="space-y-4">
              <input type="hidden" name="path" value={workspace.file.path} />
              <textarea
                name="content"
                defaultValue={workspace.file.content}
                spellCheck={false}
                className="min-h-[52vh] w-full rounded-3xl border border-gray-200 bg-white/90 p-4 font-mono text-[13px] leading-6 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Text files only. Hidden and database paths are blocked.
                </p>
                <SubmitButton pendingText="Saving…">Save File</SubmitButton>
              </div>
            </form>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
              Select a text file from the left panel to open it here.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["status", "Git Status", "Running…", ""],
              ["log", "Git Log", "Running…", ""],
              ["head", "Git Head", "Running…", ""],
              ["fetch", "Git Fetch", "Fetching…", "bg-slate-700 hover:bg-slate-800"],
              ["pull", "Git Pull", "Pulling…", "bg-emerald-700 hover:bg-emerald-800"],
            ].map(([command, label, pendingText, extraClass]) => (
              <form key={command} action={runOpsGitAction}>
                <input type="hidden" name="command" value={command} />
                <input type="hidden" name="path" value={activePath} />
                <SubmitButton className={`w-full ${extraClass}`} pendingText={pendingText}>
                  {label}
                </SubmitButton>
              </form>
            ))}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-950 p-4 text-sm text-gray-100">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[2px] text-gray-400 uppercase">
              <GitBranch className="h-4 w-4" /> Git output
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-gray-100">
              {gitOutput || "Run status, log, head, fetch, or pull to see output here."}
            </pre>
          </div>
        </section>
      </div>

      <div className="mt-6">
        <OpsTerminal />
      </div>
    </div>
  );
}