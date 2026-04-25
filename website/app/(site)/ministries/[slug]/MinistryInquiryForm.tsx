"use client";

import { useId, useState } from "react";
import type { MinistryInquiryConfig } from "@/db/schema";

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
  onClose,
}: {
  slug: string;
  kind: Kind;
  kindLabel: string;
  ministryName: string;
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
    const body = {
      kind,
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || null,
      message: String(fd.get("message") ?? "").trim() || null,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${baseId}-name`} label="Your name" required>
          <input
            id={`${baseId}-name`}
            name="name"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            className="form-input"
          />
        </Field>
        <Field id={`${baseId}-email`} label="Email" required>
          <input
            id={`${baseId}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            className="form-input"
          />
        </Field>
      </div>
      <Field id={`${baseId}-phone`} label="Phone (optional)">
        <input
          id={`${baseId}-phone`}
          name="phone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
          className="form-input"
        />
      </Field>
      <Field id={`${baseId}-message`} label="Anything you'd like the leader to know? (optional)">
        <textarea
          id={`${baseId}-message`}
          name="message"
          rows={4}
          maxLength={5000}
          className="form-input"
        />
      </Field>

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
