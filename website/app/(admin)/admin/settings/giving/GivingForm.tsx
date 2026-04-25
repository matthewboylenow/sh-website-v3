"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { type GivingSettings } from "@/db/schema";
import { updateSiteSettingsGivingAction } from "../_actions";

type Designation = { label: string; url: string };
type Seasonal = {
  label: string;
  url: string;
  activeFrom: string;
  activeUntil: string;
};

export function GivingForm({ initial }: { initial: GivingSettings }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  // Repeatable rows are tracked by client state so we can add/remove.
  const [designations, setDesignations] = useState<Designation[]>(
    initial.designations ?? [],
  );
  const [seasonal, setSeasonal] = useState<Seasonal[]>(
    initial.seasonal ?? [],
  );

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    setSaved(false);
    start(async () => {
      const result = await updateSiteSettingsGivingAction(formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  return (
    <form action={onSubmit} className="space-y-8">
      {topError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}
      {saved && (
        <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </div>
      )}

      <Section title="Touchpoint URLs">
        <AdminField
          name="primaryUrl"
          label="Primary give URL"
          required
          hint='The "Give now" CTA — Touchpoint general fund.'
          errors={errors.primaryUrl}
        >
          <input
            id="primaryUrl-input"
            name="primaryUrl"
            type="url"
            defaultValue={initial.primaryUrl ?? ""}
            placeholder="https://"
            required
            className="form-input"
          />
        </AdminField>
        <AdminField
          name="recurringUrl"
          label="Recurring give URL"
          hint="Optional separate Touchpoint flow for recurring donations."
          errors={errors.recurringUrl}
        >
          <input
            id="recurringUrl-input"
            name="recurringUrl"
            type="url"
            defaultValue={initial.recurringUrl ?? ""}
            placeholder="https://"
            className="form-input"
          />
        </AdminField>
      </Section>

      <Section
        title="Designations"
        description="Optional. Building Fund, Outreach, etc. Each row becomes a button on the Give page."
      >
        <ul className="space-y-3">
          {designations.map((d, i) => (
            <li key={i} className="grid gap-3 rounded-md bg-cream p-4 sm:grid-cols-[1fr_2fr_auto]">
              <input
                name={`designations[${i}].label`}
                type="text"
                defaultValue={d.label}
                placeholder="Label"
                className="form-input"
              />
              <input
                name={`designations[${i}].url`}
                type="url"
                defaultValue={d.url}
                placeholder="https://"
                className="form-input"
              />
              <button
                type="button"
                onClick={() =>
                  setDesignations((prev) => prev.filter((_, j) => j !== i))
                }
                className="rounded-pill border border-rule bg-white px-3 py-2 text-xs font-semibold text-ink-2 hover:border-rust hover:text-rust-dark"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            setDesignations((prev) => [...prev, { label: "", url: "" }])
          }
          className="mt-3 rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-navy"
        >
          + Add designation
        </button>
      </Section>

      <Section
        title="Seasonal campaigns"
        description='Time-windowed campaigns — e.g. "Christmas Giving 2026". Banner appears on the Give page only inside the date window.'
      >
        <ul className="space-y-3">
          {seasonal.map((s, i) => (
            <li key={i} className="space-y-3 rounded-md bg-cream p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name={`seasonal[${i}].label`}
                  type="text"
                  defaultValue={s.label}
                  placeholder="Christmas Giving 2026"
                  className="form-input"
                />
                <input
                  name={`seasonal[${i}].url`}
                  type="url"
                  defaultValue={s.url}
                  placeholder="https://"
                  className="form-input"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="text-xs text-ink-3">
                  From
                  <input
                    name={`seasonal[${i}].activeFrom`}
                    type="date"
                    defaultValue={s.activeFrom}
                    className="form-input mt-1"
                  />
                </label>
                <label className="text-xs text-ink-3">
                  Until
                  <input
                    name={`seasonal[${i}].activeUntil`}
                    type="date"
                    defaultValue={s.activeUntil}
                    className="form-input mt-1"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSeasonal((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="self-end rounded-pill border border-rule bg-white px-3 py-2 text-xs font-semibold text-ink-2 hover:border-rust hover:text-rust-dark"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            setSeasonal((prev) => [
              ...prev,
              { label: "", url: "", activeFrom: "", activeUntil: "" },
            ])
          }
          className="mt-3 rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-navy"
        >
          + Add seasonal campaign
        </button>
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save giving settings"}
      </button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-rule bg-white p-6">
      <h2 className="font-serif text-lg font-bold text-navy">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}
