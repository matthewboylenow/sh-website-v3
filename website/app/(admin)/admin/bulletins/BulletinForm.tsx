"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { ALLOWED_PDF_TYPES } from "@/lib/validators/blob";
import { createBulletinAction, updateBulletinAction } from "./_actions";

type Values = {
  weekOf: string;
  title: string | null;
  pdfBlobKey: string | null;
  thumbBlobKey: string | null;
  pageCount: number | null;
  publishedAt: Date | string | null;
};

export function BulletinForm({
  mode,
  bulletinId,
  defaultValues,
  pdfPreviewUrl,
}: {
  mode: "create" | "edit";
  bulletinId?: string;
  defaultValues: Partial<Values>;
  pdfPreviewUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const r =
        mode === "create"
          ? await createBulletinAction(formData)
          : await updateBulletinAction(bulletinId!, formData);
      if (r.ok) {
        router.push(`/admin/bulletins/${r.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in r) setErrors(r.fieldErrors);
      else setTopError(r.error);
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
        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField
            name="weekOf"
            label="Week of"
            required
            hint="Sunday's date for that week."
            errors={errors.weekOf}
          >
            <input
              id="weekOf-input"
              name="weekOf"
              type="date"
              defaultValue={
                typeof defaultValues.weekOf === "string"
                  ? defaultValues.weekOf
                  : ""
              }
              required
              className="form-input"
            />
          </AdminField>
          <AdminField
            name="title"
            label="Liturgical title"
            hint='Optional — e.g. "Second Sunday of Easter"'
            errors={errors.title}
          >
            <input
              id="title-input"
              name="title"
              type="text"
              defaultValue={defaultValues.title ?? ""}
              maxLength={200}
              className="form-input"
            />
          </AdminField>
        </div>

        <AdminField
          name="pageCount"
          label="Page count"
          hint="Optional — surfaced in the modal viewer."
          errors={errors.pageCount}
        >
          <input
            id="pageCount-input"
            name="pageCount"
            type="number"
            min={1}
            max={200}
            defaultValue={defaultValues.pageCount ?? ""}
            className="form-input max-w-[120px]"
          />
        </AdminField>

        <fieldset className="rounded-lg border border-rule bg-white p-5">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Bulletin PDF
          </legend>
          <PhotoUploader
            name="pdfBlobKey"
            initialKey={defaultValues.pdfBlobKey ?? null}
            initialPreviewUrl={pdfPreviewUrl}
            pathPrefix={`bulletins/${bulletinId ?? "new"}`}
            accept={ALLOWED_PDF_TYPES.join(",")}
          />
          {errors.pdfBlobKey?.length ? (
            <p className="mt-2 text-xs text-rust-dark">
              {errors.pdfBlobKey.join(" · ")}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-ink-3">
            PDFs only. Up to 25 MB. Bulletins go live immediately on save.
          </p>
        </fieldset>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Status
          </h3>
          <p className="mt-3 text-sm text-ink-2">
            Bulletins auto-publish on create. To unpublish, clear the date below.
          </p>
          <AdminField
            name="publishedAt"
            label="Published at"
            errors={errors.publishedAt}
            className="mt-3"
          >
            <input
              id="publishedAt-input"
              name="publishedAt"
              type="datetime-local"
              defaultValue={
                defaultValues.publishedAt
                  ? new Date(defaultValues.publishedAt as string).toISOString().slice(0, 16)
                  : ""
              }
              className="form-input"
            />
          </AdminField>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : mode === "create" ? "Publish bulletin" : "Save"}
        </button>
      </aside>
    </form>
  );
}
