"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { completeSetupAction, type SetupFormState } from "@/actions/setup";
import { SubmitButton } from "@/components/SubmitButton";
import { fieldClass, labelClass } from "@/components/AuthShell";

const TOTAL_STEPS = 4;
const STEP_NAMES = ["Admin Account", "Chapter", "Email", "Review & Finish"];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  chapterName: string;
  totalHoursGoal: string;
  gmailUser: string;
  gmailAppPassword: string;
}

const EMPTY: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirm: "",
  chapterName: "",
  totalHoursGoal: "30",
  gmailUser: "",
  gmailAppPassword: "",
};

/** Advisory strength score (0–4) — the server enforces the 8-char minimum. */
function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}

const STRENGTH_COLORS = [
  "bg-gray-200",
  "bg-red-400",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-500",
];

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [stepError, setStepError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<SetupFormState, globalThis.FormData>(
    completeSetupAction,
    {},
  );

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function next() {
    const err = validateStep(step, form);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  const strength = passwordStrength(form.password);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-500">
        <span>
          Step {step} of {TOTAL_STEPS}
        </span>
        <span>{STEP_NAMES[step - 1]}</span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary-700 transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {stepError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {stepError}
        </div>
      )}
      {state.error && step === TOTAL_STEPS && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Step 1 — Admin officer account */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">
              Create the admin officer
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              This first account is a chapter officer and signs you in.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input
                className={fieldClass}
                value={form.firstName}
                onChange={set("firstName")}
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                className={fieldClass}
                value={form.lastName}
                onChange={set("lastName")}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={fieldClass}
              value={form.email}
              onChange={set("email")}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={fieldClass}
                value={form.password}
                onChange={set("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.password && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all ${STRENGTH_COLORS[strength.score]}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{strength.label}</p>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Confirm password</label>
            <input
              type={showPassword ? "text" : "password"}
              className={fieldClass}
              value={form.confirm}
              onChange={set("confirm")}
            />
          </div>
        </div>
      )}

      {/* Step 2 — Chapter settings */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Chapter details</h1>
            <p className="mt-1 text-sm text-gray-500">
              Name your chapter and set the total service-hours goal (over junior + senior year).
            </p>
          </div>
          <div>
            <label className={labelClass}>Chapter name</label>
            <input
              className={fieldClass}
              value={form.chapterName}
              onChange={set("chapterName")}
              placeholder="Aberjona NHS Chapter"
            />
          </div>
          <div>
            <label className={labelClass}>Total hours goal</label>
            <input
              type="number"
              min={1}
              className={fieldClass}
              value={form.totalHoursGoal}
              onChange={set("totalHoursGoal")}
            />
          </div>
        </div>
      )}

      {/* Step 3 — Email (optional) */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Email (optional)</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure Gmail to send invites and notifications. You can skip this
              and set it later under Integrations.
            </p>
          </div>
          <div>
            <label className={labelClass}>Gmail address</label>
            <input
              type="email"
              className={fieldClass}
              value={form.gmailUser}
              onChange={set("gmailUser")}
              placeholder="chapter@gmail.com"
            />
          </div>
          <div>
            <label className={labelClass}>App password</label>
            <input
              type="password"
              className={fieldClass}
              value={form.gmailAppPassword}
              onChange={set("gmailAppPassword")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Use a Google{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-primary-800 hover:underline"
              >
                app password
              </a>
              , not your normal login.
            </p>
          </div>
        </div>
      )}

      {/* Step 4 — Review & finish */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Review &amp; finish</h1>
            <p className="mt-1 text-sm text-gray-500">
              Confirm everything looks right, then launch your chapter.
            </p>
          </div>
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
            <Row label="Officer" value={`${form.firstName} ${form.lastName}`.trim()} />
            <Row label="Email" value={form.email} />
            <Row label="Chapter" value={form.chapterName} />
            <Row label="Total goal" value={`${form.totalHoursGoal} hours`} />
            <Row
              label="Email sending"
              value={form.gmailUser ? form.gmailUser : "Not configured"}
            />
          </dl>

          <form action={formAction}>
            <input type="hidden" name="firstName" value={form.firstName} />
            <input type="hidden" name="lastName" value={form.lastName} />
            <input type="hidden" name="email" value={form.email} />
            <input type="hidden" name="password" value={form.password} />
            <input type="hidden" name="chapterName" value={form.chapterName} />
            <input type="hidden" name="totalHoursGoal" value={form.totalHoursGoal} />
            <input type="hidden" name="gmailUser" value={form.gmailUser} />
            <input
              type="hidden"
              name="gmailAppPassword"
              value={form.gmailAppPassword}
            />
            <SubmitButton className="w-full" pendingText="Setting up…">
              Create officer &amp; launch
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Navigation (steps 1–3) */}
      {step < TOTAL_STEPS && (
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {step === 3 && (
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, gmailUser: "", gmailAppPassword: "" }));
                  setStepError(null);
                  setStep(TOTAL_STEPS);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-primary-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-900"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {step === TOTAL_STEPS && (
        <div className="mt-4">
          <button
            type="button"
            onClick={back}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function validateStep(step: number, form: FormData): string | null {
  if (step === 1) {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return "Enter a valid email address.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
  }
  if (step === 2) {
    if (!form.chapterName.trim()) return "Chapter name is required.";
    const goal = Number(form.totalHoursGoal);
    if (!Number.isFinite(goal) || goal <= 0)
      return "Total hours goal must be a positive number.";
  }
  if (step === 3) {
    const u = form.gmailUser.trim();
    const p = form.gmailAppPassword.trim();
    if ((u && !p) || (!u && p))
      return "Enter both the Gmail address and app password, or skip.";
    if (u && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u))
      return "Enter a valid Gmail address.";
  }
  return null;
}
