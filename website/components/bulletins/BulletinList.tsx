"use client";

import { useEffect, useId, useState } from "react";

export type BulletinRow = {
  id: string;
  weekOf: string;
  title: string | null;
  pageCount: number | null;
  pdfUrl: string | null;
};

/**
 * Public bulletin list. Clicking a row opens a modal viewer with an
 * iframe of the PDF so parishioners stay on-site. URL hash carries the
 * weekOf for deep-linking ("/bulletin#2026-04-27" opens that one).
 */
export function BulletinList({ bulletins }: { bulletins: BulletinRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();

  // Hash deep-link → open the matching bulletin.
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const found = bulletins.find((b) => b.weekOf === hash);
      if (found) setOpenId(found.id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [bulletins]);

  // Esc closes; lock body scroll while a modal is open.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openId]);

  const open = bulletins.find((b) => b.id === openId) ?? null;

  const openBulletin = (b: BulletinRow) => {
    setOpenId(b.id);
    window.history.replaceState(null, "", `#${b.weekOf}`);
  };
  const closeModal = () => {
    setOpenId(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (bulletins.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-white p-12 text-center">
        <p className="font-serif text-lg font-bold text-navy">
          No bulletins yet.
        </p>
        <p className="mt-2 text-sm text-ink-3">
          Once the parish office uploads the first one, it&rsquo;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
        {bulletins.map((b) => {
          const d = new Date(b.weekOf);
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => openBulletin(b)}
                disabled={!b.pdfUrl}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-cream disabled:opacity-60"
              >
                <div className="flex min-w-0 items-baseline gap-4">
                  <span className="hidden w-[80px] shrink-0 font-mono text-xs uppercase text-ink-3 sm:block">
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-base font-bold text-navy">
                      {b.title ??
                        d.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {d.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {b.pageCount ? ` · ${b.pageCount} pages` : ""}
                    </p>
                  </div>
                </div>
                <span aria-hidden="true" className="text-rust-dark">
                  →
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && open.pdfUrl && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy-dark/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
          >
            <header className="flex items-center justify-between gap-4 border-b border-rule bg-cream px-5 py-3">
              <div className="min-w-0">
                <p
                  id={titleId}
                  className="truncate font-serif text-base font-bold text-navy"
                >
                  {open.title ?? "Weekly Bulletin"}
                </p>
                <p className="text-xs text-ink-3">
                  {new Date(open.weekOf).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={open.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-pill border border-rule bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy"
                >
                  Open in new tab
                </a>
                <a
                  href={open.pdfUrl}
                  download
                  className="rounded-pill bg-rust px-3 py-1.5 text-xs font-semibold text-white hover:bg-rust-dark"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-2 text-ink-3 hover:bg-white"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </header>
            <div className="flex-1 bg-stone-100">
              <iframe
                src={open.pdfUrl}
                title={open.title ?? "Bulletin PDF"}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
