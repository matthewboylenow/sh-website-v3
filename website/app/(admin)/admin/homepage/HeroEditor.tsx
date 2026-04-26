"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { HomepageHero, HomepageHeroCta } from "@/db/schema";
import { saveHomepageHeroAction } from "./_actions";

export function HeroEditor({ initial }: { initial: HomepageHero }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hero, setHero] = useState<HomepageHero>(initial);

  const update = <K extends keyof HomepageHero>(key: K, value: HomepageHero[K]) =>
    setHero((cur) => ({ ...cur, [key]: value }));

  const updateMassPeek = <K extends keyof HomepageHero["massPeek"]>(
    key: K,
    value: HomepageHero["massPeek"][K],
  ) => setHero((cur) => ({ ...cur, massPeek: { ...cur.massPeek, [key]: value } }));

  const updateCta = (i: number, patch: Partial<HomepageHeroCta>) =>
    setHero((cur) => ({
      ...cur,
      ctas: cur.ctas.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  const removeCta = (i: number) =>
    setHero((cur) => ({ ...cur, ctas: cur.ctas.filter((_, idx) => idx !== i) }));
  const addCta = () =>
    setHero((cur) => ({
      ...cur,
      ctas: [...cur.ctas, { label: "", href: "", variant: "secondary" }],
    }));
  const moveCta = (i: number, dir: -1 | 1) => {
    setHero((cur) => {
      const next = [...cur.ctas];
      const t = i + dir;
      if (t < 0 || t >= next.length) return cur;
      const a = next[i];
      const b = next[t];
      if (!a || !b) return cur;
      next[i] = b;
      next[t] = a;
      return { ...cur, ctas: next };
    });
  };

  const onSave = () => {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await saveHomepageHeroAction(hero);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 rounded-lg border border-rule bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-navy">Hero</h2>
          <p className="mt-1 text-sm text-ink-2">
            Full-bleed video stage at the top of the homepage. Title + lede
            overlay the video; CTAs stack below.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Background video URL (MP4 or HLS .m3u8)">
          <input
            type="url"
            value={hero.videoUrl ?? ""}
            maxLength={1000}
            placeholder="https://… (Bunny / Mux / etc)"
            onChange={(e) => update("videoUrl", e.target.value)}
            className="form-input font-mono text-sm"
          />
        </Field>
        <Field label="Poster image URL (fallback when video off)">
          <input
            type="url"
            value={hero.posterUrl ?? ""}
            maxLength={1000}
            placeholder="https://…"
            onChange={(e) => update("posterUrl", e.target.value)}
            className="form-input font-mono text-sm"
          />
        </Field>
      </div>

      <Field label="Eyebrow (small uppercase tag)">
        <input
          type="text"
          value={hero.eyebrow ?? ""}
          maxLength={120}
          onChange={(e) => update("eyebrow", e.target.value)}
          className="form-input"
        />
      </Field>

      <Field label="Title" required>
        <input
          type="text"
          value={hero.title}
          maxLength={200}
          onChange={(e) => update("title", e.target.value)}
          className="form-input font-serif text-lg"
        />
      </Field>

      <Field label="Lede paragraph">
        <textarea
          value={hero.lede ?? ""}
          maxLength={500}
          rows={3}
          onChange={(e) => update("lede", e.target.value)}
          className="form-input"
        />
      </Field>

      {/* CTAs */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label className="text-sm font-semibold text-ink">CTAs</label>
          <button
            type="button"
            onClick={addCta}
            disabled={hero.ctas.length >= 6}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
          >
            + Add CTA
          </button>
        </div>
        {hero.ctas.length === 0 ? (
          <p className="rounded-md border border-dashed border-rule px-4 py-3 text-center text-xs text-ink-3">
            No CTAs — the button row will be empty.
          </p>
        ) : (
          <ul className="space-y-2">
            {hero.ctas.map((c, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-md border border-rule bg-cream/40 p-3 sm:grid-cols-[1fr_2fr_140px_auto]"
              >
                <input
                  type="text"
                  value={c.label}
                  maxLength={40}
                  placeholder="Button label"
                  onChange={(e) => updateCta(i, { label: e.target.value })}
                  className="form-input"
                />
                <input
                  type="text"
                  value={c.href}
                  maxLength={1000}
                  placeholder="/path or https://…"
                  onChange={(e) => updateCta(i, { href: e.target.value })}
                  className="form-input font-mono text-sm"
                />
                <select
                  value={c.variant ?? "secondary"}
                  onChange={(e) =>
                    updateCta(i, { variant: e.target.value as "primary" | "secondary" })
                  }
                  className="form-input"
                >
                  <option value="primary">Primary (rust)</option>
                  <option value="secondary">Secondary (outline)</option>
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCta(i, -1)}
                    disabled={i === 0}
                    className="rounded-md border border-rule bg-white px-2 py-1 text-xs hover:border-navy disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCta(i, 1)}
                    disabled={i === hero.ctas.length - 1}
                    className="rounded-md border border-rule bg-white px-2 py-1 text-xs hover:border-navy disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCta(i)}
                    className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mass peek */}
      <div className="rounded-md border border-rule bg-cream/40 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={hero.massPeek.enabled}
            onChange={(e) => updateMassPeek("enabled", e.target.checked)}
            className="size-4"
          />
          Show &ldquo;This Sunday&rdquo; mass-times peek strip
        </label>
        <p className="mt-1 text-xs text-ink-3">
          Times themselves auto-pull from the mass-times schedule. The chrome
          around them is editable.
        </p>
        {hero.massPeek.enabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Eyebrow">
              <input
                type="text"
                value={hero.massPeek.eyebrow ?? ""}
                maxLength={60}
                onChange={(e) => updateMassPeek("eyebrow", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Link label">
              <input
                type="text"
                value={hero.massPeek.linkLabel ?? ""}
                maxLength={60}
                onChange={(e) => updateMassPeek("linkLabel", e.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Link URL">
              <input
                type="text"
                value={hero.massPeek.linkHref ?? ""}
                maxLength={500}
                onChange={(e) => updateMassPeek("linkHref", e.target.value)}
                className="form-input font-mono text-sm"
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-pill bg-rust px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save hero"}
        </button>
        {error && <span className="text-sm font-semibold text-rust-dark">{error}</span>}
        {saved && !error && (
          <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Saved.
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
        {label}
        {required && <span className="text-rust-dark"> *</span>}
      </label>
      {children}
    </div>
  );
}
