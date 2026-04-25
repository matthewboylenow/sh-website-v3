"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import {
  createStaffAction,
  updateStaffAction,
} from "./_actions";

type StaffFormValues = {
  slug: string;
  name: string;
  role: string;
  bio: string | null;
  email: string | null;
  photoBlobKey: string | null;
  orderingPriority: number;
  isActive: boolean;
};

export function StaffForm({
  mode,
  staffId,
  defaultValues,
  photoPreviewUrl,
}: {
  mode: "create" | "edit";
  staffId?: string;
  defaultValues: Partial<StaffFormValues>;
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
          ? await createStaffAction(formData)
          : await updateStaffAction(staffId!, formData);
      if (result.ok) {
        router.push(`/admin/staff/${result.id}?saved=1`);
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
        <AdminField name="name" label="Name" required errors={errors.name}>
          <input
            id="staff-name"
            name="name"
            type="text"
            defaultValue={defaultValues.name ?? ""}
            required
            maxLength={200}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="role"
          label="Role / title"
          required
          hint='e.g. "Pastor", "Director of Music & Liturgy"'
          errors={errors.role}
        >
          <input
            id="staff-role"
            name="role"
            type="text"
            defaultValue={defaultValues.role ?? ""}
            required
            maxLength={120}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="slug"
          label="Slug"
          required
          hint="Lowercase letters, numbers, hyphens. Used in /staff/{slug} links."
          errors={errors.slug}
        >
          <input
            id="staff-slug"
            name="slug"
            type="text"
            defaultValue={defaultValues.slug ?? ""}
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            className="form-input font-mono text-sm"
          />
        </AdminField>

        <AdminField name="email" label="Email" errors={errors.email}>
          <input
            id="staff-email"
            name="email"
            type="email"
            defaultValue={defaultValues.email ?? ""}
            placeholder="optional"
            className="form-input"
          />
        </AdminField>

        <AdminField name="bio" label="Bio (markdown)" errors={errors.bio}>
          <textarea
            id="staff-bio"
            name="bio"
            defaultValue={defaultValues.bio ?? ""}
            rows={8}
            className="form-input"
          />
        </AdminField>
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
            Active (shown on /staff)
          </label>
          <AdminField
            name="orderingPriority"
            label="Order priority"
            hint="Lower values sort first."
            errors={errors.orderingPriority}
            className="mt-4"
          >
            <input
              id="staff-orderingPriority"
              name="orderingPriority"
              type="number"
              min={0}
              max={9999}
              defaultValue={defaultValues.orderingPriority ?? 0}
              className="form-input"
            />
          </AdminField>
        </div>

        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Headshot
          </h3>
          <div className="mt-3">
            <PhotoUploader
              name="photoBlobKey"
              initialKey={defaultValues.photoBlobKey ?? null}
              initialPreviewUrl={photoPreviewUrl}
              pathPrefix={`staff/${staffId ?? "new"}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
      </aside>
    </form>
  );
}
