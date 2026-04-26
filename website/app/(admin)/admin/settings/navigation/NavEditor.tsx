"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  NavItem,
  NavManifest,
  NavMega,
  NavMegaFeature,
  NavMegaSection,
} from "@/db/schema";
import { saveNavManifestAction } from "./_actions";

const EMPTY_FEATURE: NavMegaFeature = {
  tag: "",
  title: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
};

export function NavEditor({ initial }: { initial: NavManifest }) {
  const router = useRouter();
  const [items, setItems] = useState<NavItem[]>(initial.items);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setItemAt = (idx: number, replace: (it: NavItem) => NavItem) =>
    setItems((cur) => cur.map((it, i) => (i === idx ? replace(it) : it)));
  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems((cur) => {
      const next = [...cur];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return cur;
      const a = next[idx];
      const b = next[t];
      if (!a || !b) return cur;
      next[idx] = b;
      next[t] = a;
      return next;
    });
  };
  const removeItem = (idx: number) =>
    setItems((cur) => cur.filter((_, i) => i !== idx));
  const addItem = () =>
    setItems((cur) => [...cur, { label: "", href: "" }]);

  const onSave = () => {
    setError(null);
    setSaved(false);
    // Strip empty optional fields so the validator doesn't choke.
    const sanitized: NavManifest = {
      items: items.map((it) => {
        const base: NavItem = { label: it.label.trim(), href: it.href.trim() };
        if (!it.mega) return base;
        const sections: NavMegaSection[] = it.mega.sections
          .map((s) => ({
            heading: s.heading.trim(),
            links: s.links
              .map((l) => ({ label: l.label.trim(), href: l.href.trim() }))
              .filter((l) => l.label && l.href),
          }))
          .filter((s) => s.heading && s.links.length > 0);
        const f = it.mega.feature;
        const feature =
          f && f.title.trim() && f.ctaLabel.trim() && f.ctaHref.trim()
            ? {
                tag: f.tag?.trim() || undefined,
                title: f.title.trim(),
                body: f.body?.trim() || undefined,
                ctaLabel: f.ctaLabel.trim(),
                ctaHref: f.ctaHref.trim(),
              }
            : undefined;
        if (sections.length === 0 && !feature) return base;
        return { ...base, mega: { sections, feature } };
      }),
    };

    start(async () => {
      const r = await saveNavManifestAction(sanitized);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i}>
            <NavItemRow
              item={it}
              index={i}
              total={items.length}
              onUpdate={(patch) => setItemAt(i, (cur) => ({ ...cur, ...patch }))}
              onMove={(d) => moveItem(i, d)}
              onRemove={() => removeItem(i)}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= 8}
        className="rounded-pill border border-rule bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy disabled:opacity-50"
      >
        + Add nav item
      </button>

      <div className="sticky bottom-0 -mx-4 border-t border-rule bg-white/95 p-4 backdrop-blur sm:-mx-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-pill bg-rust px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save navigation"}
          </button>
          {error && (
            <span className="text-sm font-semibold text-rust-dark">{error}</span>
          )}
          {saved && !error && (
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Saved.
            </span>
          )}
          <span className="ml-auto text-xs text-ink-3">
            {items.length}/8 items
          </span>
        </div>
      </div>
    </div>
  );
}

function NavItemRow({
  item,
  index,
  total,
  onUpdate,
  onMove,
  onRemove,
}: {
  item: NavItem;
  index: number;
  total: number;
  onUpdate: (patch: Partial<NavItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const hasMega = !!item.mega;

  const enableMega = () =>
    onUpdate({
      mega: { sections: [{ heading: "", links: [{ label: "", href: "" }] }] },
    });
  const disableMega = () => onUpdate({ mega: undefined });

  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-navy-pale px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy">
          item {index + 1}
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
          onClick={onRemove}
          className="ml-auto rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
        >
          ✕ Remove
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr]">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Label
          </label>
          <input
            type="text"
            value={item.label}
            maxLength={40}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="form-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Link / URL
          </label>
          <input
            type="text"
            value={item.href}
            maxLength={500}
            placeholder="/events or https://…"
            onChange={(e) => onUpdate({ href: e.target.value })}
            className="form-input font-mono text-sm"
          />
        </div>
      </div>

      <div className="mt-4 border-t border-rule pt-3">
        {hasMega ? (
          <MegaEditor
            mega={item.mega!}
            onUpdate={(m) => onUpdate({ mega: m })}
            onDisable={disableMega}
          />
        ) : (
          <button
            type="button"
            onClick={enableMega}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
          >
            + Add mega-menu
          </button>
        )}
      </div>
    </div>
  );
}

function MegaEditor({
  mega,
  onUpdate,
  onDisable,
}: {
  mega: NavMega;
  onUpdate: (m: NavMega) => void;
  onDisable: () => void;
}) {
  const setSections = (sections: NavMegaSection[]) =>
    onUpdate({ ...mega, sections });
  const setSection = (i: number, replace: (s: NavMegaSection) => NavMegaSection) =>
    setSections(mega.sections.map((s, idx) => (idx === i ? replace(s) : s)));
  const moveSection = (i: number, dir: -1 | 1) => {
    const next = [...mega.sections];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    const a = next[i];
    const b = next[t];
    if (!a || !b) return;
    next[i] = b;
    next[t] = a;
    setSections(next);
  };
  const addSection = () =>
    setSections([
      ...mega.sections,
      { heading: "", links: [{ label: "", href: "" }] },
    ]);
  const removeSection = (i: number) =>
    setSections(mega.sections.filter((_, idx) => idx !== i));

  const addLink = (i: number) =>
    setSection(i, (s) => ({ ...s, links: [...s.links, { label: "", href: "" }] }));
  const updateLink = (
    i: number,
    j: number,
    patch: Partial<{ label: string; href: string }>,
  ) =>
    setSection(i, (s) => ({
      ...s,
      links: s.links.map((l, lidx) => (lidx === j ? { ...l, ...patch } : l)),
    }));
  const removeLink = (i: number, j: number) =>
    setSection(i, (s) => ({ ...s, links: s.links.filter((_, lidx) => lidx !== j) }));
  const moveLink = (i: number, j: number, dir: -1 | 1) => {
    setSection(i, (s) => {
      const next = [...s.links];
      const t = j + dir;
      if (t < 0 || t >= next.length) return s;
      const a = next[j];
      const b = next[t];
      if (!a || !b) return s;
      next[j] = b;
      next[t] = a;
      return { ...s, links: next };
    });
  };

  const setFeature = (f: NavMegaFeature | undefined) =>
    onUpdate({ ...mega, feature: f });

  return (
    <div className="rounded-md border border-rule bg-cream/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
          Mega-menu
        </h4>
        <button
          type="button"
          onClick={onDisable}
          className="text-xs font-semibold text-rust-dark hover:text-rust"
        >
          Remove mega-menu
        </button>
      </div>

      <ul className="mt-3 space-y-3">
        {mega.sections.map((s, i) => (
          <li key={i} className="rounded-md border border-rule bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Section {i + 1}
              </span>
              <button
                type="button"
                onClick={() => moveSection(i, -1)}
                disabled={i === 0}
                className="rounded-md border border-rule bg-white px-2 py-0.5 text-xs hover:border-navy disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSection(i, 1)}
                disabled={i === mega.sections.length - 1}
                className="rounded-md border border-rule bg-white px-2 py-0.5 text-xs hover:border-navy disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeSection(i)}
                disabled={mega.sections.length <= 1}
                className="ml-auto rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            <div className="mt-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Heading
              </label>
              <input
                type="text"
                value={s.heading}
                maxLength={60}
                onChange={(e) => setSection(i, (cur) => ({ ...cur, heading: e.target.value }))}
                className="form-input"
              />
            </div>

            <ul className="mt-3 space-y-2">
              {s.links.map((l, j) => (
                <li key={j} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <input
                    type="text"
                    value={l.label}
                    maxLength={60}
                    placeholder="Label"
                    onChange={(e) => updateLink(i, j, { label: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={l.href}
                    maxLength={500}
                    placeholder="/path or URL"
                    onChange={(e) => updateLink(i, j, { href: e.target.value })}
                    className="form-input font-mono text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(i, j, -1)}
                      disabled={j === 0}
                      className="rounded-md border border-rule bg-white px-2 py-1 text-xs hover:border-navy disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(i, j, 1)}
                      disabled={j === s.links.length - 1}
                      className="rounded-md border border-rule bg-white px-2 py-1 text-xs hover:border-navy disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(i, j)}
                      disabled={s.links.length <= 1}
                      className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => addLink(i)}
              disabled={s.links.length >= 12}
              className="mt-2 rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
            >
              + Add link
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addSection}
        disabled={mega.sections.length >= 4}
        className="mt-3 rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
      >
        + Add section
      </button>

      <div className="mt-5 border-t border-dashed border-rule pt-3">
        {mega.feature ? (
          <FeatureEditor
            feature={mega.feature}
            onUpdate={setFeature}
          />
        ) : (
          <button
            type="button"
            onClick={() => setFeature(EMPTY_FEATURE)}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
          >
            + Add featured card
          </button>
        )}
      </div>
    </div>
  );
}

function FeatureEditor({
  feature,
  onUpdate,
}: {
  feature: NavMegaFeature;
  onUpdate: (f: NavMegaFeature | undefined) => void;
}) {
  const set = (patch: Partial<NavMegaFeature>) => onUpdate({ ...feature, ...patch });
  return (
    <div className="rounded-md border border-rule bg-white p-3">
      <div className="flex items-center justify-between">
        <h5 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Featured card
        </h5>
        <button
          type="button"
          onClick={() => onUpdate(undefined)}
          className="text-xs font-semibold text-rust-dark hover:text-rust"
        >
          Remove
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Tag (optional)
          </label>
          <input
            type="text"
            value={feature.tag ?? ""}
            maxLength={40}
            placeholder="Featured · This Sunday · etc."
            onChange={(e) => set({ tag: e.target.value })}
            className="form-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Title
          </label>
          <input
            type="text"
            value={feature.title}
            maxLength={80}
            onChange={(e) => set({ title: e.target.value })}
            className="form-input"
          />
        </div>
      </div>
      <div className="mt-2">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          Body (optional)
        </label>
        <input
          type="text"
          value={feature.body ?? ""}
          maxLength={240}
          onChange={(e) => set({ body: e.target.value })}
          className="form-input"
        />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr]">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            CTA label
          </label>
          <input
            type="text"
            value={feature.ctaLabel}
            maxLength={40}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            className="form-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            CTA link
          </label>
          <input
            type="text"
            value={feature.ctaHref}
            maxLength={500}
            placeholder="/path or URL"
            onChange={(e) => set({ ctaHref: e.target.value })}
            className="form-input font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
