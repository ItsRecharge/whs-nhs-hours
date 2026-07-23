"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { reportHoursAction } from "@/actions/hour-reports";
import { SubmitButton } from "@/components/SubmitButton";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

const CATEGORY_OPTIONS: {
  value: string;
  label: string;
  desc: string;
  outsideAllowed: boolean;
}[] = [
  {
    value: "general",
    label: "General",
    desc: "Any other community service.",
    outsideAllowed: true,
  },
  {
    value: "tutoring",
    label: "Tutoring",
    desc: "Tutoring another student — you can self-report it or attend an NHS tutoring event.",
    outsideAllowed: true,
  },
  {
    value: "soup_kitchen",
    label: "Soup Kitchen",
    desc: "Serving at a soup kitchen — an NHS event, or an outside one with photo proof.",
    outsideAllowed: true,
  },
  {
    value: "gardening",
    label: "Gardening",
    desc: "In-school gardening only — these hours come from NHS gardening events.",
    outsideAllowed: false,
  },
];

export function ReportHoursForm() {
  const [origin, setOrigin] = useState<"inside" | "outside">("inside");
  const [category, setCategory] = useState("general");
  const [preview, setPreview] = useState<string | null>(null);

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.value === category);

  function onOriginChange(next: "inside" | "outside") {
    setOrigin(next);
    if (next === "outside" && category === "gardening") setCategory("general");
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  const originCard = (checked: boolean) =>
    `block cursor-pointer rounded-lg border px-4 py-3 text-sm transition ${
      checked
        ? "border-blue-700 bg-blue-50 ring-2 ring-blue-200"
        : "border-gray-300 hover:border-gray-400"
    }`;

  return (
    <form action={reportHoursAction} className="rounded-xl bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <span className={label}>Where were these hours from?</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={originCard(origin === "inside")}>
              <input
                type="radio"
                name="origin"
                value="inside"
                checked={origin === "inside"}
                onChange={() => onOriginChange("inside")}
                className="sr-only"
              />
              <span className="font-semibold text-gray-900">Inside NHS</span>
              <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                An NHS event that already happened that you forgot to log, or work
                with an NHS-partnered organization.
              </span>
            </label>
            <label className={originCard(origin === "outside")}>
              <input
                type="radio"
                name="origin"
                value="outside"
                checked={origin === "outside"}
                onChange={() => onOriginChange("outside")}
                className="sr-only"
              />
              <span className="font-semibold text-gray-900">Outside NHS</span>
              <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                Volunteering not organized by NHS that you went and did on your own.
                Requires a proof photo; only some outside hours count toward your
                goal.
              </span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="category" className={label}>
            Type of hours
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={field}
          >
            {CATEGORY_OPTIONS.filter(
              (c) => origin === "inside" || c.outsideAllowed,
            ).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <p className="mt-1 text-xs text-gray-500">{selectedCategory.desc}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className={label}>
            What did you do?
          </label>
          <input id="description" name="description" required className={field} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className={label}>
              Date
            </label>
            <input id="date" name="date" type="date" required className={field} />
          </div>
          <div>
            <label htmlFor="hoursRequested" className={label}>
              Hours
            </label>
            <input
              id="hoursRequested"
              name="hoursRequested"
              type="number"
              step="0.5"
              min="0.5"
              required
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="photo" className={label}>
            Proof photo{" "}
            {origin === "outside" ? (
              <span className="font-semibold text-red-600">(required)</span>
            ) : (
              <span className="text-gray-400">(or add a message below)</span>
            )}
          </label>
          <label
            htmlFor="photo"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 transition hover:border-blue-600 hover:text-blue-800"
          >
            <ImagePlus className="h-4 w-4" />
            {preview ? "Change photo" : "Upload a photo (JPEG, PNG, or WebP, 10 MB max)"}
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            required={origin === "outside"}
            onChange={onPhotoChange}
            className="sr-only"
          />
          {preview && (
            <div className="relative mt-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Proof preview"
                className="max-h-40 rounded-lg border border-gray-200"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => {
                  const input = document.getElementById("photo") as HTMLInputElement;
                  input.value = "";
                  URL.revokeObjectURL(preview);
                  setPreview(null);
                }}
                className="absolute -top-2 -right-2 rounded-full bg-gray-800 p-1 text-white shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {origin === "outside"
              ? "A screenshot of a volunteer portal, a photo from the event — anything that shows you were there."
              : "Optional if you leave a message for the reviewing officer instead."}
          </p>
        </div>

        <div>
          <label htmlFor="notes" className={label}>
            Message for the officer{" "}
            {origin === "inside" ? (
              <span className="text-gray-400">(or attach a photo above)</span>
            ) : (
              <span className="text-gray-400">(optional)</span>
            )}
          </label>
          <textarea id="notes" name="notes" rows={2} className={field} />
        </div>

        <SubmitButton pendingText="Submitting…">Submit for Approval</SubmitButton>
      </div>
    </form>
  );
}
