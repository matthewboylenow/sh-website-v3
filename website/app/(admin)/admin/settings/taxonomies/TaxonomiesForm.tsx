"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type Taxonomies } from "@/db/schema";
import { saveTaxonomiesAction } from "./_actions";

export function TaxonomiesForm({ initial }: { initial: Taxonomies }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [eventCategories, setEventCategories] = useState<string[]>(
    initial.eventCategories ?? [],
  );
  const [eventAudiences, setEventAudiences] = useState<string[]>(
    initial.eventAudiences ?? [],
  );
  const [ministryAudiences, setMinistryAudiences] = useState<string[]>(
    initial.ministryAudiences ?? [],
  );

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    setSaved(false);
    start(async () => {
      const r = await saveTaxonomiesAction(formData);
      if (r.ok) {
        setSaved(true);
        router.refresh();
      } else if ("fieldErrors" in r) {
        setErrors(r.fieldErrors);
      } else {
        setTopError(r.error);
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
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

      <ListEditor
        title="Event categories"
        hint="What kind of event — worship, fellowship, etc. Used for /events filters and event editor."
        name="eventCategories"
        value={eventCategories}
        onChange={setEventCategories}
        errors={errors.eventCategories}
      />
      <ListEditor
        title="Event audiences"
        hint="Who an event is for. Used for /events filters and event editor."
        name="eventAudiences"
        value={eventAudiences}
        onChange={setEventAudiences}
        errors={errors.eventAudiences}
      />
      <ListEditor
        title="Ministry audiences"
        hint="Who a ministry is for — internal-only (the public ministry pages don't render audiences)."
        name="ministryAudiences"
        value={ministryAudiences}
        onChange={setMinistryAudiences}
        errors={errors.ministryAudiences}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save taxonomies"}
      </button>
    </form>
  );
}

function ListEditor({
  title,
  hint,
  name,
  value,
  onChange,
  errors,
}: {
  title: string;
  hint?: string;
  name: string;
  value: string[];
  onChange: (next: string[]) => void;
  errors?: string[];
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (!v) return;
    if (value.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...value, v]);
    setDraft("");
  };

  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  return (
    <fieldset className="rounded-lg border border-rule bg-white p-6">
      <input type="hidden" name={name} value={value.join(",")} />
      <legend className="px-2 font-serif text-base font-bold text-navy">
        {title}
      </legend>
      {hint && <p className="mt-1 text-sm text-ink-3">{hint}</p>}

      <ul className="mt-4 flex flex-wrap gap-2">
        {value.length === 0 && (
          <li className="text-xs text-ink-3">No items yet.</li>
        )}
        {value.map((v) => (
          <li key={v}>
            <span className="inline-flex items-center gap-2 rounded-pill bg-cream px-3 py-1.5 text-xs font-semibold capitalize text-ink-2">
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                aria-label={`Remove ${v}`}
                className="rounded-full text-ink-3 hover:text-rust-dark"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="add tag (lowercase, hyphens)"
          className="form-input max-w-[280px]"
          maxLength={40}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-navy"
        >
          + Add
        </button>
      </div>

      {errors?.length ? (
        <p className="mt-2 text-xs text-rust-dark">{errors.join(" · ")}</p>
      ) : null}
    </fieldset>
  );
}
