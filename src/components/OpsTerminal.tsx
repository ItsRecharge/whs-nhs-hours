"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { TerminalSquare, TriangleAlert } from "lucide-react";
import { runOpsShellAction, type OpsShellState } from "@/actions/ops";

const INITIAL: OpsShellState = { command: "", output: "", exitCode: null };

/** Interactive shell for the bootstrap super-admin. Runs server-side, root-confined. */
export function OpsTerminal() {
  const [state, action, pending] = useActionState(runOpsShellAction, INITIAL);
  const [history, setHistory] = useState<OpsShellState[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.command || state.error) {
      setHistory((h) => [...h, state]);
      formRef.current?.reset();
    }
    // Append exactly once per completed run; `state` is a fresh object each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [history, pending]);

  return (
    <section className="rounded-[28px] border border-white/30 bg-white/80 p-4 shadow-xl backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <TerminalSquare className="h-5 w-5 text-indigo-700" /> Terminal
      </div>
      <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Runs commands as the server user inside the project root. Every command is
        recorded in the audit log.
      </div>

      <div
        ref={logRef}
        className="mb-3 max-h-96 overflow-auto rounded-3xl border border-gray-200 bg-gray-950 p-4 font-mono text-[13px] leading-6 text-gray-100"
      >
        {history.length === 0 ? (
          <p className="text-gray-500">No commands run yet. Try `git status` or `ls`.</p>
        ) : (
          history.map((entry, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="text-gray-500">$</span>
                <span className="break-all">{entry.command}</span>
                {entry.exitCode !== null && entry.exitCode !== 0 ? (
                  <span className="rounded bg-red-900/60 px-1.5 text-[11px] text-red-200">
                    exit {entry.exitCode}
                  </span>
                ) : null}
              </div>
              {entry.error ? (
                <pre className="mt-1 whitespace-pre-wrap break-words text-red-300">{entry.error}</pre>
              ) : entry.output ? (
                <pre className="mt-1 whitespace-pre-wrap break-words text-gray-100">{entry.output}</pre>
              ) : (
                <pre className="mt-1 text-gray-500">(no output)</pre>
              )}
            </div>
          ))
        )}
        {pending ? <p className="text-gray-400">Running…</p> : null}
      </div>

      <form ref={formRef} action={action} className="flex items-center gap-2">
        <span className="font-mono text-sm text-gray-500">$</span>
        <input
          name="command"
          autoComplete="off"
          spellCheck={false}
          placeholder="Type a command and press Enter"
          className="flex-1 rounded-2xl border border-gray-300 bg-white/90 px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {pending ? "Running…" : "Run"}
        </button>
      </form>
    </section>
  );
}
