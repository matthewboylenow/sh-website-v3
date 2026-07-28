"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { createPageAction, updatePageAction } from "./_actions";

type PageFormValues = {
  slug: string;
  title: string;
  summary: string | null;
  photoBlobKey: string | null;
  status: "draft" | "published" | "archived";
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageBlobKey: string | null;
  noindex: boolean;
  canonicalUrl: string | null;
};

export function PageForm({
  mode,
  pageId,
  defaultValues,
  photoPreviewUrl,
  ogImagePreviewUrl,
}: {
  mode: "create" | "edit";
  pageId?: string;
  defaultValues: Partial<PageFormValues>;
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
          ? await createPageAction(formData)
          : await updatePageAction(pageId!, formData);
      if (result.ok) {
        router.push(`/admin/pages/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  return (
    <form action={onSubmit} className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        {topError && (
          <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
            {topError}
          </div>
        )}

        <AdminField name="title" label="Title" required errors={errors.title}>
          <input
            id="title-input"
            name="title"
            type="text"
            defaultValue={defaultValues.title ?? ""}
            required
            maxLength={200}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="slug"
          label="URL slug"
          required
          hint="Public URL is /p/<slug>. Lowercase letters, numbers, hyphens only."
          errors={errors.slug}
        >
          <input
            id="slug-input"
            name="slug"
            type="text"
            defaultValue={defaultValues.slug ?? ""}
            required
            maxLength={120}
            className="form-input font-mono text-sm"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
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
          page first, then click <em>Sections</em> to add rich text, images,
          embeds, card grids, and more.
        </p>
      </div>

      <aside className="space-y-5">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Status
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            {(["draft", "published", "archived"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={s}
                  defaultChecked={(defaultValues.status ?? "draft") === s}
                />
                <span className="capitalize">{s}</span>
              </label>
            ))}
          </div>
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
              pathPrefix={`pages/${pageId ?? "new"}`}
            />
          </div>
        </div>

        <SeoPanel
          pathPrefix={`pages/${pageId ?? "new"}/og`}
          initial={{
            metaTitle: defaultValues.metaTitle,
            metaDescription: defaultValues.metaDescription,
            ogImageBlobKey: defaultValues.ogImageBlobKey,
            noindex: defaultValues.noindex,
            canonicalUrl: defaultValues.canonicalUrl,
          }}
          ogImagePreviewUrl={ogImagePreviewUrl}
          publicPath={defaultValues.slug ? `/${defaultValues.slug}` : undefined}
        />

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : mode === "create" ? "Create page" : "Save changes"}
        </button>
      </aside>
    </form>
  );
}
