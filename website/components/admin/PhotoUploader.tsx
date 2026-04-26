"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ALLOWED_IMAGE_TYPES } from "@/lib/validators/blob";
import { MediaPickerModal } from "./MediaPickerModal";

type State =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number; previewUrl: string; isPdf: boolean; fileName?: string }
  | { kind: "ready"; key: string; previewUrl: string; isPdf: boolean; fileName?: string }
  | { kind: "error"; message: string };

/**
 * Photo upload widget. Renders a drop zone, sends the file directly
 * to Vercel Blob, then confirms with /api/admin/upload/complete which
 * inserts the blob_assets row. Returns the resulting key via a hidden
 * form field plus an `onChange` callback so the parent form can pick
 * it up at submit time.
 */
export function PhotoUploader({
  /** Form field name. The hidden input carries the resulting key. */
  name,
  /** Initial key (when editing an existing row that already has a photo). */
  initialKey,
  /** Initial alt text for re-edit. */
  initialAlt,
  /** Initial preview URL — typically resolveAssetUrl(blobUrl) from server. */
  initialPreviewUrl,
  /** Where in Blob storage to put it: e.g. "events/abc-id". */
  pathPrefix,
  /** Accept attribute on the file input. Defaults to allowed image types. */
  accept = ALLOWED_IMAGE_TYPES.join(","),
}: {
  name: string;
  initialKey?: string | null;
  initialAlt?: string | null;
  initialPreviewUrl?: string | null;
  pathPrefix: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<State>(
    initialKey && initialPreviewUrl
      ? {
          kind: "ready",
          key: initialKey,
          previewUrl: initialPreviewUrl,
          isPdf: initialKey.toLowerCase().endsWith(".pdf"),
        }
      : { kind: "idle" },
  );
  const [alt, setAlt] = useState(initialAlt ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  const onPick = () => inputRef.current?.click();
  const openLibrary = () => setPickerOpen(true);
  const onLibrarySelect = (item: { key: string; url: string; alt: string | null }) => {
    setState({
      kind: "ready",
      key: item.key,
      previewUrl: item.url,
      isPdf: item.key.toLowerCase().endsWith(".pdf"),
    });
    if (item.alt) setAlt(item.alt);
    setPickerOpen(false);
  };

  const onFile = async (file: File) => {
    const isPdf = file.type === "application/pdf";
    const previewUrl = URL.createObjectURL(file);
    setState({ kind: "uploading", progress: 0, previewUrl, isPdf, fileName: file.name });

    try {
      // Read dimensions client-side for images only. PDFs skip — sharp
      // could read page dimensions later but for v1 we don't need them.
      const dims = isPdf
        ? { width: null, height: null }
        : await readImageDimensions(file).catch(() => ({ width: null, height: null }));

      // Slugify filename so URLs stay clean.
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const pathname = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${safeName}`;

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
          width: dims.width,
          height: dims.height,
          alt,
        }),
      });
      if (!completeRes.ok) {
        const { error } = (await completeRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setState({ kind: "error", message: error ?? "Upload failed at confirm step" });
        return;
      }
      const { key } = (await completeRes.json()) as { key: string };
      setState({ kind: "ready", key, previewUrl, isPdf, fileName: file.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setState({ kind: "error", message });
    }
  };

  const onAltBlur = async () => {
    // PATCH the alt text after the row exists. (Skipped for v1 — alt
    // is sent at confirm-time. Here just persist into local state.)
    if (state.kind !== "ready") return;
  };

  return (
    <div>
      {/* hidden input the parent form reads at submit */}
      <input
        type="hidden"
        name={name}
        value={state.kind === "ready" ? state.key : (initialKey ?? "")}
      />

      {state.kind === "idle" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onPick}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-rule bg-cream px-6 py-10 text-center text-sm text-ink-3 transition-colors hover:border-navy hover:bg-navy-pale/30"
          >
            <UploadIcon />
            <span className="font-semibold text-navy">Drop image or click to choose</span>
            <span className="text-xs text-ink-3">JPG, PNG, WebP · up to 15MB</span>
          </button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openLibrary}
              className="text-xs font-semibold text-rust-dark hover:text-rust"
            >
              Or pick from media library →
            </button>
          </div>
        </div>
      )}

      {state.kind === "uploading" && (
        <div className="space-y-3">
          {state.isPdf ? (
            <PdfChip fileName={state.fileName} muted />
          ) : (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-cream">
              {/* Local object URL — fine for preview, no next/image needed. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.previewUrl}
                alt=""
                className="h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-x-0 bottom-0 bg-navy/75 px-4 py-2 text-center text-xs text-white">
                Uploading…
              </div>
            </div>
          )}
        </div>
      )}

      {state.kind === "ready" && (
        <div className="space-y-3">
          {state.isPdf ? (
            <PdfChip fileName={state.fileName ?? state.key.split("/").pop()} />
          ) : (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-rule">
              <Image
                src={state.previewUrl}
                alt={alt || "Uploaded photo"}
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                className="object-cover"
                unoptimized={state.previewUrl.startsWith("blob:")}
              />
            </div>
          )}
          {!state.isPdf && (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                Alt text
              </span>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                onBlur={onAltBlur}
                placeholder="Describe what's in the photo"
                className="form-input mt-1"
                maxLength={500}
              />
            </label>
          )}
          <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
            <span className="truncate font-mono">{state.key.slice(0, 60)}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openLibrary}
                className="font-semibold text-navy hover:text-rust-dark"
              >
                From library
              </button>
              <button
                type="button"
                onClick={onPick}
                className="font-semibold text-rust-dark hover:text-rust"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-3 rounded-md border-l-4 border-rust bg-rust-pale p-4 text-sm text-rust-dark">
          <p>
            <strong>Upload failed.</strong> {state.message}
          </p>
          <button
            type="button"
            onClick={() => setState({ kind: "idle" })}
            className="text-xs font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
      />

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onLibrarySelect}
      />
    </div>
  );
}

async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  // Use createImageBitmap when available (faster, no DOM), fall back
  // to an Image element.
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const out = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return out;
  }
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}

function PdfChip({
  fileName,
  muted,
}: {
  fileName?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-rule bg-cream px-4 py-3 ${muted ? "opacity-70" : ""}`}
    >
      <span className="grid size-10 place-items-center rounded-md bg-rust text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="truncate font-serif text-sm font-bold text-navy">
          {fileName ?? "Bulletin PDF"}
        </p>
        <p className="text-xs text-ink-3">
          {muted ? "Uploading…" : "PDF uploaded"}
        </p>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
