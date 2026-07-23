"use client";

import { useState } from "react";
import { sendTestEmailAction } from "@/actions/email-test";
import { SubmitButton } from "@/components/SubmitButton";
import { fieldClass, labelClass } from "@/components/AuthShell";
import { TEST_TEMPLATES } from "@/lib/email/test-registry";

const KEYS = Object.keys(TEST_TEMPLATES);

export function EmailTestForm({ defaultTo }: { defaultTo: string }) {
  const [templateKey, setTemplateKey] = useState(KEYS[0]);
  const entry = TEST_TEMPLATES[templateKey];

  return (
    <form action={sendTestEmailAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="template" className={labelClass}>
          Template
        </label>
        <select
          id="template"
          name="template"
          className={fieldClass}
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
        >
          {KEYS.map((key) => (
            <option key={key} value={key}>
              {TEST_TEMPLATES[key].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="to" className={labelClass}>
          Send to
        </label>
        <input
          id="to"
          name="to"
          type="email"
          required
          defaultValue={defaultTo}
          className={fieldClass}
        />
      </div>

      {entry.fields.length > 0 && (
        <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-xs font-medium text-gray-500">
            Sample data
          </legend>
          {/* Remount inputs per template so defaults refresh on change */}
          {entry.fields.map((field) => (
            <div key={`${templateKey}-${field.name}`}>
              <label htmlFor={field.name} className={labelClass}>
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                defaultValue={field.default}
                className={fieldClass}
              />
            </div>
          ))}
        </fieldset>
      )}

      <SubmitButton pendingText="Sending…">Send test email</SubmitButton>
    </form>
  );
}
