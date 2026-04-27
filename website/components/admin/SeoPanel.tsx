"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/admin/PhotoUploader";

/**
 * Reusable SEO override panel. Drop into any content editor; submits
 * `metaTitle`, `metaDescription`, `ogImageBlobKey`, `noindex`, and
 * `canonicalUrl` form fields the server action picks up.
 *
 * Length meters mirror Google's display caps (60 / 160). Preview shows
 * how the result will likely render in search.
 */
export function SeoPanel({
  pathPrefix,
  initial,
  ogImagePreviewUrl,
  publicPath,
}: {
  /** Where new OG images get uploaded — same shape as PhotoUploader. */
  pathPrefix: string;
  initial: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImageBlobKey?: string | null;
    noindex?: boolean | null;
    canonicalUrl?: string | null;
  };
  ogImagePreviewUrl?: string | null;
  /** Public path for the row, e.g. "/events/harvest-fest". Shown in preview. */
  publicPath?: string;
}) {
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial.metaDescription ?? "",
  );

  const titleLen = metaTitle.length;
  const descLen = metaDescription.length;
  const titleClass =
    titleLen > 60
      ? "text-rust-dark"
      : titleLen >= 50
        ? "text-amber-700"
        : titleLen >= 30
          ? "text-emerald-700"
          : "text-ink-3";
  const descClass =
    descLen > 160
      ? "text-rust-dark"
      : descLen >= 120
        ? "text-emerald-700"
        : descLen >= 70
          ? "text-amber-700"
          : "text-ink-3";

  return (
    <div className="space-y-5 rounded-lg border border-rule bg-white p-5">
      <div>
        <h3 className="font-serif text-lg font-bold text-navy">Search & social</h3>
        <p className="mt-1 text-xs text-ink-3">
          Per-page overrides. Leave blank to use sensible defaults from the
          page&rsquo;s title, summary, and hero photo.
        </p>
      </div>

      <Field label="Meta title" hint="Shown in browser tabs + Google results. Aim for 50–60 characters.">
        <div className="space-y-1">
          <input
            type="text"
            name="metaTitle"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={120}
            placeholder="Falls back to page title"
            className="form-input"
          />
          <p className={`text-[11px] ${titleClass}`}>{titleLen} / 60 characters</p>
        </div>
      </Field>

      <Field
        label="Meta description"
        hint="Shown under the title in Google. Aim for 120–160 characters."
      >
        <div className="space-y-1">
          <textarea
            name="metaDescription"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Falls back to page summary"
            className="form-input"
          />
          <p className={`text-[11px] ${descClass}`}>{descLen} / 160 characters</p>
        </div>
      </Field>

      <Field
        label="Social share image"
        hint="1200×630 PNG/JPG works best. Falls back to the hero photo when not set."
      >
        <PhotoUploader
          name="ogImageBlobKey"
          initialKey={initial.ogImageBlobKey ?? null}
          initialPreviewUrl={ogImagePreviewUrl}
          pathPrefix={pathPrefix}
        />
      </Field>

      <Field
        label="Canonical URL"
        hint="Override only when this page should point Google at a different URL."
      >
        <input
          type="url"
          name="canonicalUrl"
          defaultValue={initial.canonicalUrl ?? ""}
          maxLength={1000}
          placeholder="https://..."
          className="form-input font-mono text-sm"
        />
      </Field>

      <label className="flex items-start gap-2 rounded-md border border-rule bg-cream/40 p-3 text-sm">
        <input
          type="checkbox"
          name="noindex"
          defaultChecked={!!initial.noindex}
          className="mt-1 size-4"
        />
        <span>
          <strong className="block text-navy">Hide from search engines</strong>
          <span className="text-xs text-ink-3">
            Tells Google + Bing not to index this page. Useful for staging,
            confidential pages, or one-off events you don&rsquo;t want surfacing
            forever in results.
          </span>
        </span>
      </label>

      <div className="rounded-md border border-rule bg-cream/40 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          Google preview
        </p>
        <a className="block text-[12px] text-ink-3" href="#">
          {publicPath ? `sainthelen.org${publicPath}` : "sainthelen.org"}
        </a>
        <p className="mt-1 truncate font-serif text-[18px] leading-tight text-[#1a0dab]">
          {metaTitle || "Page title here"}
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-2">
          {metaDescription || "Description preview will appear here once you add a meta description (or page summary)."}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
