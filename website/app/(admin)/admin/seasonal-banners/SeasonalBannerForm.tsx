"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { createBannerAction, updateBannerAction } from "./_actions";

type Values = {
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  photoBlobKey: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  isActive: boolean;
};

function toLocal(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SeasonalBannerForm({
  mode,
  bannerId,
  defaultValues,
  photoPreviewUrl,
}: {
  mode: "create" | "edit";
  bannerId?: string;
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
          ? await createBannerAction(formData)
          : await updateBannerAction(bannerId!, formData);
      if (result.ok) {
        router.push(`/admin/seasonal-banners/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
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
        <AdminField name="subtitle" label="Subtitle" errors={errors.subtitle}>
          <input
            id="subtitle-input"
            name="subtitle"
            type="text"
            defaultValue={defaultValues.subtitle ?? ""}
            maxLength={500}
            className="form-input"
          />
        </AdminField>

        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField name="ctaLabel" label="Button label" errors={errors.ctaLabel}>
            <input
              id="ctaLabel-input"
              name="ctaLabel"
              type="text"
              defaultValue={defaultValues.ctaLabel ?? ""}
              placeholder='"Learn more", "Register"'
              maxLength={80}
              className="form-input"
            />
          </AdminField>
          <AdminField
            name="ctaUrl"
            label="Button URL"
            hint="Leave blank if no link."
            errors={errors.ctaUrl}
          >
            <input
              id="ctaUrl-input"
              name="ctaUrl"
              type="url"
              defaultValue={defaultValues.ctaUrl ?? ""}
              placeholder="https://"
              className="form-input"
            />
          </AdminField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField name="startsAt" label="Starts" required errors={errors.startsAt}>
            <input
              id="startsAt-input"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocal(defaultValues.startsAt)}
              required
              className="form-input"
            />
          </AdminField>
          <AdminField name="endsAt" label="Ends" required errors={errors.endsAt}>
            <input
              id="endsAt-input"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocal(defaultValues.endsAt)}
              required
              className="form-input"
            />
          </AdminField>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Visibility
          </h3>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaultValues.isActive ?? true}
              className="size-4"
            />
            Active
          </label>
          <p className="mt-2 text-xs text-ink-3">
            Banner only renders on the homepage if active <em>and</em> within
            its date window.
          </p>
        </div>

        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Photo
          </h3>
          <div className="mt-3">
            <PhotoUploader
              name="photoBlobKey"
              initialKey={defaultValues.photoBlobKey ?? null}
              initialPreviewUrl={photoPreviewUrl}
              pathPrefix={`seasonal-banners/${bannerId ?? "new"}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
      </aside>
    </form>
  );
}
