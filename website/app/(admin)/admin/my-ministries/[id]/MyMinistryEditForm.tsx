"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { submitMinistryEditAction } from "../_actions";

type Defaults = {
  tagline: string | null;
  description: string | null;
  meetingCadence: string | null;
  contactEmail: string | null;
  isAcceptingNew: boolean;
};

export function MyMinistryEditForm({
  ministryId,
  defaults,
}: {
  ministryId: string;
  defaults: Defaults;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const r = await submitMinistryEditAction(ministryId, formData);
      if (r.ok) {
        setSubmitted(true);
        router.refresh();
      } else if ("fieldErrors" in r) {
        setErrors(r.fieldErrors);
      } else {
        setTopError(r.error);
      }
    });
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-rule bg-white p-8 text-center">
        <p className="font-serif text-xl font-bold text-navy">
          Thanks — sent for review.
        </p>
        <p className="mt-2 text-sm text-ink-2">
          An admin will approve or send back with notes.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-navy"
        >
          Submit another change
        </button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {topError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}

      <AdminField
        name="tagline"
        label="Tagline"
        hint="Up to 120 characters."
        errors={errors.tagline}
      >
        <input
          id="tagline-input"
          name="tagline"
          type="text"
          defaultValue={defaults.tagline ?? ""}
          maxLength={120}
          className="form-input"
        />
      </AdminField>

      <AdminField
        name="description"
        label="Description"
        hint="Up to 1000 characters. Plain text — no HTML."
        errors={errors.description}
      >
        <textarea
          id="description-input"
          name="description"
          defaultValue={defaults.description ?? ""}
          rows={8}
          maxLength={1000}
          className="form-input"
        />
      </AdminField>

      <div className="grid gap-5 sm:grid-cols-2">
        <AdminField
          name="meetingCadence"
          label="Meeting cadence"
          hint='e.g. "2nd Thursdays, 7 PM"'
          errors={errors.meetingCadence}
        >
          <input
            id="meetingCadence-input"
            name="meetingCadence"
            type="text"
            defaultValue={defaults.meetingCadence ?? ""}
            maxLength={80}
            className="form-input"
          />
        </AdminField>
        <AdminField
          name="contactEmail"
          label="Contact email"
          errors={errors.contactEmail}
        >
          <input
            id="contactEmail-input"
            name="contactEmail"
            type="email"
            defaultValue={defaults.contactEmail ?? ""}
            className="form-input"
          />
        </AdminField>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          name="isAcceptingNew"
          defaultChecked={defaults.isAcceptingNew}
          className="size-4"
        />
        Accepting new members
      </label>

      <fieldset className="rounded-lg border border-rule bg-white p-5">
        <legend className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
          FAQ (up to 5)
        </legend>
        <ul className="space-y-3">
          {faq.map((f, i) => (
            <li key={i} className="space-y-2 rounded-md bg-cream p-3">
              <input
                name={`faq[${i}].q`}
                type="text"
                defaultValue={f.q}
                placeholder="Question (≤140 chars)"
                maxLength={140}
                className="form-input"
              />
              <textarea
                name={`faq[${i}].a`}
                defaultValue={f.a}
                placeholder="Answer (≤500 chars)"
                rows={3}
                maxLength={500}
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setFaq((prev) => prev.filter((_, j) => j !== i))}
                className="text-xs font-semibold text-ink-3 hover:text-rust-dark"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {faq.length < 5 && (
          <button
            type="button"
            onClick={() => setFaq((prev) => [...prev, { q: "", a: "" }])}
            className="mt-3 rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-navy"
          >
            + Add FAQ item
          </button>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? "Sending…" : "Submit for review"}
      </button>
    </form>
  );
}
