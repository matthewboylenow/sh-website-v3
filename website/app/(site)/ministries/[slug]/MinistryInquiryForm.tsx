"use client";

import { useId, useState } from "react";
import type { InquiryField, MinistryInquiryConfig } from "@/db/schema";
import { fieldKey, resolveFields, SYSTEM_INPUT_TYPE } from "@/lib/inquiry-fields";

type Kind = MinistryInquiryConfig["buttons"][number]["kind"];

export function MinistryInquiryForm({
  slug,
  ministryName,
  config,
}: {
  slug: string;
  ministryName: string;
  config: MinistryInquiryConfig;
}) {
  const enabledButtons = config.buttons.filter((b) => b.enabled);
  const [activeKind, setActiveKind] = useState<Kind | null>(null);

  if (!config.enabled || enabledButtons.length === 0) return null;

  return (
    <section className="rounded-lg border border-rule bg-cream p-6 sm:p-8">
      <h2 className="font-serif text-2xl font-bold text-navy">Get involved</h2>
      <p className="mt-2 text-sm text-ink-2">
        Pick the option that fits. A leader of {ministryName} will follow up by email.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {enabledButtons.map((b) => {
          const active = activeKind === b.kind;
          return (
            <button
              key={b.kind}
              type="button"
              onClick={() => setActiveKind(active ? null : b.kind)}
              className={
                active
                  ? "inline-flex items-center rounded-pill bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                  : "inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
              }
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {activeKind && (
        <InquiryFormBody
          slug={slug}
          kind={activeKind}
          kindLabel={enabledButtons.find((b) => b.kind === activeKind)?.label ?? ""}
          ministryName={ministryName}
          fields={resolveFields(config)}
          onClose={() => setActiveKind(null)}
        />
      )}
    </section>
  );
}

function InquiryFormBody({
  slug,
  kind,
  kindLabel,
  ministryName,
  fields,
  onClose,
}: {
  slug: string;
  kind: Kind;
  kindLabel: string;
  ministryName: string;
  fields: InquiryField[];
  onClose: () => void;
}) {
  const baseId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    // System slots — pull by hardcoded names. They only render when shown,
    // so missing ones default to empty.
    const sysName = String(fd.get("name") ?? "").trim();
    const sysEmail = String(fd.get("email") ?? "").trim();
    const sysPhone = String(fd.get("phone") ?? "").trim();
    const sysMessage = String(fd.get("message") ?? "").trim();

    // Custom fields — collect by id and key into customAnswers using the
    // visible label. Checkboxes return multiple values that we join.
    const customAnswers: Record<string, string> = {};
    for (const f of fields) {
      if (f.kind !== "custom") continue;
      const formName = `cf-${f.id}`;
      if (f.type === "checkboxes") {
        const vals = fd.getAll(formName).map((v) => String(v));
        if (vals.length > 0) customAnswers[f.label] = vals.join(" · ");
      } else {
        const v = String(fd.get(formName) ?? "").trim();
        if (v) customAnswers[f.label] = v;
      }
    }

    const body = {
      kind,
      name: sysName,
      email: sysEmail,
      phone: sysPhone || null,
      message: sysMessage || null,
      customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
    };

    try {
      const r = await fetch(`/api/ministries/${slug}/inquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error — check your connection and try again.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mt-6 rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-5 py-4">
        <p className="font-serif text-base font-bold text-emerald-800">Thanks — we got it.</p>
        <p className="mt-1 text-sm text-emerald-900">
          A leader of {ministryName} will follow up by email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-md bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rust-dark">
        {kindLabel}
      </p>

      {fields.map((f) => {
        if (f.kind === "system" && !f.shown) return null;
        const id = `${baseId}-${fieldKey(f)}`;
        return (
          <FieldRow key={fieldKey(f)} field={f} id={id} idPrefix={baseId} />
        );
      })}

      {error && (
        <p className="rounded-md border-l-4 border-rust bg-rust-pale px-3 py-2 text-sm text-rust-dark">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-pill bg-rust px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
        >
          {submitting ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="text-sm font-semibold text-ink-2 hover:text-navy disabled:opacity-70"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldRow({
  field,
  id,
  idPrefix,
}: {
  field: InquiryField;
  id: string;
  idPrefix: string;
}) {
  if (field.kind === "system") {
    const inputType = SYSTEM_INPUT_TYPE[field.systemKey];
    const name = field.systemKey;
    return (
      <Field id={id} label={field.label} required={field.required}>
        {inputType === "textarea" ? (
          <textarea
            id={id}
            name={name}
            rows={4}
            required={field.required}
            maxLength={5000}
            className="form-input"
          />
        ) : (
          <input
            id={id}
            name={name}
            type={inputType}
            required={field.required}
            maxLength={field.systemKey === "phone" ? 30 : 200}
            autoComplete={
              field.systemKey === "name"
                ? "name"
                : field.systemKey === "email"
                  ? "email"
                  : field.systemKey === "phone"
                    ? "tel"
                    : undefined
            }
            className="form-input"
          />
        )}
      </Field>
    );
  }

  // Custom field
  const name = `cf-${field.id}`;
  const options = field.options ?? [];

  if (field.type === "textarea") {
    return (
      <Field id={id} label={field.label} required={field.required}>
        <textarea
          id={id}
          name={name}
          rows={3}
          required={field.required}
          maxLength={2000}
          className="form-input"
        />
      </Field>
    );
  }

  if (field.type === "select") {
    return (
      <Field id={id} label={field.label} required={field.required}>
        <select id={id} name={name} required={field.required} className="form-input">
          <option value="">— Choose one —</option>
          {options.map((o, i) => (
            <option key={`${i}-${o}`} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.type === "radio") {
    return (
      <fieldset>
        <legend className="mb-1 block text-xs font-semibold text-ink-2">
          {field.label}
          {field.required && <span className="text-rust-dark"> *</span>}
        </legend>
        <div className="space-y-1.5">
          {options.map((o, i) => {
            const optId = `${idPrefix}-${field.id}-r${i}`;
            return (
              <label key={`${i}-${o}`} htmlFor={optId} className="flex items-center gap-2 text-sm text-ink">
                <input
                  id={optId}
                  type="radio"
                  name={name}
                  value={o}
                  required={field.required && i === 0}
                  className="size-4"
                />
                {o}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  // checkboxes
  return (
    <fieldset>
      <legend className="mb-1 block text-xs font-semibold text-ink-2">
        {field.label}
        {field.required && <span className="text-rust-dark"> *</span>}
      </legend>
      <div className="space-y-1.5">
        {options.map((o, i) => {
          const optId = `${idPrefix}-${field.id}-c${i}`;
          return (
            <label key={`${i}-${o}`} htmlFor={optId} className="flex items-center gap-2 text-sm text-ink">
              <input
                id={optId}
                type="checkbox"
                name={name}
                value={o}
                className="size-4"
              />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-2">
        {label}
        {required && <span className="text-rust-dark"> *</span>}
      </label>
      {children}
    </div>
  );
}
