"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { MASS_KINDS, OVERRIDE_KINDS } from "@/lib/validators/mass-times";
import {
  createMassTimeAction,
  updateMassTimeAction,
} from "./_actions";

const DOW = [
  { v: 0, label: "Sunday" },
  { v: 1, label: "Monday" },
  { v: 2, label: "Tuesday" },
  { v: 3, label: "Wednesday" },
  { v: 4, label: "Thursday" },
  { v: 5, label: "Friday" },
  { v: 6, label: "Saturday" },
] as const;

type Values = {
  dayOfWeek: number | null;
  time: string; // "HH:MM" or "HH:MM:SS"
  kind: (typeof MASS_KINDS)[number];
  label: string | null;
  presiderId: string | null;
  liveStreamUrl: string | null;
  overrideDate: string | null;
  overrideKind: (typeof OVERRIDE_KINDS)[number] | null;
  notes: string | null;
  isActive: boolean;
};

function timeForInput(v: string | null | undefined): string {
  if (!v) return "";
  // DB returns "HH:MM:SS" — input[type=time] accepts that, but slice anyway.
  return v.length >= 5 ? v.slice(0, 5) : v;
}

export function MassTimeForm({
  mode,
  rowId,
  defaultValues,
  staffOptions,
}: {
  mode: "create" | "edit";
  rowId?: string;
  defaultValues: Partial<Values>;
  staffOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [rowType, setRowType] = useState<"weekly" | "override">(
    defaultValues.overrideDate ? "override" : "weekly",
  );

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const result =
        mode === "create"
          ? await createMassTimeAction(formData)
          : await updateMassTimeAction(rowId!, formData);
      if (result.ok) {
        router.push(`/admin/mass-times/${result.id}?saved=1`);
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
        <fieldset className="rounded-lg border border-rule bg-white p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
            Row type
          </legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rowType"
                value="weekly"
                checked={rowType === "weekly"}
                onChange={() => setRowType("weekly")}
              />
              Weekly recurring
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rowType"
                value="override"
                checked={rowType === "override"}
                onChange={() => setRowType("override")}
              />
              One-off override
            </label>
          </div>
        </fieldset>

        {rowType === "weekly" ? (
          <AdminField
            name="dayOfWeek"
            label="Day of week"
            required
            errors={errors.dayOfWeek}
          >
            <select
              id="dayOfWeek-input"
              name="dayOfWeek"
              defaultValue={defaultValues.dayOfWeek ?? 0}
              className="form-input"
            >
              {DOW.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.label}
                </option>
              ))}
            </select>
          </AdminField>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminField
              name="overrideDate"
              label="Date"
              required
              errors={errors.overrideDate}
            >
              <input
                id="overrideDate-input"
                name="overrideDate"
                type="date"
                defaultValue={defaultValues.overrideDate ?? ""}
                className="form-input"
              />
            </AdminField>
            <AdminField
              name="overrideKind"
              label="Override kind"
              required
              errors={errors.overrideKind}
            >
              <select
                id="overrideKind-input"
                name="overrideKind"
                defaultValue={defaultValues.overrideKind ?? ""}
                className="form-input"
              >
                <option value="">— Select —</option>
                {OVERRIDE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField name="time" label="Time" required errors={errors.time}>
            <input
              id="time-input"
              name="time"
              type="time"
              required
              defaultValue={timeForInput(defaultValues.time)}
              className="form-input"
            />
          </AdminField>
          <AdminField name="kind" label="Kind" required errors={errors.kind}>
            <select
              id="kind-input"
              name="kind"
              defaultValue={defaultValues.kind ?? "sunday"}
              className="form-input"
            >
              {MASS_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === "vigil"
                    ? "Vigil"
                    : k === "sunday"
                      ? "Sunday"
                      : k === "daily"
                        ? "Daily"
                        : "Holy Day"}
                </option>
              ))}
            </select>
          </AdminField>
        </div>

        <AdminField
          name="label"
          label="Label"
          hint='Optional — e.g. "Family Mass", "Youth-led".'
          errors={errors.label}
        >
          <input
            id="label-input"
            name="label"
            type="text"
            defaultValue={defaultValues.label ?? ""}
            maxLength={120}
            className="form-input"
          />
        </AdminField>

        <AdminField name="presiderId" label="Presider" errors={errors.presiderId}>
          <select
            id="presiderId-input"
            name="presiderId"
            defaultValue={defaultValues.presiderId ?? ""}
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
          name="liveStreamUrl"
          label="Livestream URL"
          hint="Subsplash player URL when livestreamed; leave blank otherwise."
          errors={errors.liveStreamUrl}
        >
          <input
            id="liveStreamUrl-input"
            name="liveStreamUrl"
            type="url"
            defaultValue={defaultValues.liveStreamUrl ?? ""}
            placeholder="https://"
            className="form-input"
          />
        </AdminField>

        <AdminField name="notes" label="Notes" errors={errors.notes}>
          <textarea
            id="notes-input"
            name="notes"
            defaultValue={defaultValues.notes ?? ""}
            rows={3}
            maxLength={500}
            className="form-input"
          />
        </AdminField>
      </div>

      <aside className="space-y-6">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Active
          </h3>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaultValues.isActive ?? true}
              className="size-4"
            />
            Visible on /mass
          </label>
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
