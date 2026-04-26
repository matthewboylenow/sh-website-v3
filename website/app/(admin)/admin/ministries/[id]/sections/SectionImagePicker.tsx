"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";

/**
 * Slim controlled image picker for the section editor — uploads to
 * Vercel Blob, calls /api/admin/upload/complete to persist a
 * blob_assets row, then surfaces { key, url } via onChange.
 */

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function SectionImagePicker({
  value,
  previewUrl,
  pathPrefix,
  onChange,
  label,
}: {
  value: string | null | undefined;
  previewUrl?: string | null;
  pathPrefix: string;
  onChange: (next: { key: string; url: string } | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      setError("Use PNG, JPEG, WEBP, or GIF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const safe = file.name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const pathname = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${safe}`;
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
      });
      const completeRes = await fetch("/api/admin/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          pathname: blob.pathname,
          contentType: file.type,
          byteSize: file.size,
        }),
      });
      if (!completeRes.ok) throw new Error("Upload failed at confirm step.");
      const { key, blobUrl } = (await completeRes.json()) as { key: string; blobUrl: string };
      onChange({ key, url: blobUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          {label}
        </label>
      )}
      {value && previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview, no LCP impact */}
          <img
            src={previewUrl}
            alt=""
            className="size-20 rounded-md border border-rule object-cover"
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-md border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md border border-rule bg-white px-3 py-1 text-xs font-semibold text-rust-dark hover:border-rust"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-20 w-full items-center justify-center rounded-md border-2 border-dashed border-rule bg-cream/40 text-sm font-semibold text-ink-2 hover:border-navy hover:text-navy disabled:opacity-50"
        >
          {busy ? "Uploading…" : "+ Choose image"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) onPick(f);
          e.currentTarget.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-rust-dark">{error}</p>}
    </div>
  );
}
