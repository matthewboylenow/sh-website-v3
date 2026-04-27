"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { TagPicker } from "@/components/admin/TagPicker";
import { FORMATION_CATEGORIES, type FormationCategory } from "@/db/schema";
import {
  createFormationAction,
  setFormationStatusAction,
  updateFormationAction,
} from "./_actions";

type Values = {
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  category: FormationCategory;
  audiences: string[] | null;
  photoBlobKey: string | null;
  contactEmail: string | null;
  leadStaffId: string | null;
  orderingPriority: number;
  status: "draft" | "published" | "archived";
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageBlobKey: string | null;
  noindex: boolean;
  canonicalUrl: string | null;
};

const CATEGORY_LABEL: Record<FormationCategory, string> = {
  kids: "Kids",
  youth: "Youth",
  adults: "Adults",
  families: "Families",
};

export function FormationForm({
  mode,
  pageId,
  defaultValues,
  staffOptions,
  audienceOptions,
  photoPreviewUrl,
  ogImagePreviewUrl,
}: {
  mode: "create" | "edit";
  pageId?: string;
  defaultValues: Partial<Values>;
  staffOptions: { id: string; name: string }[];
  audienceOptions: readonly string[];
  photoPreviewUrl?: string | null;
  ogImagePreviewUrl?: string | null;
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
          ? await createFormationAction(formData)
          : await updateFormationAction(pageId!, formData);
      if (result.ok) {
        router.push(`/admin/formation/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  const onPublish = () => {
    if (!pageId) return;
    start(async () => {
      const r = await setFormationStatusAction(pageId, "published");
      if (!r.ok && "error" in r) setTopError(r.error);
      else router.refresh();
    });
  };
  const onUnpublish = () => {
    if (!pageId) return;
    start(async () => {
      const r = await setFormationStatusAction(pageId, "draft");
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
          hint="Used in /formation/{slug}."
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
          name="summary"
          label="Summary"
          hint="One-line overview shown on cards + as the meta description."
          errors={errors.summary}
        >
          <textarea
            id="summary-input"
            name="summary"
            defaultValue={defaultValues.summary ?? ""}
            maxLength={500}
            rows={2}
            className="form-input"
          />
        </AdminField>

        <p className="rounded-md border border-dashed border-rule bg-cream/40 px-4 py-3 text-xs text-ink-3">
          Long-form content lives in <strong>Sections</strong> — save the
          page, then click <em>Sections</em> to add rich text, images,
          embeds, card grids, etc. The description field has been retired.
        </p>

        <AdminField name="contactEmail" label="Contact email" errors={errors.contactEmail}>
          <input
            id="contactEmail-input"
            name="contactEmail"
            type="email"
            defaultValue={defaultValues.contactEmail ?? ""}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="audiences"
          label="Audiences"
          hint="Manage the list at Settings → Taxonomies."
          errors={errors.audiences}
        >
          <TagPicker
            name="audiences"
            options={audienceOptions}
            defaultValue={defaultValues.audiences ?? []}
          />
        </AdminField>
      </div>

      <aside className="space-y-6">
        <div className="rounded-lg border border-rule bg-white p-5 space-y-4">
          <AdminField name="category" label="Category" required errors={errors.category}>
            <select
              id="category-input"
              name="category"
              defaultValue={defaultValues.category ?? "kids"}
              className="form-input"
            >
              {FORMATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
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
        </div>

        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Cover photo
          </h3>
          <div className="mt-3">
            <PhotoUploader
              name="photoBlobKey"
              initialKey={defaultValues.photoBlobKey ?? null}
              initialPreviewUrl={photoPreviewUrl}
              pathPrefix={`formation/${pageId ?? "new"}`}
            />
          </div>
        </div>

        <SeoPanel
          pathPrefix={`formation/${pageId ?? "new"}/og`}
          initial={{
            metaTitle: defaultValues.metaTitle,
            metaDescription: defaultValues.metaDescription,
            ogImageBlobKey: defaultValues.ogImageBlobKey,
            noindex: defaultValues.noindex,
            canonicalUrl: defaultValues.canonicalUrl,
          }}
          ogImagePreviewUrl={ogImagePreviewUrl}
          publicPath={defaultValues.slug ? `/formation/${defaultValues.slug}` : undefined}
        />

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
