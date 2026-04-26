"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { TagPicker } from "@/components/admin/TagPicker";
import type {
  CustomFieldType,
  InquiryField,
  MinistryInquiryConfig,
  SystemFieldKey,
} from "@/db/schema";
import {
  DEFAULT_SYSTEM_FIELDS,
  FORCED_SYSTEM_KEYS,
  newCustomFieldId,
} from "@/lib/inquiry-fields";
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
  photoBlobKey: string | null;
  contactEmail: string | null;
  isAcceptingNew: boolean;
  orderingPriority: number;
  status: "draft" | "published" | "archived";
  inquiryConfig: MinistryInquiryConfig | null;
};

const DEFAULT_BUTTONS: MinistryInquiryConfig["buttons"] = [
  { kind: "join", label: "Join this ministry", enabled: false },
  { kind: "inquire", label: "Inquire about this ministry", enabled: true },
  { kind: "volunteer", label: "Volunteer", enabled: false },
];

function normalizeConfig(c: MinistryInquiryConfig | null | undefined): MinistryInquiryConfig {
  const incoming = c?.buttons ?? [];
  const buttons = DEFAULT_BUTTONS.map((d) => {
    const match = incoming.find((b) => b.kind === d.kind);
    return match ?? d;
  });
  // Always show the editor with at least the four system defaults so
  // admins can edit them. If the saved config has fields, use them; if
  // not, preload the defaults.
  const fields =
    c?.fields && c.fields.length > 0 ? c.fields : DEFAULT_SYSTEM_FIELDS.map((f) => ({ ...f }));
  return {
    enabled: c?.enabled ?? true,
    buttons,
    fields,
  };
}

export function MinistryForm({
  mode,
  ministryId,
  defaultValues,
  staffOptions,
  photoPreviewUrl,
  audienceOptions,
}: {
  mode: "create" | "edit";
  ministryId?: string;
  defaultValues: Partial<Values>;
  staffOptions: { id: string; name: string }[];
  photoPreviewUrl?: string | null;
  audienceOptions: readonly string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [inquiryCfg, setInquiryCfg] = useState<MinistryInquiryConfig>(
    normalizeConfig(defaultValues.inquiryConfig ?? null),
  );

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

        <p className="rounded-md border border-dashed border-rule bg-cream/40 px-4 py-3 text-xs text-ink-3">
          Long-form content lives in <strong>Sections</strong> — open the
          ministry, then click <em>Sections</em> to add rich text, images,
          embeds, card grids, etc. The description field has been retired.
        </p>

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
            hint="Internal-only — public ministry pages don't display these. Manage the list at Settings → Taxonomies."
            errors={errors.audiences}
          >
            <TagPicker
              name="audiences"
              options={audienceOptions}
              defaultValue={defaultValues.audiences ?? []}
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

        <InquiryConfigEditor value={inquiryCfg} onChange={setInquiryCfg} />
        <input
          type="hidden"
          name="inquiryConfig"
          value={JSON.stringify(inquiryCfg)}
        />
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

        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Photo
          </h3>
          <div className="mt-3">
            <PhotoUploader
              name="photoBlobKey"
              initialKey={defaultValues.photoBlobKey ?? null}
              initialPreviewUrl={photoPreviewUrl}
              pathPrefix={`ministries/${ministryId ?? "new"}`}
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

function InquiryConfigEditor({
  value,
  onChange,
}: {
  value: MinistryInquiryConfig;
  onChange: (v: MinistryInquiryConfig) => void;
}) {
  const setEnabled = (enabled: boolean) => onChange({ ...value, enabled });
  const setButton = (
    kind: MinistryInquiryConfig["buttons"][number]["kind"],
    patch: Partial<MinistryInquiryConfig["buttons"][number]>,
  ) =>
    onChange({
      ...value,
      buttons: value.buttons.map((b) => (b.kind === kind ? { ...b, ...patch } : b)),
    });

  const fields = value.fields ?? [];
  const setFields = (next: InquiryField[]) => onChange({ ...value, fields: next });

  const addCustomField = (type: CustomFieldType) => {
    const id = newCustomFieldId();
    const fresh: InquiryField =
      type === "text" || type === "textarea"
        ? { kind: "custom", id, label: "", type, required: false }
        : { kind: "custom", id, label: "", type, options: [""], required: false };
    setFields([...fields, fresh]);
  };

  const updateAt = (idx: number, replacer: (f: InquiryField) => InquiryField) =>
    setFields(fields.map((f, i) => (i === idx ? replacer(f) : f)));

  const removeAt = (idx: number) => setFields(fields.filter((_, i) => i !== idx));

  const moveAt = (idx: number, dir: -1 | 1) => {
    const next = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[idx];
    const b = next[target];
    if (!a || !b) return;
    next[idx] = b;
    next[target] = a;
    setFields(next);
  };

  const customFieldCount = fields.filter((f) => f.kind === "custom").length;

  return (
    <div className="space-y-6 rounded-lg border border-rule bg-white p-5">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-serif text-lg font-bold text-navy">Inquiry buttons</h3>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4"
            />
            Form enabled
          </label>
        </div>
        <p className="mt-1 text-xs text-ink-3">
          Toggle which buttons appear on the public ministry page. Edit the label to
          match the ask (e.g. &ldquo;Sign up for Confirmation prep&rdquo;).
        </p>
        <ul className="mt-4 space-y-3">
          {value.buttons.map((b) => (
            <li key={b.kind} className="flex items-center gap-3">
              <label className="flex w-24 shrink-0 items-center gap-2 text-xs font-semibold text-ink-2">
                <input
                  type="checkbox"
                  checked={b.enabled}
                  onChange={(e) => setButton(b.kind, { enabled: e.target.checked })}
                  className="size-4"
                />
                <span className="capitalize">{b.kind}</span>
              </label>
              <input
                type="text"
                value={b.label}
                maxLength={80}
                disabled={!b.enabled}
                onChange={(e) => setButton(b.kind, { label: e.target.value })}
                className="form-input flex-1 disabled:bg-stone-50 disabled:text-ink-3"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-rule pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-serif text-lg font-bold text-navy">Form fields</h3>
          <span className="text-[11px] text-ink-3">
            {fields.length}/20 · {customFieldCount} custom
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-3">
          Default name + email always show (visitors need them to be reachable).
          Phone and message can be hidden. Add custom questions below — answers
          are snapshotted at submission so renaming later won&rsquo;t break old rows.
        </p>

        <ul className="mt-4 space-y-3">
          {fields.map((f, i) => (
            <li key={i}>
              {f.kind === "system" ? (
                <SystemFieldRow
                  field={f}
                  index={i}
                  total={fields.length}
                  onUpdate={(patch) =>
                    updateAt(i, (cur) =>
                      cur.kind === "system" ? { ...cur, ...patch } : cur,
                    )
                  }
                  onMove={(dir) => moveAt(i, dir)}
                />
              ) : (
                <CustomFieldRow
                  field={f}
                  index={i}
                  total={fields.length}
                  onUpdate={(patch) =>
                    updateAt(i, (cur) =>
                      cur.kind === "custom" ? { ...cur, ...patch } : cur,
                    )
                  }
                  onMove={(dir) => moveAt(i, dir)}
                  onRemove={() => removeAt(i)}
                />
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-rule pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Add field:
          </span>
          {(
            [
              ["text", "Single line"],
              ["textarea", "Multi-line"],
              ["select", "Dropdown"],
              ["radio", "Radio"],
              ["checkboxes", "Checkboxes"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => addCustomField(t)}
              disabled={fields.length >= 20}
              className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
            >
              + {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SystemFieldRow({
  field,
  index,
  total,
  onUpdate,
  onMove,
}: {
  field: Extract<InquiryField, { kind: "system" }>;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Extract<InquiryField, { kind: "system" }>>) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const locked = (FORCED_SYSTEM_KEYS as SystemFieldKey[]).includes(field.systemKey);
  const tagBg = locked
    ? "bg-rust-pale text-rust-dark"
    : "bg-navy-pale text-navy";
  return (
    <div className="rounded-md border border-rule bg-cream/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagBg}`}
        >
          {field.systemKey} {locked && "· required"}
        </span>
        <ReorderButtons index={index} total={total} onMove={onMove} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Label visitors see
          </label>
          <input
            type="text"
            value={field.label}
            maxLength={80}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="form-input"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.required}
              disabled={locked}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="size-4"
            />
            Required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.shown}
              disabled={locked}
              onChange={(e) => onUpdate({ shown: e.target.checked })}
              className="size-4"
            />
            Shown
          </label>
        </div>
      </div>
    </div>
  );
}

function CustomFieldRow({
  field,
  index,
  total,
  onUpdate,
  onMove,
  onRemove,
}: {
  field: Extract<InquiryField, { kind: "custom" }>;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Extract<InquiryField, { kind: "custom" }>>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const needsOptions =
    field.type === "select" || field.type === "radio" || field.type === "checkboxes";
  const options = field.options ?? [];

  const setOptions = (next: string[]) => onUpdate({ options: next });
  const addOption = () => setOptions([...options, ""]);
  const updateOption = (i: number, v: string) =>
    setOptions(options.map((o, idx) => (idx === i ? v : o)));
  const removeOption = (i: number) =>
    setOptions(options.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-md border border-rule bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
          custom · {prettyType(field.type)}
        </span>
        <ReorderButtons index={index} total={total} onMove={onMove} />
        <button
          type="button"
          onClick={onRemove}
          title="Remove field"
          className="ml-auto rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
        >
          ✕ Remove
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px] sm:items-end">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Question
          </label>
          <input
            type="text"
            value={field.label}
            maxLength={80}
            placeholder='e.g. "What grade is your child in?"'
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="form-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Type
          </label>
          <select
            value={field.type}
            onChange={(e) => {
              const t = e.target.value as CustomFieldType;
              const willNeedOpts = t === "select" || t === "radio" || t === "checkboxes";
              onUpdate({
                type: t,
                options: willNeedOpts ? (options.length > 0 ? options : [""]) : undefined,
              });
            }}
            className="form-input"
          >
            <option value="text">Single line</option>
            <option value="textarea">Multi-line</option>
            <option value="select">Dropdown</option>
            <option value="radio">Radio</option>
            <option value="checkboxes">Checkboxes</option>
          </select>
        </div>
      </div>

      {needsOptions && (
        <div className="mt-3 rounded-md border border-dashed border-rule bg-cream/40 p-2.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Options
          </p>
          <ul className="space-y-1.5">
            {options.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={o}
                  maxLength={80}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="form-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 1}
                  title="Remove option"
                  className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust disabled:opacity-30"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 20}
            className="mt-2 rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
          >
            + Add option
          </button>
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="size-4"
        />
        Required
      </label>
    </div>
  );
}

function ReorderButtons({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        title="Move up"
        className="rounded-md border border-rule bg-white px-2 py-0.5 text-xs hover:border-navy disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        title="Move down"
        className="rounded-md border border-rule bg-white px-2 py-0.5 text-xs hover:border-navy disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  );
}

function prettyType(t: CustomFieldType): string {
  switch (t) {
    case "text":
      return "Single line";
    case "textarea":
      return "Multi-line";
    case "select":
      return "Dropdown";
    case "radio":
      return "Radio";
    case "checkboxes":
      return "Checkboxes";
  }
}
