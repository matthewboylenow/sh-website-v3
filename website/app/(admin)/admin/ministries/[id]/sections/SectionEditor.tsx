"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type {
  ButtonItem,
  CardGridCard,
  EmbedPayload,
  LinkItem,
  PageLeafBlock,
  PageSectionPayload,
  SectionHeader,
} from "@/db/schema";
import type { SaveSectionsResult } from "@/lib/server/page-sections-actions";
import type { MinistrySectionsManifestInput } from "@/lib/validators/page-sections";
import { PreviewBlock } from "./PreviewBlock";
import { SectionImagePicker } from "./SectionImagePicker";
import { IconPickerButton } from "@/components/admin/IconPicker";

/**
 * Single-state controlled editor over the page-sections array.
 * Save sends the full ordered array via Server Action with replace-set
 * semantics. Image previews come from a server-resolved Map; new uploads
 * inject themselves into the local map so the in-flight section renders
 * its picture without a refresh round-trip.
 */

type Row = { clientId: string; payload: PageSectionPayload };

type StaffOption = { id: string; name: string; role: string | null };

let __id = 0;
const newClientId = () => `${Date.now()}-${++__id}`;

export function SectionEditor({
  pathPrefix,
  onSave,
  initial,
  initialImageUrls,
  staffOptions,
  ministryOptions = [],
  eventCategoryOptions = [],
}: {
  /** Where new image uploads go in Vercel Blob, also used for inline-image
   *  paths in the rich text editor. e.g. "ministries/<id>/sections". */
  pathPrefix: string;
  onSave: (manifest: MinistrySectionsManifestInput) => Promise<SaveSectionsResult>;
  initial: { id: string; payload: PageSectionPayload }[];
  /** blobKey → URL, server-resolved on first render. */
  initialImageUrls: Record<string, string>;
  staffOptions: StaffOption[];
  /** All ministries — used by the featured_ministries manual picker. */
  ministryOptions?: { id: string; name: string }[];
  /** Taxonomy values — used by the featured_events category picker. */
  eventCategoryOptions?: readonly string[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initial.map((s) => ({ clientId: s.id, payload: s.payload })),
  );
  const [imgUrls, setImgUrls] = useState<Record<string, string>>(initialImageUrls);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  /** Per-row preview toggle, keyed by clientId. */
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});
  /** Master toggle — flips every row to preview, but per-row state still
   *  wins after a manual toggle (user intent). */
  const [previewAll, setPreviewAll] = useState(false);
  const togglePreview = (clientId: string) =>
    setPreviewing((cur) => ({ ...cur, [clientId]: !cur[clientId] }));

  const updateAt = (i: number, replacer: (p: PageSectionPayload) => PageSectionPayload) =>
    setRows((cur) =>
      cur.map((r, idx) => (idx === i ? { ...r, payload: replacer(r.payload) } : r)),
    );
  const removeAt = (i: number) => setRows((cur) => cur.filter((_, idx) => idx !== i));
  const moveAt = (i: number, dir: -1 | 1) => {
    setRows((cur) => {
      const next = [...cur];
      const t = i + dir;
      if (t < 0 || t >= next.length) return cur;
      const a = next[i];
      const b = next[t];
      if (!a || !b) return cur;
      next[i] = b;
      next[t] = a;
      return next;
    });
  };
  const addRow = (payload: PageSectionPayload) =>
    setRows((cur) => [...cur, { clientId: newClientId(), payload }]);

  const registerImage = (key: string, url: string) =>
    setImgUrls((cur) => ({ ...cur, [key]: url }));

  const handleSave = () => {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await onSave({
        sections: rows.map((r) => ({ clientId: r.clientId, payload: r.payload })),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3 rounded-md border border-rule bg-white px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          View
        </span>
        <button
          type="button"
          onClick={() => setPreviewAll(false)}
          className={
            "rounded-pill px-3 py-1 text-xs font-semibold " +
            (!previewAll
              ? "bg-navy text-white"
              : "border border-rule bg-white text-navy hover:border-navy")
          }
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setPreviewAll(true)}
          className={
            "rounded-pill px-3 py-1 text-xs font-semibold " +
            (previewAll
              ? "bg-navy text-white"
              : "border border-rule bg-white text-navy hover:border-navy")
          }
        >
          Preview all
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-cream/40 px-6 py-12 text-center text-sm text-ink-3">
          No sections yet. Add one below to start building the page.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.clientId}>
              <BlockRow
                payload={r.payload}
                index={i}
                total={rows.length}
                onUpdate={(replacer) => updateAt(i, replacer)}
                onMove={(dir) => moveAt(i, dir)}
                onRemove={() => removeAt(i)}
                pathPrefix={pathPrefix}
                imgUrls={imgUrls}
                registerImage={registerImage}
                staffOptions={staffOptions}
                ministryOptions={ministryOptions}
                eventCategoryOptions={eventCategoryOptions}
                previewing={previewAll || !!previewing[r.clientId]}
                onTogglePreview={() => togglePreview(r.clientId)}
              />
            </li>
          ))}
        </ul>
      )}

      <AddBlockMenu onAdd={addRow} />

      <div className="sticky bottom-0 -mx-4 border-t border-rule bg-white/95 p-4 backdrop-blur sm:-mx-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-pill bg-rust px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save sections"}
          </button>
          {error && <span className="text-sm font-semibold text-rust-dark">{error}</span>}
          {saved && !error && (
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Saved.
            </span>
          )}
          <span className="ml-auto text-xs text-ink-3">{rows.length}/40 sections</span>
        </div>
      </div>
    </div>
  );
}

function BlockRow({
  payload,
  index,
  total,
  onUpdate,
  onMove,
  onRemove,
  pathPrefix,
  imgUrls,
  registerImage,
  staffOptions,
  ministryOptions,
  eventCategoryOptions,
  previewing,
  onTogglePreview,
}: {
  payload: PageSectionPayload;
  index: number;
  total: number;
  onUpdate: (replacer: (p: PageSectionPayload) => PageSectionPayload) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  pathPrefix: string;
  imgUrls: Record<string, string>;
  registerImage: (key: string, url: string) => void;
  staffOptions: StaffOption[];
  ministryOptions: { id: string; name: string }[];
  eventCategoryOptions: readonly string[];
  previewing: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-navy-pale px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy">
          {prettyKind(payload.kind)}
        </span>
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
        <button
          type="button"
          onClick={onTogglePreview}
          className={
            "ml-auto rounded-md border px-2 py-0.5 text-[10px] font-semibold " +
            (previewing
              ? "border-navy bg-navy text-white"
              : "border-rule bg-white text-navy hover:border-navy")
          }
          title="Toggle Edit / Preview"
        >
          {previewing ? "Edit" : "Preview"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
        >
          ✕ Remove
        </button>
      </div>

      {previewing ? (
        <PreviewBlock
          payload={payload}
          imgUrls={imgUrls}
          staffOptions={staffOptions}
        />
      ) : (
        <BlockEditor
          payload={payload}
          onUpdate={onUpdate}
          pathPrefix={pathPrefix}
          imgUrls={imgUrls}
          registerImage={registerImage}
          staffOptions={staffOptions}
          ministryOptions={ministryOptions}
          eventCategoryOptions={eventCategoryOptions}
        />
      )}
    </div>
  );
}

function HeaderEditor({
  header,
  onUpdate,
  required = false,
}: {
  header: SectionHeader | undefined;
  onUpdate: (next: SectionHeader) => void;
  required?: boolean;
}) {
  const h = header ?? {};
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_2fr]">
        <input
          type="text"
          value={h.eyebrow ?? ""}
          maxLength={60}
          placeholder='Eyebrow — e.g. "Welcome"'
          onChange={(e) => onUpdate({ ...h, eyebrow: e.target.value })}
          className="form-input"
        />
        <input
          type="text"
          value={h.heading ?? ""}
          maxLength={120}
          placeholder={required ? "Heading (required)" : "Heading (optional)"}
          onChange={(e) => onUpdate({ ...h, heading: e.target.value })}
          className="form-input"
        />
        <input
          type="text"
          value={h.subheading ?? ""}
          maxLength={200}
          placeholder="Lede / subheading (optional)"
          onChange={(e) => onUpdate({ ...h, subheading: e.target.value })}
          className="form-input"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <select
          value={h.align ?? "left"}
          onChange={(e) =>
            onUpdate({ ...h, align: e.target.value as "left" | "center" })
          }
          className="form-input"
        >
          <option value="left">Align: left</option>
          <option value="center">Align: center</option>
        </select>
        <input
          type="text"
          value={h.anchorId ?? ""}
          maxLength={60}
          placeholder="anchor-id (optional)"
          pattern="[a-z0-9-]*"
          onChange={(e) => onUpdate({ ...h, anchorId: e.target.value })}
          className="form-input font-mono text-xs"
        />
      </div>
    </div>
  );
}

function BlockEditor({
  payload,
  onUpdate,
  pathPrefix,
  imgUrls,
  registerImage,
  staffOptions,
  ministryOptions,
  eventCategoryOptions,
}: {
  payload: PageSectionPayload;
  onUpdate: (replacer: (p: PageSectionPayload) => PageSectionPayload) => void;
  pathPrefix: string;
  imgUrls: Record<string, string>;
  registerImage: (key: string, url: string) => void;
  staffOptions: StaffOption[];
  ministryOptions: { id: string; name: string }[];
  eventCategoryOptions: readonly string[];
}) {
  const path = pathPrefix;

  switch (payload.kind) {
    case "heading":
      return (
        <div className="space-y-2">
          <HeaderEditor
            header={payload.header}
            required
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <select
            value={payload.level ?? 2}
            onChange={(e) =>
              onUpdate(() => ({ ...payload, level: Number(e.target.value) === 3 ? 3 : 2 }))
            }
            className="form-input w-32"
          >
            <option value={2}>H2 (large)</option>
            <option value={3}>H3 (small)</option>
          </select>
        </div>
      );

    case "rich_text":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <RichTextEditor
            initialHtml={payload.html}
            pathPrefix={`${path}/rich`}
            placeholder="Body…"
            onChange={(html) => onUpdate(() => ({ ...payload, html }))}
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <SectionImagePicker
            value={payload.blobKey}
            previewUrl={payload.blobKey ? imgUrls[payload.blobKey] : undefined}
            pathPrefix={path}
            label="Image"
            onChange={(next) => {
              if (next) {
                registerImage(next.key, next.url);
                onUpdate(() => ({ ...payload, blobKey: next.key }));
              } else {
                onUpdate(() => ({ ...payload, blobKey: "" }));
              }
            }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={payload.alt ?? ""}
              maxLength={200}
              placeholder="Alt text"
              onChange={(e) => onUpdate(() => ({ ...payload, alt: e.target.value }))}
              className="form-input"
            />
            <input
              type="text"
              value={payload.caption ?? ""}
              maxLength={300}
              placeholder="Caption (optional)"
              onChange={(e) => onUpdate(() => ({ ...payload, caption: e.target.value }))}
              className="form-input"
            />
          </div>
          <input
            type="text"
            value={payload.href ?? ""}
            maxLength={1000}
            placeholder="Click-through URL (optional)"
            onChange={(e) => onUpdate(() => ({ ...payload, href: e.target.value }))}
            className="form-input font-mono text-sm"
          />
        </div>
      );

    case "image_text":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <SectionImagePicker
              value={payload.blobKey}
              previewUrl={payload.blobKey ? imgUrls[payload.blobKey] : undefined}
              pathPrefix={path}
              onChange={(next) => {
                if (next) {
                  registerImage(next.key, next.url);
                  onUpdate(() => ({ ...payload, blobKey: next.key }));
                } else {
                  onUpdate(() => ({ ...payload, blobKey: "" }));
                }
              }}
            />
            <RichTextEditor
              initialHtml={payload.html}
              pathPrefix={`${path}/rich`}
              placeholder="Body…"
              onChange={(html) => onUpdate(() => ({ ...payload, html }))}
            />
          </div>
          <select
            value={payload.imageSide ?? "left"}
            onChange={(e) =>
              onUpdate(() => ({
                ...payload,
                imageSide: e.target.value === "right" ? "right" : "left",
              }))
            }
            className="form-input w-44"
          >
            <option value="left">Image on left</option>
            <option value="right">Image on right</option>
          </select>
        </div>
      );

    case "image_gallery": {
      const images = payload.images;
      const updateImg = (i: number, patch: Partial<typeof images[number]>) =>
        onUpdate(() => ({
          ...payload,
          images: images.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
        }));
      const removeImg = (i: number) =>
        onUpdate(() => ({ ...payload, images: images.filter((_, idx) => idx !== i) }));
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <select
            value={payload.columns ?? 3}
            onChange={(e) =>
              onUpdate(() => ({ ...payload, columns: Number(e.target.value) === 2 ? 2 : 3 }))
            }
            className="form-input w-32"
          >
            <option value={2}>2 columns</option>
            <option value={3}>3 columns</option>
          </select>
          <ul className="space-y-2">
            {images.map((img, i) => (
              <li key={i} className="grid items-start gap-2 rounded-md border border-rule bg-cream/40 p-2 sm:grid-cols-[140px_1fr_auto]">
                <SectionImagePicker
                  value={img.blobKey}
                  previewUrl={img.blobKey ? imgUrls[img.blobKey] : undefined}
                  pathPrefix={path}
                  onChange={(next) => {
                    if (next) {
                      registerImage(next.key, next.url);
                      updateImg(i, { blobKey: next.key });
                    } else {
                      removeImg(i);
                    }
                  }}
                />
                <div className="space-y-2">
                  <input
                    type="text"
                    value={img.alt ?? ""}
                    maxLength={200}
                    placeholder="Alt text"
                    onChange={(e) => updateImg(i, { alt: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={img.caption ?? ""}
                    maxLength={300}
                    placeholder="Caption (optional)"
                    onChange={(e) => updateImg(i, { caption: e.target.value })}
                    className="form-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImg(i)}
                  className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              onUpdate(() => ({ ...payload, images: [...images, { blobKey: "" }] }))
            }
            disabled={images.length >= 20}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
          >
            + Add image
          </button>
        </div>
      );
    }

    case "link_list":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <LinkListEditor
            items={payload.items}
            onUpdate={(items) => onUpdate(() => ({ ...payload, items }))}
          />
        </div>
      );

    case "button_group":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <ButtonGroupEditor
            items={payload.items}
            onUpdate={(items) => onUpdate(() => ({ ...payload, items }))}
          />
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <input
            type="url"
            value={payload.url}
            maxLength={1000}
            placeholder="https://example.com/video.mp4 or https://example.com/playlist.m3u8"
            onChange={(e) => {
              const url = e.target.value;
              const type = detectVideoType(url);
              onUpdate(() => ({ ...payload, url, type }));
            }}
            className="form-input font-mono text-sm"
          />
          <p className="text-xs text-ink-3">
            Detected: <strong>{payload.type}</strong>. For YouTube/Vimeo use the Embed block instead.
          </p>
          <SectionImagePicker
            value={payload.posterBlobKey ?? null}
            previewUrl={
              payload.posterBlobKey ? imgUrls[payload.posterBlobKey] : undefined
            }
            pathPrefix={`${path}/posters`}
            label="Poster image (optional)"
            onChange={(next) => {
              if (next) {
                registerImage(next.key, next.url);
                onUpdate(() => ({ ...payload, posterBlobKey: next.key }));
              } else {
                onUpdate(() => ({ ...payload, posterBlobKey: null }));
              }
            }}
          />
          <input
            type="text"
            value={payload.caption ?? ""}
            maxLength={300}
            placeholder="Caption (optional)"
            onChange={(e) => onUpdate(() => ({ ...payload, caption: e.target.value }))}
            className="form-input"
          />
        </div>
      );

    case "embed":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <EmbedEditor
            embed={payload.embed}
            onUpdate={(e) => onUpdate(() => ({ ...payload, embed: e }))}
          />
        </div>
      );

    case "card_grid": {
      const updateCard = (i: number, patch: Partial<CardGridCard>) =>
        onUpdate(() => ({
          ...payload,
          cards: payload.cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
        }));
      const removeCard = (i: number) =>
        onUpdate(() => ({ ...payload, cards: payload.cards.filter((_, idx) => idx !== i) }));
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Layout
              </label>
              <select
                value={payload.layout ?? "uniform"}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    layout: e.target.value as "uniform" | "bento",
                  }))
                }
                className="form-input"
              >
                <option value="uniform">Uniform grid</option>
                <option value="bento">Bento (2 large + tiles)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Card style
              </label>
              <select
                value={payload.cardStyle ?? "stacked"}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    cardStyle: e.target.value as "stacked" | "overlay",
                  }))
                }
                className="form-input"
              >
                <option value="stacked">Stacked (image, then text)</option>
                <option value="overlay">Overlay (text on image)</option>
              </select>
              <p className="mt-1 text-[11px] text-ink-3">
                Overlay applies to large cards only; bento tiles stay stacked.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Columns (uniform layout)
              </label>
              <select
                value={payload.columns ?? 3}
                disabled={payload.layout === "bento"}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    columns: Number(e.target.value) === 2 ? 2 : 3,
                  }))
                }
                className="form-input"
              >
                <option value={2}>2 columns</option>
                <option value={3}>3 columns</option>
              </select>
            </div>
          </div>
          <ul className="space-y-2">
            {payload.cards.map((c, i) => {
              // Show picker on every card so admins can switch layouts later.
              // The renderer only displays icons on bento tiles (i ≥ 2).
              const showIconPicker = true;
              const iconWillRender = payload.layout === "bento" && i >= 2;
              return (
              <li key={i} className="space-y-2 rounded-md border border-rule bg-cream/40 p-3">
                <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-start">
                  <div className="space-y-3">
                    <SectionImagePicker
                      value={c.imageBlobKey ?? null}
                      previewUrl={c.imageBlobKey ? imgUrls[c.imageBlobKey] : undefined}
                      pathPrefix={path}
                      onChange={(next) => {
                        if (next) {
                          registerImage(next.key, next.url);
                          updateCard(i, { imageBlobKey: next.key });
                        } else {
                          updateCard(i, { imageBlobKey: null });
                        }
                      }}
                    />
                    {showIconPicker && (
                      <div className="space-y-1">
                        <IconPickerButton
                          value={c.iconName ?? null}
                          onChange={(name) => updateCard(i, { iconName: name })}
                        />
                        {!iconWillRender && c.iconName && (
                          <p className="text-[11px] text-rust-dark">
                            Icon only renders on bento tiles (cards 3+ in bento layout).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={c.title}
                      maxLength={120}
                      placeholder="Card title"
                      onChange={(e) => updateCard(i, { title: e.target.value })}
                      className="form-input"
                    />
                    <input
                      type="text"
                      value={c.summary ?? ""}
                      maxLength={500}
                      placeholder="Summary (optional)"
                      onChange={(e) => updateCard(i, { summary: e.target.value })}
                      className="form-input"
                    />
                    <input
                      type="text"
                      value={c.href ?? ""}
                      maxLength={1000}
                      placeholder="Link (optional)"
                      onChange={(e) => updateCard(i, { href: e.target.value })}
                      className="form-input font-mono text-sm"
                    />
                    <input
                      type="text"
                      value={c.ctaLabel ?? ""}
                      maxLength={40}
                      placeholder='CTA label (optional) — e.g. "Learn more"'
                      onChange={(e) => updateCard(i, { ctaLabel: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCard(i)}
                    className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
                  >
                    ✕
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() =>
              onUpdate(() => ({ ...payload, cards: [...payload.cards, { title: "" }] }))
            }
            disabled={payload.cards.length >= 12}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
          >
            + Add card
          </button>
        </div>
      );
    }

    case "staff_card":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <select
            value={payload.staffId}
            onChange={(e) => onUpdate(() => ({ ...payload, staffId: e.target.value }))}
            className="form-input"
          >
            <option value="">— Pick a staff member —</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.role ? ` · ${s.role}` : ""}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={!!payload.hideContact}
              onChange={(e) =>
                onUpdate(() => ({ ...payload, hideContact: e.target.checked }))
              }
              className="size-4"
            />
            Hide email / contact
          </label>
        </div>
      );

    case "callout_banner":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
            <SectionImagePicker
              value={payload.imageBlobKey ?? null}
              previewUrl={payload.imageBlobKey ? imgUrls[payload.imageBlobKey] : undefined}
              pathPrefix={path}
              onChange={(next) => {
                if (next) {
                  registerImage(next.key, next.url);
                  onUpdate(() => ({ ...payload, imageBlobKey: next.key }));
                } else {
                  onUpdate(() => ({ ...payload, imageBlobKey: null }));
                }
              }}
            />
            <div className="space-y-2">
              <input
                type="text"
                value={payload.tag ?? ""}
                maxLength={40}
                placeholder="Tag (e.g. April · Awareness Month)"
                onChange={(e) => onUpdate(() => ({ ...payload, tag: e.target.value }))}
                className="form-input"
              />
              <input
                type="text"
                value={payload.title}
                maxLength={120}
                placeholder="Title"
                onChange={(e) => onUpdate(() => ({ ...payload, title: e.target.value }))}
                className="form-input"
              />
              <textarea
                value={payload.body ?? ""}
                maxLength={500}
                rows={3}
                placeholder="Body (optional)"
                onChange={(e) => onUpdate(() => ({ ...payload, body: e.target.value }))}
                className="form-input"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={payload.ctaLabel ?? ""}
                  maxLength={40}
                  placeholder="CTA label"
                  onChange={(e) =>
                    onUpdate(() => ({ ...payload, ctaLabel: e.target.value }))
                  }
                  className="form-input"
                />
                <input
                  type="text"
                  value={payload.ctaHref ?? ""}
                  maxLength={1000}
                  placeholder="CTA URL"
                  onChange={(e) =>
                    onUpdate(() => ({ ...payload, ctaHref: e.target.value }))
                  }
                  className="form-input font-mono text-sm"
                />
              </div>
              <select
                value={payload.tone ?? "navy"}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    tone: e.target.value as "navy" | "warm" | "gold",
                  }))
                }
                className="form-input w-32"
              >
                <option value="navy">Navy</option>
                <option value="warm">Warm</option>
                <option value="gold">Gold</option>
              </select>
            </div>
          </div>
        </div>
      );

    case "featured_ministries": {
      const selectedIds = payload.ministryIds ?? [];
      const toggle = (id: string) =>
        onUpdate(() => ({
          ...payload,
          ministryIds: selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id],
        }));
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Pick mode
              </label>
              <select
                value={payload.mode}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    mode: e.target.value as "spotlight" | "random" | "manual",
                  }))
                }
                className="form-input"
              >
                <option value="spotlight">Spotlight (by priority)</option>
                <option value="random">Random</option>
                <option value="manual">Manual pick</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Count
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={payload.count}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    count: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                  }))
                }
                className="form-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Tone
              </label>
              <select
                value={payload.tone ?? "default"}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    tone: e.target.value as "default" | "navy",
                  }))
                }
                className="form-input"
              >
                <option value="default">Default (cream/white bg)</option>
                <option value="navy">On navy</option>
              </select>
            </div>
          </div>

          {payload.mode === "manual" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Pick ministries
              </label>
              {ministryOptions.length === 0 ? (
                <p className="text-xs text-ink-3">
                  No ministries published yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ministryOptions.map((m) => {
                    const on = selectedIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggle(m.id)}
                        className={
                          "rounded-pill px-3 py-1 text-xs font-semibold transition-colors " +
                          (on
                            ? "bg-navy text-white"
                            : "border border-rule bg-white text-navy hover:border-navy")
                        }
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <input
              type="text"
              value={payload.ctaLabel ?? ""}
              maxLength={40}
              placeholder="CTA label (optional)"
              onChange={(e) =>
                onUpdate(() => ({ ...payload, ctaLabel: e.target.value }))
              }
              className="form-input"
            />
            <input
              type="text"
              value={payload.ctaHref ?? ""}
              maxLength={1000}
              placeholder="CTA URL (optional)"
              onChange={(e) =>
                onUpdate(() => ({ ...payload, ctaHref: e.target.value }))
              }
              className="form-input font-mono text-sm"
            />
          </div>
        </div>
      );
    }

    case "featured_events":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Count
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={payload.count}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    count: Math.max(1, Math.min(12, Number(e.target.value) || 1)),
                  }))
                }
                className="form-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Filter by category (optional)
              </label>
              <select
                value={payload.category ?? ""}
                onChange={(e) =>
                  onUpdate(() => ({
                    ...payload,
                    category: e.target.value || undefined,
                  }))
                }
                className="form-input"
              >
                <option value="">— All categories —</option>
                {eventCategoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <input
              type="text"
              value={payload.ctaLabel ?? ""}
              maxLength={40}
              placeholder="CTA label (optional)"
              onChange={(e) =>
                onUpdate(() => ({ ...payload, ctaLabel: e.target.value }))
              }
              className="form-input"
            />
            <input
              type="text"
              value={payload.ctaHref ?? ""}
              maxLength={1000}
              placeholder="CTA URL (optional)"
              onChange={(e) =>
                onUpdate(() => ({ ...payload, ctaHref: e.target.value }))
              }
              className="form-input font-mono text-sm"
            />
          </div>
        </div>
      );

    case "podcast_episode":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <input
            type="url"
            value={payload.url}
            maxLength={1000}
            placeholder="Spotify or Apple Podcasts episode URL"
            onChange={(e) => onUpdate(() => ({ ...payload, url: e.target.value }))}
            className="form-input font-mono text-sm"
          />
          <p className="text-xs text-ink-3">
            Paste the episode URL — provider auto-detects (Spotify, Apple Podcasts).
            Switch episodes any time by editing this field.
          </p>
          <input
            type="text"
            value={payload.showLabel ?? ""}
            maxLength={60}
            placeholder='Show label / eyebrow — e.g. "Saint Helen Podcast"'
            onChange={(e) =>
              onUpdate(() => ({ ...payload, showLabel: e.target.value }))
            }
            className="form-input"
          />
          <textarea
            value={payload.description ?? ""}
            maxLength={1000}
            rows={3}
            placeholder="Intro paragraph (optional) — what's this episode about?"
            onChange={(e) =>
              onUpdate(() => ({ ...payload, description: e.target.value }))
            }
            className="form-input"
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <input
              type="text"
              value={payload.subscribeLabel ?? ""}
              maxLength={40}
              placeholder="Subscribe CTA label"
              onChange={(e) =>
                onUpdate(() => ({ ...payload, subscribeLabel: e.target.value }))
              }
              className="form-input"
            />
            <input
              type="text"
              value={payload.subscribeHref ?? ""}
              maxLength={1000}
              placeholder="Subscribe URL — link to the show on Spotify/Apple"
              onChange={(e) =>
                onUpdate(() => ({ ...payload, subscribeHref: e.target.value }))
              }
              className="form-input font-mono text-sm"
            />
          </div>
        </div>
      );

    case "pastor_welcome":
      return (
        <div className="space-y-3">
          <HeaderEditor
            header={payload.header}
            onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <input
              type="url"
              value={payload.videoUrl ?? ""}
              maxLength={1000}
              placeholder="Welcome video URL (mp4, m3u8, YouTube, Vimeo) — optional"
              onChange={(e) => {
                const url = e.target.value;
                const type = url ? detectVideoType(url) : undefined;
                onUpdate(() => ({
                  ...payload,
                  videoUrl: url || undefined,
                  videoType: type,
                }));
              }}
              className="form-input font-mono text-sm"
            />
            <select
              value={payload.mediaSide ?? "left"}
              onChange={(e) =>
                onUpdate(() => ({
                  ...payload,
                  mediaSide: e.target.value as "left" | "right",
                }))
              }
              className="form-input"
            >
              <option value="left">Media on left</option>
              <option value="right">Media on right</option>
            </select>
          </div>
          <SectionImagePicker
            value={payload.photoBlobKey ?? null}
            previewUrl={
              payload.photoBlobKey ? imgUrls[payload.photoBlobKey] : undefined
            }
            pathPrefix={`${path}/pastor`}
            label="Pastor photo (used as poster when video is set)"
            onChange={(next) => {
              if (next) {
                registerImage(next.key, next.url);
                onUpdate(() => ({ ...payload, photoBlobKey: next.key }));
              } else {
                onUpdate(() => ({ ...payload, photoBlobKey: null }));
              }
            }}
          />
          <input
            type="text"
            value={payload.photoAlt ?? ""}
            maxLength={200}
            placeholder="Photo alt text (optional)"
            onChange={(e) =>
              onUpdate(() => ({ ...payload, photoAlt: e.target.value }))
            }
            className="form-input"
          />
          <RichTextEditor
            initialHtml={payload.html}
            pathPrefix={`${path}/pastor`}
            placeholder="Welcome letter from the pastor…"
            onChange={(html) => onUpdate(() => ({ ...payload, html }))}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={payload.signatureName ?? ""}
              maxLength={120}
              placeholder='Signature name — e.g. "Fr. Tom Quinn"'
              onChange={(e) =>
                onUpdate(() => ({ ...payload, signatureName: e.target.value }))
              }
              className="form-input"
            />
            <input
              type="text"
              value={payload.signatureRole ?? ""}
              maxLength={120}
              placeholder='Signature role — e.g. "Pastor"'
              onChange={(e) =>
                onUpdate(() => ({ ...payload, signatureRole: e.target.value }))
              }
              className="form-input"
            />
          </div>
        </div>
      );

    case "columns":
      return (
        <ColumnsEditor
          payload={payload}
          onUpdate={onUpdate}
          pathPrefix={pathPrefix}
          imgUrls={imgUrls}
          registerImage={registerImage}
          staffOptions={staffOptions}
          ministryOptions={ministryOptions}
          eventCategoryOptions={eventCategoryOptions}
        />
      );
  }
}

function LinkListEditor({
  items,
  onUpdate,
}: {
  items: LinkItem[];
  onUpdate: (next: LinkItem[]) => void;
}) {
  const update = (i: number, patch: Partial<LinkItem>) =>
    onUpdate(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => onUpdate(items.filter((_, idx) => idx !== i));
  const add = () => onUpdate([...items, { label: "", href: "" }]);
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((l, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_140px_auto]">
            <input
              type="text"
              value={l.label}
              maxLength={120}
              placeholder="Label"
              onChange={(e) => update(i, { label: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              value={l.href}
              maxLength={1000}
              placeholder="/path or URL"
              onChange={(e) => update(i, { href: e.target.value })}
              className="form-input font-mono text-sm"
            />
            <select
              value={l.iconHint ?? ""}
              onChange={(e) =>
                update(i, {
                  iconHint:
                    (e.target.value as LinkItem["iconHint"]) || undefined,
                })
              }
              className="form-input"
            >
              <option value="">Auto icon</option>
              <option value="external">External</option>
              <option value="pdf">PDF</option>
              <option value="form">Form</option>
              <option value="video">Video</option>
              <option value="calendar">Calendar</option>
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={items.length <= 1}
              className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust disabled:opacity-30"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        disabled={items.length >= 40}
        className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
      >
        + Add link
      </button>
    </div>
  );
}

function ButtonGroupEditor({
  items,
  onUpdate,
}: {
  items: ButtonItem[];
  onUpdate: (next: ButtonItem[]) => void;
}) {
  const update = (i: number, patch: Partial<ButtonItem>) =>
    onUpdate(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => onUpdate(items.filter((_, idx) => idx !== i));
  const add = () => onUpdate([...items, { label: "", href: "", variant: "primary" }]);
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((b, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_120px_auto]">
            <input
              type="text"
              value={b.label}
              maxLength={60}
              placeholder="Label"
              onChange={(e) => update(i, { label: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              value={b.href}
              maxLength={1000}
              placeholder="/path or URL"
              onChange={(e) => update(i, { href: e.target.value })}
              className="form-input font-mono text-sm"
            />
            <select
              value={b.variant ?? "primary"}
              onChange={(e) =>
                update(i, { variant: e.target.value as ButtonItem["variant"] })
              }
              className="form-input"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={items.length <= 1}
              className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust disabled:opacity-30"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        disabled={items.length >= 8}
        className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
      >
        + Add button
      </button>
    </div>
  );
}

function EmbedEditor({
  embed,
  onUpdate,
}: {
  embed: EmbedPayload;
  onUpdate: (next: EmbedPayload) => void;
}) {
  const [raw, setRaw] = useState(extractEmbedSourceUrl(embed));
  const [error, setError] = useState<string | null>(null);

  const detect = (url: string) => {
    setRaw(url);
    setError(null);
    if (!url.trim()) return;
    const next = parseEmbedUrl(url.trim());
    if (!next) {
      setError("URL doesn't match an allowlisted provider.");
      return;
    }
    onUpdate(next);
  };

  return (
    <div className="space-y-2">
      <input
        type="url"
        value={raw}
        maxLength={1000}
        placeholder="Paste a YouTube, Vimeo, Bunny, Google Form, Eventbrite, SignUpGenius, or Touchpoint URL"
        onChange={(e) => detect(e.target.value)}
        className="form-input font-mono text-sm"
      />
      <p className="text-xs text-ink-3">
        Provider: <strong>{embed.provider}</strong>
      </p>
      {error && <p className="text-xs text-rust-dark">{error}</p>}
      <input
        type="text"
        value={embed.title ?? ""}
        maxLength={120}
        placeholder="Title (for screen readers)"
        onChange={(e) => onUpdate({ ...embed, title: e.target.value })}
        className="form-input"
      />
    </div>
  );
}

function ColumnsEditor({
  payload,
  onUpdate,
  pathPrefix,
  imgUrls,
  registerImage,
  staffOptions,
  ministryOptions,
  eventCategoryOptions,
}: {
  payload: Extract<PageSectionPayload, { kind: "columns" }>;
  onUpdate: (replacer: (p: PageSectionPayload) => PageSectionPayload) => void;
  pathPrefix: string;
  imgUrls: Record<string, string>;
  registerImage: (key: string, url: string) => void;
  staffOptions: StaffOption[];
  ministryOptions: { id: string; name: string }[];
  eventCategoryOptions: readonly string[];
}) {
  const setColumnCount = (count: 2 | 3) => {
    const next = [...payload.columns];
    while (next.length < count) next.push({ blocks: [] });
    while (next.length > count) next.pop();
    onUpdate(() => ({ ...payload, columns: next }));
  };

  const updateColumnAt = (i: number, replacer: (blocks: PageLeafBlock[]) => PageLeafBlock[]) =>
    onUpdate(() => ({
      ...payload,
      columns: payload.columns.map((c, idx) =>
        idx === i ? { blocks: replacer(c.blocks) } : c,
      ),
    }));

  return (
    <div className="space-y-3">
      <HeaderEditor
        header={payload.header}
        onUpdate={(h) => onUpdate(() => ({ ...payload, header: h }))}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Column count
          </label>
          <select
            value={payload.columns.length === 3 ? 3 : 2}
            onChange={(e) => setColumnCount(Number(e.target.value) === 3 ? 3 : 2)}
            className="form-input w-32"
          >
            <option value={2}>2 columns</option>
            <option value={3}>3 columns</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Ratio
          </label>
          <select
            value={payload.ratio ?? "equal"}
            onChange={(e) =>
              onUpdate(() => ({
                ...payload,
                ratio: e.target.value as "equal" | "60-40" | "40-60",
              }))
            }
            disabled={payload.columns.length !== 2}
            className="form-input w-44"
          >
            <option value="equal">Equal</option>
            <option value="60-40">60 / 40</option>
            <option value="40-60">40 / 60</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {payload.columns.map((col, ci) => (
          <ColumnLane
            key={ci}
            columnIndex={ci}
            blocks={col.blocks}
            pathPrefix={pathPrefix}
            imgUrls={imgUrls}
            registerImage={registerImage}
            staffOptions={staffOptions}
            ministryOptions={ministryOptions}
            eventCategoryOptions={eventCategoryOptions}
            onUpdate={(replacer) => updateColumnAt(ci, replacer)}
          />
        ))}
      </div>
    </div>
  );
}

function ColumnLane({
  columnIndex,
  blocks,
  pathPrefix,
  imgUrls,
  registerImage,
  staffOptions,
  ministryOptions,
  eventCategoryOptions,
  onUpdate,
}: {
  columnIndex: number;
  blocks: PageLeafBlock[];
  pathPrefix: string;
  imgUrls: Record<string, string>;
  registerImage: (key: string, url: string) => void;
  staffOptions: StaffOption[];
  ministryOptions: { id: string; name: string }[];
  eventCategoryOptions: readonly string[];
  onUpdate: (replacer: (blocks: PageLeafBlock[]) => PageLeafBlock[]) => void;
}) {
  const updateAt = (i: number, replacer: (b: PageLeafBlock) => PageLeafBlock) =>
    onUpdate((cur) => cur.map((b, idx) => (idx === i ? replacer(b) : b)));
  const removeAt = (i: number) => onUpdate((cur) => cur.filter((_, idx) => idx !== i));
  const moveAt = (i: number, dir: -1 | 1) =>
    onUpdate((cur) => {
      const next = [...cur];
      const t = i + dir;
      if (t < 0 || t >= next.length) return cur;
      const a = next[i];
      const b = next[t];
      if (!a || !b) return cur;
      next[i] = b;
      next[t] = a;
      return next;
    });
  const add = (kind: PageLeafBlock["kind"]) =>
    onUpdate((cur) => [...cur, blankLeafBlock(kind)]);

  return (
    <div className="rounded-md border border-rule bg-cream/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
        Column {columnIndex + 1}
      </p>
      <ul className="space-y-2">
        {blocks.map((b, i) => (
          <li key={i} className="rounded-md border border-rule bg-white p-2">
            <div className="mb-1 flex items-center gap-1">
              <span className="rounded-md bg-navy-pale px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-navy">
                {prettyKind(b.kind)}
              </span>
              <button
                type="button"
                onClick={() => moveAt(i, -1)}
                disabled={i === 0}
                className="rounded-md border border-rule bg-white px-1.5 py-0.5 text-[10px] hover:border-navy disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveAt(i, 1)}
                disabled={i === blocks.length - 1}
                className="rounded-md border border-rule bg-white px-1.5 py-0.5 text-[10px] hover:border-navy disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="ml-auto rounded-md border border-rule bg-white px-1.5 py-0.5 text-[10px] text-rust-dark hover:border-rust"
              >
                ✕
              </button>
            </div>
            {/* Reuse the leaf editor by upcasting to the section payload type. */}
            <BlockEditor
              payload={b as unknown as PageSectionPayload}
              onUpdate={(replacer) => updateAt(i, (cur) => replacer(cur as unknown as PageSectionPayload) as PageLeafBlock)}
              pathPrefix={pathPrefix}
              imgUrls={imgUrls}
              registerImage={registerImage}
              staffOptions={staffOptions}
              ministryOptions={ministryOptions}
              eventCategoryOptions={eventCategoryOptions}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">
        {LEAF_KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => add(k)}
            className="rounded-pill border border-rule bg-white px-2 py-0.5 text-[10px] font-semibold text-navy hover:border-navy"
          >
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const LEAF_KINDS: [PageLeafBlock["kind"], string][] = [
  ["heading", "Heading"],
  ["rich_text", "Text"],
  ["image", "Image"],
  ["image_text", "Image+Text"],
  ["image_gallery", "Gallery"],
  ["link_list", "Links"],
  ["button_group", "Buttons"],
  ["video", "Video"],
  ["embed", "Embed"],
  ["card_grid", "Cards"],
  ["staff_card", "Staff"],
  ["callout_banner", "Callout"],
  ["featured_ministries", "Ministries"],
  ["featured_events", "Events"],
  ["podcast_episode", "Podcast"],
  ["pastor_welcome", "Pastor welcome"],
];

function blankLeafBlock(kind: PageLeafBlock["kind"]): PageLeafBlock {
  switch (kind) {
    case "heading":
      return { kind: "heading", header: { heading: "" } };
    case "rich_text":
      return { kind: "rich_text", html: "" };
    case "image":
      return { kind: "image", blobKey: "" };
    case "image_text":
      return { kind: "image_text", blobKey: "", html: "" };
    case "image_gallery":
      return { kind: "image_gallery", images: [{ blobKey: "" }] };
    case "link_list":
      return { kind: "link_list", items: [{ label: "", href: "" }] };
    case "button_group":
      return {
        kind: "button_group",
        items: [{ label: "", href: "", variant: "primary" }],
      };
    case "video":
      return { kind: "video", url: "", type: "mp4" };
    case "embed":
      return { kind: "embed", embed: { provider: "iframe", url: "" } };
    case "card_grid":
      return { kind: "card_grid", cards: [{ title: "" }] };
    case "staff_card":
      return { kind: "staff_card", staffId: "" };
    case "callout_banner":
      return { kind: "callout_banner", title: "" };
    case "featured_ministries":
      return {
        kind: "featured_ministries",
        mode: "spotlight",
        count: 2,
        ministryIds: [],
      };
    case "featured_events":
      return { kind: "featured_events", count: 4 };
    case "podcast_episode":
      return { kind: "podcast_episode", url: "" };
    case "pastor_welcome":
      return { kind: "pastor_welcome", html: "" };
  }
}

function AddBlockMenu({
  onAdd,
}: {
  onAdd: (payload: PageSectionPayload) => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-rule bg-cream/40 p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
        Add a block
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["heading", "Heading"],
            ["rich_text", "Rich text"],
            ["image", "Image"],
            ["image_text", "Image + text"],
            ["image_gallery", "Image gallery"],
            ["link_list", "Link list"],
            ["button_group", "Button group"],
            ["video", "Video"],
            ["embed", "Embed"],
            ["card_grid", "Card grid"],
            ["staff_card", "Staff card"],
            ["callout_banner", "Callout banner"],
            ["featured_ministries", "Featured ministries"],
            ["featured_events", "Featured events"],
            ["podcast_episode", "Podcast episode"],
            ["pastor_welcome", "Pastor welcome"],
            ["columns", "Columns"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => onAdd(blankBlock(k))}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
          >
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function blankBlock(kind: PageSectionPayload["kind"]): PageSectionPayload {
  switch (kind) {
    case "heading":
      return { kind: "heading", header: { heading: "" } };
    case "rich_text":
      return { kind: "rich_text", html: "" };
    case "image":
      return { kind: "image", blobKey: "" };
    case "image_text":
      return { kind: "image_text", blobKey: "", html: "" };
    case "image_gallery":
      return { kind: "image_gallery", images: [{ blobKey: "" }] };
    case "link_list":
      return { kind: "link_list", items: [{ label: "", href: "" }] };
    case "button_group":
      return {
        kind: "button_group",
        items: [{ label: "", href: "", variant: "primary" }],
      };
    case "video":
      return { kind: "video", url: "", type: "mp4" };
    case "embed":
      return { kind: "embed", embed: { provider: "iframe", url: "" } };
    case "card_grid":
      return { kind: "card_grid", cards: [{ title: "" }] };
    case "staff_card":
      return { kind: "staff_card", staffId: "" };
    case "callout_banner":
      return { kind: "callout_banner", title: "" };
    case "featured_ministries":
      return {
        kind: "featured_ministries",
        mode: "spotlight",
        count: 2,
        ministryIds: [],
      };
    case "featured_events":
      return { kind: "featured_events", count: 4 };
    case "podcast_episode":
      return { kind: "podcast_episode", url: "" };
    case "pastor_welcome":
      return { kind: "pastor_welcome", html: "" };
    case "columns":
      return {
        kind: "columns",
        columns: [{ blocks: [] }, { blocks: [] }],
      };
  }
}

function prettyKind(k: PageSectionPayload["kind"]): string {
  return {
    heading: "Heading",
    rich_text: "Rich text",
    image: "Image",
    image_text: "Image + text",
    image_gallery: "Image gallery",
    link_list: "Link list",
    button_group: "Button group",
    video: "Video",
    embed: "Embed",
    card_grid: "Card grid",
    staff_card: "Staff card",
    callout_banner: "Callout banner",
    featured_ministries: "Featured ministries",
    featured_events: "Featured events",
    podcast_episode: "Podcast episode",
    pastor_welcome: "Pastor welcome",
    columns: "Columns",
  }[k];
}

function detectVideoType(url: string): "mp4" | "hls" | "youtube" | "vimeo" {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes(".m3u8")) return "hls";
  return "mp4";
}

function extractEmbedSourceUrl(e: EmbedPayload): string {
  if (e.provider === "youtube") return `https://www.youtube.com/watch?v=${e.videoId}`;
  if (e.provider === "vimeo") return `https://vimeo.com/${e.videoId}`;
  return e.url;
}

/** Match a pasted URL against the allowlisted providers. Returns null
 *  if no match — the editor surfaces the error to the user. */
function parseEmbedUrl(url: string): EmbedPayload | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return { provider: "youtube", videoId: v };
    }
    if (host === "youtu.be") {
      const v = u.pathname.replace(/^\//, "");
      if (v) return { provider: "youtube", videoId: v };
    }

    // Vimeo
    if (host === "vimeo.com") {
      const v = u.pathname.replace(/^\//, "").split("/")[0];
      if (v && /^\d+$/.test(v)) return { provider: "vimeo", videoId: v };
    }

    // Bunny — iframe.mediadelivery.net, b-cdn.net, etc.
    if (host.endsWith("mediadelivery.net") || host.endsWith("b-cdn.net")) {
      return { provider: "bunny", url };
    }

    // Google Forms / Docs
    if (host === "docs.google.com" || host === "forms.gle") {
      return { provider: "google_form", url };
    }

    // Eventbrite
    if (host.endsWith("eventbrite.com") || host.endsWith("evbqa.com")) {
      return { provider: "eventbrite", url };
    }

    // SignUpGenius
    if (host.endsWith("signupgenius.com")) {
      return { provider: "signupgenius", url };
    }

    // Touchpoint
    if (host.endsWith("tpsdb.com") || host.endsWith("touchpointsoftware.com")) {
      return { provider: "touchpoint", url };
    }

    // Generic iframe — the long tail. Editor explicitly opted in.
    return { provider: "iframe", url };
  } catch {
    return null;
  }
}
