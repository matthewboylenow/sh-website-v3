"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { POST_CATEGORIES, type PostCategory } from "@/db/schema";
import {
  createPostAction,
  setPostStatusAction,
  updatePostAction,
} from "./_actions";

type Values = {
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: PostCategory;
  photoBlobKey: string | null;
  authorName: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: Date | string | null;
};

const CATEGORY_LABEL: Record<PostCategory, string> = {
  pastor: "Pastor",
  stewardship: "Stewardship",
};

function toDateInputValue(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DDTHH:MM in local TZ for <input type="datetime-local">
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export function PostForm({
  mode,
  postId,
  defaultValues,
  photoPreviewUrl,
}: {
  mode: "create" | "edit";
  postId?: string;
  defaultValues: Partial<Values>;
  photoPreviewUrl?: string | null;
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
          ? await createPostAction(formData)
          : await updatePostAction(postId!, formData);
      if (result.ok) {
        router.push(`/admin/posts/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  const onPublish = () => {
    if (!postId) return;
    start(async () => {
      const r = await setPostStatusAction(postId, "published");
      if (!r.ok && "error" in r) setTopError(r.error);
      else router.refresh();
    });
  };
  const onUnpublish = () => {
    if (!postId) return;
    start(async () => {
      const r = await setPostStatusAction(postId, "draft");
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
            maxLength={200}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="slug"
          label="Slug"
          required
          hint="Used in /blog/{slug}."
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
          hint="One or two sentences. Shown on cards + as the meta description."
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

        <AdminField name="body" label="Body" errors={errors.body}>
          <RichTextEditor
            name="body"
            initialHtml={defaultValues.body ?? ""}
            pathPrefix={`posts/${postId ?? "new"}`}
            placeholder="Write the post…"
          />
        </AdminField>

        <AdminField
          name="authorName"
          label="Author byline (optional)"
          hint="Override the default by-name (defaults to the signed-in user)."
          errors={errors.authorName}
        >
          <input
            id="authorName-input"
            name="authorName"
            type="text"
            defaultValue={defaultValues.authorName ?? ""}
            maxLength={120}
            className="form-input"
          />
        </AdminField>
      </div>

      <aside className="space-y-6">
        <div className="rounded-lg border border-rule bg-white p-5 space-y-4">
          <AdminField name="category" label="Category" required errors={errors.category}>
            <select
              id="category-input"
              name="category"
              defaultValue={defaultValues.category ?? "pastor"}
              className="form-input"
            >
              {POST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
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
            name="publishedAt"
            label="Publish date"
            hint="Auto-set when status flips to Published. Override if needed."
            errors={errors.publishedAt}
          >
            <input
              id="publishedAt-input"
              name="publishedAt"
              type="datetime-local"
              defaultValue={toDateInputValue(defaultValues.publishedAt ?? null)}
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
              pathPrefix={`posts/${postId ?? "new"}`}
            />
          </div>
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
