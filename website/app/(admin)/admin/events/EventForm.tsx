"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { TagPicker } from "@/components/admin/TagPicker";
import type { Recurrence } from "@/db/schema";
import { RecurrenceEditor } from "./RecurrenceEditor";
import {
  createEventAction,
  setEventStatusAction,
  updateEventAction,
} from "./_actions";

type EventFormValues = {
  slug: string;
  title: string;
  lede: string | null;
  body: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  location: string | null;
  audiences: string[] | null;
  categories: string[] | null;
  registerUrl: string | null;
  registerCtaLabel: string | null;
  photoBlobKey: string | null;
  isFeatured: boolean;
  status: "draft" | "published" | "archived";
  recurrence: Recurrence | null;
  exceptionDates: string[] | null;
  ministryId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageBlobKey: string | null;
  noindex: boolean;
  canonicalUrl: string | null;
};

/** Convert a Date | ISO string to the "YYYY-MM-DDThh:mm" shape the
 *  datetime-local input wants. */
function toLocalInputValue(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  mode,
  eventId,
  defaultValues,
  photoPreviewUrl,
  ogImagePreviewUrl,
  audienceOptions,
  categoryOptions,
  ministryOptions,
}: {
  mode: "create" | "edit";
  eventId?: string;
  defaultValues: Partial<EventFormValues>;
  /** Already-resolved image URL for the existing photoBlobKey. */
  photoPreviewUrl?: string | null;
  ogImagePreviewUrl?: string | null;
  audienceOptions: readonly string[];
  categoryOptions: readonly string[];
  ministryOptions: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(
    defaultValues.recurrence ?? null,
  );
  const [exceptionDates, setExceptionDates] = useState<string[]>(
    defaultValues.exceptionDates ?? [],
  );
  const [startsAtLocal, setStartsAtLocal] = useState<string>(
    toLocalInputValue(defaultValues.startsAt),
  );

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const result =
        mode === "create"
          ? await createEventAction(formData)
          : await updateEventAction(eventId!, formData);
      if (result.ok) {
        router.push(`/admin/events/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) {
        setErrors(result.fieldErrors);
      } else {
        setTopError(result.error);
      }
    });
  };

  const onPublish = () => {
    if (!eventId) return;
    start(async () => {
      const result = await setEventStatusAction(eventId, "published");
      if (!result.ok && "error" in result) setTopError(result.error);
      else router.refresh();
    });
  };
  const onUnpublish = () => {
    if (!eventId) return;
    start(async () => {
      const result = await setEventStatusAction(eventId, "draft");
      if (!result.ok && "error" in result) setTopError(result.error);
      else router.refresh();
    });
  };

  return (
    <form action={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_280px] lg:gap-8">
      {topError && (
        <div className="lg:col-span-2 rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}

      {/* ---- Main column --------------------------------------- */}
      <div className="space-y-5">
        <Field name="title" label="Title" required errors={errors.title}>
          <input
            id="ev-title"
            name="title"
            type="text"
            defaultValue={defaultValues.title ?? ""}
            required
            maxLength={200}
            className="form-input"
          />
        </Field>

        <Field
          name="slug"
          label="Slug"
          required
          hint="Lowercase letters, numbers, hyphens. Used in /events/{slug}."
          errors={errors.slug}
        >
          <input
            id="ev-slug"
            name="slug"
            type="text"
            defaultValue={defaultValues.slug ?? ""}
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            className="form-input font-mono text-sm"
          />
        </Field>

        <Field
          name="lede"
          label="Summary"
          hint="One-sentence teaser shown on cards and the hero. Up to 500 characters."
          errors={errors.lede}
        >
          <textarea
            id="ev-lede"
            name="lede"
            defaultValue={defaultValues.lede ?? ""}
            maxLength={500}
            rows={2}
            className="form-input"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="startsAt" label="Starts" required errors={errors.startsAt}>
            <input
              id="ev-startsAt"
              name="startsAt"
              type="datetime-local"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              required
              className="form-input"
            />
          </Field>
          <Field name="endsAt" label="Ends" required errors={errors.endsAt}>
            <input
              id="ev-endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(defaultValues.endsAt)}
              required
              className="form-input"
            />
          </Field>
        </div>

        <Field name="location" label="Location" errors={errors.location}>
          <input
            id="ev-location"
            name="location"
            type="text"
            defaultValue={defaultValues.location ?? ""}
            placeholder="Parish Hall · Church · etc."
            className="form-input"
          />
        </Field>

        <Field
          name="audiences"
          label="Audiences"
          hint="Who is this event for? Manage the list at Settings → Taxonomies."
          errors={errors.audiences}
        >
          <TagPicker
            name="audiences"
            options={audienceOptions}
            defaultValue={defaultValues.audiences ?? []}
          />
        </Field>

        <Field
          name="categories"
          label="Categories"
          hint="What kind of event? Manage the list at Settings → Taxonomies."
          errors={errors.categories}
        >
          <TagPicker
            name="categories"
            options={categoryOptions}
            defaultValue={defaultValues.categories ?? []}
          />
        </Field>

        <Field
          name="ministryId"
          label="Ministry"
          hint="Optional — when set, this event surfaces on the ministry's page (drop a Featured events block there)."
          errors={errors.ministryId}
        >
          <select
            id="ministryId-input"
            name="ministryId"
            defaultValue={defaultValues.ministryId ?? ""}
            className="form-input"
          >
            <option value="">— No ministry (parish-wide) —</option>
            {ministryOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <RecurrenceEditor
          value={recurrence}
          onChange={setRecurrence}
          exceptionDates={exceptionDates}
          onExceptionsChange={setExceptionDates}
          baseStart={startsAtLocal}
        />
        <input
          type="hidden"
          name="recurrence"
          value={recurrence ? JSON.stringify(recurrence) : ""}
        />
        <input
          type="hidden"
          name="exceptionDates"
          value={JSON.stringify(exceptionDates)}
        />

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field
            name="registerUrl"
            label="Register URL"
            hint="External registration link if any. Leave blank for free / no-registration."
            errors={errors.registerUrl}
          >
            <input
              id="ev-registerUrl"
              name="registerUrl"
              type="url"
              defaultValue={defaultValues.registerUrl ?? ""}
              placeholder="https://"
              className="form-input"
            />
          </Field>
          <Field
            name="registerCtaLabel"
            label="CTA label"
            hint='Falls back to "Sign Up" when blank.'
            errors={errors.registerCtaLabel}
          >
            <input
              id="ev-registerCtaLabel"
              name="registerCtaLabel"
              type="text"
              defaultValue={defaultValues.registerCtaLabel ?? ""}
              maxLength={40}
              placeholder="Sign Up"
              className="form-input"
            />
          </Field>
        </div>

        <Field name="body" label="Body" errors={errors.body}>
          <RichTextEditor
            name="body"
            initialHtml={defaultValues.body ?? ""}
            pathPrefix={`events/${eventId ?? "new"}`}
            placeholder="Tell parishioners what to expect…"
          />
        </Field>
      </div>

      {/* ---- Side column ---------------------------------------- */}
      <aside className="space-y-6">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Status
          </h3>
          <div className="mt-3">
            <select
              name="status"
              defaultValue={defaultValues.status ?? "draft"}
              className="form-input"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={defaultValues.isFeatured ?? false}
              className="size-4"
            />
            Featured (homepage)
          </label>
        </div>

        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Hero photo
          </h3>
          <div className="mt-3">
            <PhotoUploader
              name="photoBlobKey"
              initialKey={defaultValues.photoBlobKey ?? null}
              initialPreviewUrl={photoPreviewUrl}
              pathPrefix={`events/${eventId ?? "new"}`}
            />
          </div>
        </div>

        <SeoPanel
          pathPrefix={`events/${eventId ?? "new"}/og`}
          initial={{
            metaTitle: defaultValues.metaTitle,
            metaDescription: defaultValues.metaDescription,
            ogImageBlobKey: defaultValues.ogImageBlobKey,
            noindex: defaultValues.noindex,
            canonicalUrl: defaultValues.canonicalUrl,
          }}
          ogImagePreviewUrl={ogImagePreviewUrl}
          publicPath={defaultValues.slug ? `/events/${defaultValues.slug}` : undefined}
        />

        <div className="space-y-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
          >
            {pending ? "Saving…" : mode === "create" ? "Create event" : "Save"}
          </button>
          {mode === "edit" && (
            <>
              {defaultValues.status === "published" ? (
                <button
                  type="button"
                  onClick={onUnpublish}
                  disabled={pending}
                  className="w-full rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-navy disabled:opacity-70"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={pending}
                  className="w-full rounded-pill bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light disabled:opacity-70"
                >
                  Publish
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  hint,
  errors,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={`ev-${name}`} className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
        {required && <span className="ml-1 text-rust">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && !errors?.length && (
        <p className="mt-1 text-xs text-ink-3">{hint}</p>
      )}
      {errors?.length ? (
        <p className="mt-1 text-xs text-rust-dark">{errors.join(" · ")}</p>
      ) : null}
    </label>
  );
}
