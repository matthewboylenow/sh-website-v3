"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { MINISTRY_CATEGORIES } from "@/lib/validators/ministries";
import {
  createMinistryAction,
  setMinistryStatusAction,
  updateMinistryAction,
} from "./_actions";

type Values = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  audiences: string[] | null;
  category: (typeof MINISTRY_CATEGORIES)[number] | null;
  matchmakerTags: string[] | null;
  meetingCadence: string | null;
  leadStaffId: string | null;
  contactEmail: string | null;
  isAcceptingNew: boolean;
  orderingPriority: number;
  status: "draft" | "published" | "archived";
};

export function MinistryForm({
  mode,
  ministryId,
  defaultValues,
  staffOptions,
}: {
  mode: "create" | "edit";
  ministryId?: string;
  defaultValues: Partial<Values>;
  staffOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const result =
        mode === "create"
          ? await createMinistryAction(formData)
          : await updateMinistryAction(ministryId!, formData);
      if (result.ok) {
        router.push(`/admin/ministries/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  const onPublish = () => {
    if (!ministryId) return;
    start(async () => {
      const r = await setMinistryStatusAction(ministryId, "published");
      if (!r.ok && "error" in r) setTopError(r.error);
      else router.refresh();
    });
  };
  const onUnpublish = () => {
    if (!ministryId) return;
    start(async () => {
      const r = await setMinistryStatusAction(ministryId, "draft");
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
        <AdminField name="name" label="Name" required errors={errors.name}>
          <input
            id="name-input"
            name="name"
            type="text"
            defaultValue={defaultValues.name ?? ""}
            required
            maxLength={200}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="slug"
          label="Slug"
          required
          hint="Used in /ministries/{slug}."
          errors={errors.slug}
        >
          <input
            id="slug-input"
            name="slug"
            type="text"
            defaultValue={defaultValues.slug ?? ""}
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            className="form-input font-mono text-sm"
          />
        </AdminField>

        <AdminField
          name="tagline"
          label="Tagline"
          hint="120 chars. Shown on cards."
          errors={errors.tagline}
        >
          <input
            id="tagline-input"
            name="tagline"
            type="text"
            defaultValue={defaultValues.tagline ?? ""}
            maxLength={120}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="description"
          label="Description (markdown)"
          errors={errors.description}
        >
          <textarea
            id="description-input"
            name="description"
            defaultValue={defaultValues.description ?? ""}
            rows={8}
            className="form-input"
          />
        </AdminField>

        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField name="meetingCadence" label="Meeting cadence" errors={errors.meetingCadence}>
            <input
              id="meetingCadence-input"
              name="meetingCadence"
              type="text"
              defaultValue={defaultValues.meetingCadence ?? ""}
              placeholder='"2nd Thursdays, 7 PM"'
              maxLength={80}
              className="form-input"
            />
          </AdminField>
          <AdminField name="contactEmail" label="Contact email" errors={errors.contactEmail}>
            <input
              id="contactEmail-input"
              name="contactEmail"
              type="email"
              defaultValue={defaultValues.contactEmail ?? ""}
              className="form-input"
            />
          </AdminField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField
            name="audiences"
            label="Audiences"
            hint="Comma-separated. Used by matchmaker + filters."
            errors={errors.audiences}
          >
            <input
              id="audiences-input"
              name="audiences"
              type="text"
              defaultValue={(defaultValues.audiences ?? []).join(", ")}
              className="form-input"
            />
          </AdminField>
          <AdminField
            name="matchmakerTags"
            label="Matchmaker tags"
            hint="Comma-separated. The Matchmaker quiz weights these."
            errors={errors.matchmakerTags}
          >
            <input
              id="matchmakerTags-input"
              name="matchmakerTags"
              type="text"
              defaultValue={(defaultValues.matchmakerTags ?? []).join(", ")}
              className="form-input"
            />
          </AdminField>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Status
          </h3>
          <select
            name="status"
            defaultValue={defaultValues.status ?? "draft"}
            className="form-input mt-3"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="rounded-lg border border-rule bg-white p-5 space-y-4">
          <AdminField name="category" label="Category" errors={errors.category}>
            <select
              id="category-input"
              name="category"
              defaultValue={defaultValues.category ?? ""}
              className="form-input"
            >
              <option value="">— None —</option>
              {MINISTRY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField name="leadStaffId" label="Lead staff" errors={errors.leadStaffId}>
            <select
              id="leadStaffId-input"
              name="leadStaffId"
              defaultValue={defaultValues.leadStaffId ?? ""}
              className="form-input"
            >
              <option value="">— None —</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            name="orderingPriority"
            label="Order priority"
            hint="Lower sorts first."
            errors={errors.orderingPriority}
          >
            <input
              id="orderingPriority-input"
              name="orderingPriority"
              type="number"
              min={0}
              max={9999}
              defaultValue={defaultValues.orderingPriority ?? 100}
              className="form-input"
            />
          </AdminField>

          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="isAcceptingNew"
              defaultChecked={defaultValues.isAcceptingNew ?? true}
              className="size-4"
            />
            Accepting new members
          </label>
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
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
