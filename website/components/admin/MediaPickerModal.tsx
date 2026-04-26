"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listMediaAssets, type MediaListItem } from "@/lib/server/media-list";

/**
 * Modal media picker. Triggered from PhotoUploader / SectionImagePicker
 * via a "Pick from library" button. Lists blob_assets newest-first with
 * a search bar and Load-more pagination. Click an item → onSelect →
 * closes.
 */
export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  /** Optional initial filter — e.g. "ministries" to bias toward existing
   *  ministry photos when opened from a ministry editor. */
  initialQuery = "",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: { key: string; url: string; alt: string | null }) => void;
  initialQuery?: string;
}) {
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pending, start] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Body-scroll lock + Escape close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Initial + search-debounced fetch.
  useEffect(() => {
    if (!open) return;
    setError(null);
    const handle = setTimeout(() => {
      start(async () => {
        try {
          const r = await listMediaAssets({ q: query, cursor: null });
          setItems(r.items);
          setCursor(r.nextCursor);
          setHasMore(r.nextCursor !== null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });
    }, query === initialQuery ? 0 : 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const loadMore = () => {
    if (!cursor || pending) return;
    start(async () => {
      const r = await listMediaAssets({ q: query, cursor });
      setItems((cur) => [...cur, ...r.items]);
      setCursor(r.nextCursor);
      setHasMore(r.nextCursor !== null);
    });
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      <button
        type="button"
        aria-label="Close media picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-rule bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-navy">Media library</h2>
            <p className="text-xs text-ink-3">
              Pick an existing image instead of uploading a new one.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-rule bg-white px-2 py-1 text-xs font-semibold text-ink-2 hover:border-navy"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-rule px-5 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by key, alt text, caption…"
            className="form-input"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <p className="mb-3 rounded-md border-l-4 border-rust bg-rust-pale px-3 py-2 text-sm text-rust-dark">
              {error}
            </p>
          )}
          {items.length === 0 && !pending ? (
            <p className="rounded-md border border-dashed border-rule bg-cream/40 px-4 py-12 text-center text-sm text-ink-3">
              {query
                ? `No assets match "${query}".`
                : "No assets uploaded yet."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => {
                const isPdf = item.mimeType === "application/pdf";
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() =>
                        onSelect({ key: item.key, url: item.url, alt: item.alt })
                      }
                      className="group block w-full overflow-hidden rounded-md border border-rule bg-cream/40 text-left transition-all hover:-translate-y-0.5 hover:border-navy hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                      title={item.key}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-cream">
                        {isPdf ? (
                          <div className="grid h-full place-items-center text-ink-3">
                            <span className="text-xs font-semibold">PDF</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- admin picker preview
                          <img
                            src={item.url}
                            alt={item.alt ?? ""}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="space-y-0.5 p-2 text-[11px]">
                        <p
                          className="truncate font-mono text-ink-3"
                          title={item.key}
                        >
                          {item.key.split("/").pop() ?? item.key}
                        </p>
                        {item.alt && (
                          <p className="truncate text-ink-2">{item.alt}</p>
                        )}
                        <p className="text-ink-3">
                          {item.width && item.height
                            ? `${item.width}×${item.height}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {pending && (
            <p className="mt-4 text-center text-xs text-ink-3">Loading…</p>
          )}
          {hasMore && !pending && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-pill border border-rule bg-white px-4 py-1.5 text-xs font-semibold text-navy hover:border-navy"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
