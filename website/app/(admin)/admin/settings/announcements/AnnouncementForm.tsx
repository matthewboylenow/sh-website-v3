"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import {
  ANNOUNCEMENT_ACCENTS,
  ANNOUNCEMENT_KINDS,
  type Announcement,
  type AnnouncementAccent,
  type AnnouncementDateRow,
  type AnnouncementKind,
} from "@/db/schema";
import {
  createAnnouncementAction,
  setAnnouncementStatusAction,
  updateAnnouncementAction,
} from "./_actions";

type Defaults = Partial<Announcement>;

const KIND_LABEL: Record<AnnouncementKind, string> = {
  slide_in: "Slide-in (bottom-right)",
  modal: "Modal (full-screen)",
};

const ACCENT_LABEL: Record<AnnouncementAccent, string> = {
  navy: "Navy",
  rust: "Rust",
  gold: "Gold",
};

function toLocalInputValue(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnnouncementForm({
  mode,
  id,
  defaultValues,
  imagePreviewUrl,
}: {
  mode: "create" | "edit";
  id?: string;
  defaultValues: Defaults;
  imagePreviewUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [dateRows, setDateRows] = useState<AnnouncementDateRow[]>(
    defaultValues.dateRows ?? [],
  );

  const updateRow = (i: number, patch: Partial<AnnouncementDateRow>) =>
    setDateRows((cur) =>
      cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  const removeRow = (i: number) =>
    setDateRows((cur) => cur.filter((_, idx) => idx !== i));
  const addRow = () =>
    setDateRows((cur) => [...cur, { label: "", detail: "" }]);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const r =
        mode === "create"
          ? await createAnnouncementAction(formData)
          : await updateAnnouncementAction(id!, formData);
      if (r.ok) {
        router.push(`/admin/settings/announcements/${r.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in r) setErrors(r.fieldErrors);
      else setTopError(r.error);
    });
  };

  const onPublish = () => {
    if (!id) return;
    start(async () => {
      const r = await setAnnouncementStatusAction(id, "published");
      if (!r.ok && "error" in r) setTopError(r.error);
      else router.refresh();
    });
  };
  const onUnpublish = () => {
    if (!id) return;
    start(async () => {
      const r = await setAnnouncementStatusAction(id, "draft");
      if (!r.ok && "error" in r) setTopError(r.error);
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

      <div className="space-y-5">
        <AdminField name="title" label="Title" required errors={errors.title}>
          <input
            id="title-input"
            name="title"
            type="text"
            defaultValue={defaultValues.title ?? ""}
            required
            maxLength={120}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="ribbon"
          label="Ribbon (small uppercase tag)"
          hint='Shown above the title — e.g. "April · Child Abuse Prevention Month".'
          errors={errors.ribbon}
        >
          <input
            id="ribbon-input"
            name="ribbon"
            type="text"
            defaultValue={defaultValues.ribbon ?? ""}
            maxLength={80}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="body"
          label="Body"
          hint="One or two short paragraphs. Plain text or basic HTML."
          errors={errors.body}
        >
          <textarea
            id="body-input"
            name="body"
            defaultValue={defaultValues.body ?? ""}
            rows={4}
            maxLength={4000}
            className="form-input"
          />
        </AdminField>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label className="text-sm font-semibold text-ink">Date rows (optional)</label>
            <button
              type="button"
              onClick={addRow}
              disabled={dateRows.length >= 10}
              className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
            >
              + Add row
            </button>
          </div>
          <p className="mb-3 text-xs text-ink-3">
            Highlighted as a sub-card with a gold left border.{" "}
            Example: <strong>Apr 17</strong> · Wear Blue Day.
          </p>
          {dateRows.length === 0 ? (
            <p className="rounded-md border border-dashed border-rule px-4 py-3 text-center text-xs text-ink-3">
              None — the dated callout strip won&rsquo;t render.
            </p>
          ) : (
            <ul className="space-y-2">
              {dateRows.map((r, i) => (
                <li key={i} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                  <input
                    type="text"
                    value={r.label}
                    maxLength={40}
                    placeholder="Label (Apr 17)"
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={r.detail}
                    maxLength={120}
                    placeholder="Detail (Wear Blue Day)"
                    onChange={(e) => updateRow(i, { detail: e.target.value })}
                    className="form-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="hidden" name="dateRows" value={JSON.stringify(dateRows)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
          <AdminField name="ctaLabel" label="CTA label" errors={errors.ctaLabel}>
            <input
              id="ctaLabel-input"
              name="ctaLabel"
              type="text"
              defaultValue={defaultValues.ctaLabel ?? ""}
              maxLength={40}
              placeholder="Learn More"
              className="form-input"
            />
          </AdminField>
          <AdminField name="ctaHref" label="CTA URL" errors={errors.ctaHref}>
            <input
              id="ctaHref-input"
              name="ctaHref"
              type="text"
              defaultValue={defaultValues.ctaHref ?? ""}
              maxLength={1000}
              placeholder="https://… or /path"
              className="form-input font-mono text-sm"
            />
          </AdminField>
        </div>

        <AdminField
          name="imageBlobKey"
          label="Image (optional)"
          hint="Renders above the title. Skip for a text-only card."
          errors={errors.imageBlobKey}
        >
          <PhotoUploader
            name="imageBlobKey"
            initialKey={defaultValues.imageBlobKey ?? null}
            initialPreviewUrl={imagePreviewUrl}
            pathPrefix="announcements"
          />
        </AdminField>
      </div>

      <aside className="space-y-6">
        <div className="space-y-4 rounded-lg border border-rule bg-white p-5">
          <AdminField name="kind" label="Type" errors={errors.kind}>
            <select
              id="kind-input"
              name="kind"
              defaultValue={defaultValues.kind ?? "slide_in"}
              className="form-input"
            >
              {ANNOUNCEMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField name="status" label="Status" errors={errors.status}>
            <select
              id="status-input"
              name="status"
              defaultValue={defaultValues.status ?? "draft"}
              className="form-input"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </AdminField>

          <AdminField
            name="priority"
            label="Priority"
            hint="Higher wins when multiple are active. -100 to 100."
            errors={errors.priority}
          >
            <input
              id="priority-input"
              name="priority"
              type="number"
              min={-100}
              max={100}
              defaultValue={defaultValues.priority ?? 0}
              className="form-input"
            />
          </AdminField>

          <AdminField name="accent" label="Accent" errors={errors.accent}>
            <select
              id="accent-input"
              name="accent"
              defaultValue={defaultValues.accent ?? "navy"}
              className="form-input"
            >
              {ANNOUNCEMENT_ACCENTS.map((a) => (
                <option key={a} value={a}>
                  {ACCENT_LABEL[a]}
                </option>
              ))}
            </select>
          </AdminField>
        </div>

        <div className="space-y-4 rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Schedule
          </h3>
          <AdminField name="startsAt" label="Starts" errors={errors.startsAt}>
            <input
              id="startsAt-input"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(defaultValues.startsAt ?? null)}
              className="form-input"
            />
          </AdminField>
          <AdminField name="endsAt" label="Ends" errors={errors.endsAt}>
            <input
              id="endsAt-input"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(defaultValues.endsAt ?? null)}
              className="form-input"
            />
          </AdminField>
          <p className="text-xs text-ink-3">
            Leave blank to show whenever <em>Published</em>. Otherwise auto-shows
            only inside the window.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Behavior
          </h3>
          <AdminField
            name="showDelaySeconds"
            label="Show after (sec)"
            hint="Slide-in only. Wait this long after page load."
            errors={errors.showDelaySeconds}
          >
            <input
              id="showDelaySeconds-input"
              name="showDelaySeconds"
              type="number"
              step="0.1"
              min={0}
              max={60}
              defaultValue={String(defaultValues.showDelaySeconds ?? "2.5")}
              className="form-input"
            />
          </AdminField>
          <AdminField
            name="dismissDays"
            label="Dismiss for (days)"
            hint="0 = session only · 7 = a week · 30 = a month."
            errors={errors.dismissDays}
          >
            <input
              id="dismissDays-input"
              name="dismissDays"
              type="number"
              min={0}
              max={365}
              defaultValue={defaultValues.dismissDays ?? 7}
              className="form-input"
            />
          </AdminField>
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
          >
            {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
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
