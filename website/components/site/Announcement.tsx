"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import type { Announcement, AnnouncementAccent } from "@/db/schema";

/**
 * Site-wide announcement — slide-in (bottom-right) or modal (full-screen).
 * Server fetches the highest-priority active row and passes the resolved
 * data here. Dismissals persist via localStorage with a TTL keyed by
 * announcement id.
 *
 * Ported from the WordPress wp_footer slide-in. Tailwind classes replace
 * the !important-stacked inline styles; visual feel is the same.
 */

type AnnouncementProps = {
  data: Announcement;
  imageUrl?: string | null;
  /** Pre-sanitized HTML for the body. Computed server-side. */
  bodyHtml?: string | null;
};

export function SiteAnnouncement(props: AnnouncementProps) {
  return props.data.kind === "modal" ? (
    <AnnouncementModal {...props} />
  ) : (
    <AnnouncementSlideIn {...props} />
  );
}

/* -------------------------------------------------------------- */
/* Dismissal hook — localStorage with TTL                          */
/* -------------------------------------------------------------- */

function useDismissed(id: string, dismissDays: number): {
  dismissed: boolean;
  dismiss: () => void;
} {
  const [dismissed, setDismissed] = useState<boolean>(true); // SSR-safe default
  const storageKey = `sh_announcement_dismissed_${id}`;

  useEffect(() => {
    // Read on mount (client-only).
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(false);
        return;
      }
      // Session-only mode: any value means dismissed for the session.
      if (dismissDays === 0) {
        // sessionStorage handles the "session only" case automatically.
        const sess = window.sessionStorage.getItem(storageKey);
        setDismissed(sess === "1");
        return;
      }
      const parsed = JSON.parse(raw) as { at?: number };
      if (typeof parsed.at !== "number") {
        setDismissed(false);
        return;
      }
      const ttlMs = dismissDays * 86_400_000;
      const expired = Date.now() - parsed.at > ttlMs;
      setDismissed(!expired);
      if (expired) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
    } catch {
      setDismissed(false);
    }
  }, [storageKey, dismissDays]);

  const dismiss = () => {
    setDismissed(true);
    try {
      if (dismissDays === 0) {
        window.sessionStorage.setItem(storageKey, "1");
      } else {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ at: Date.now() }),
        );
      }
    } catch {
      // localStorage might be blocked; fall back to in-memory only.
    }
  };

  return { dismissed, dismiss };
}

/* -------------------------------------------------------------- */
/* Accent helpers                                                   */
/* -------------------------------------------------------------- */

const ACCENT_CONFIG: Record<
  AnnouncementAccent,
  { border: string; tint: string; ribbonBg: string; ribbonDot: string; cta: string }
> = {
  navy: {
    border: "border-t-navy",
    tint: "bg-navy/10 text-navy",
    ribbonBg: "bg-navy/10 text-navy",
    ribbonDot: "bg-navy",
    cta: "bg-navy text-cream hover:bg-rust",
  },
  rust: {
    border: "border-t-rust",
    tint: "bg-rust/10 text-rust-dark",
    ribbonBg: "bg-rust/10 text-rust-dark",
    ribbonDot: "bg-rust-dark",
    cta: "bg-rust text-white hover:bg-rust-dark",
  },
  gold: {
    border: "border-t-gold",
    tint: "bg-gold/15 text-navy",
    ribbonBg: "bg-gold/20 text-navy",
    ribbonDot: "bg-navy",
    cta: "bg-navy text-cream hover:bg-rust",
  },
};

/* -------------------------------------------------------------- */
/* Card body — shared between slide-in and modal                   */
/* -------------------------------------------------------------- */

function CardBody({
  data,
  imageUrl,
  bodyHtml,
  onClose,
}: AnnouncementProps & { onClose: () => void }) {
  const accent = ACCENT_CONFIG[data.accent];
  const isExternal =
    !!data.ctaHref && (data.ctaHref.startsWith("http://") || data.ctaHref.startsWith("https://"));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-t-4 bg-cream shadow-xl ${accent.border}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notice"
        className="absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-full bg-transparent text-navy transition-[background-color,transform] duration-200 hover:rotate-90 hover:bg-navy/8"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {imageUrl && (
        <div className="relative h-32 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- announcement image */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-40px] top-[-40px] size-[140px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(31,52,109,0.12), transparent 70%)",
        }}
      />

      <div className="relative px-6 pb-6 pt-7">
        {data.ribbon && (
          <span
            className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${accent.ribbonBg}`}
          >
            <span className={`inline-block size-1.5 rounded-full ${accent.ribbonDot}`} />
            {data.ribbon}
          </span>
        )}

        <h3 className="font-serif text-[22px] font-bold leading-[1.25] text-navy">
          {data.title}
        </h3>

        {bodyHtml && (
          <div
            className="mt-2.5 text-[14.5px] leading-[1.6] text-navy/[0.88]"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        {data.dateRows.length > 0 && (
          <div className="mt-3.5 rounded border-l-[3px] border-gold bg-navy/[0.06] px-3 py-2.5">
            <ul className="space-y-1">
              {data.dateRows.map((row, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-2 text-[13px] leading-snug text-navy"
                >
                  <span className="whitespace-nowrap font-bold">{row.label}</span>
                  <span className="opacity-[0.82]">· {row.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.ctaLabel && data.ctaHref && (
          <a
            href={data.ctaHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={`mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-[0.02em] shadow-sm transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md ${accent.cta}`}
          >
            {data.ctaLabel}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Slide-in (bottom-right)                                          */
/* -------------------------------------------------------------- */

function AnnouncementSlideIn(props: AnnouncementProps) {
  const { data } = props;
  const { dismissed, dismiss } = useDismissed(data.id, data.dismissDays);
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show after delay (default 2.5s). Skip when prefers-reduced-motion.
  useEffect(() => {
    if (dismissed || removed) return;
    const delayMs = Math.max(0, Number(data.showDelaySeconds) * 1000);
    timer.current = setTimeout(() => setVisible(true), delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dismissed, removed, data.showDelaySeconds]);

  if (dismissed || removed) return null;

  const onClose = () => {
    setVisible(false);
    // Match the leave-transition duration before unmounting.
    setTimeout(() => {
      setRemoved(true);
      dismiss();
    }, 600);
  };

  return (
    <div
      role="complementary"
      aria-label={data.title}
      className={
        "fixed bottom-6 right-6 z-[60] w-[calc(100%-3rem)] max-w-[380px] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none " +
        (visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[140%] opacity-0")
      }
    >
      <CardBody {...props} onClose={onClose} />
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Modal (full-screen) — for closures and major notices             */
/* -------------------------------------------------------------- */

function AnnouncementModal(props: AnnouncementProps) {
  const { data } = props;
  const { dismissed, dismiss } = useDismissed(data.id, data.dismissDays);
  const [visible, setVisible] = useState(false);
  const [removed, setRemoved] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (dismissed || removed) return;
    const delayMs = Math.max(0, Number(data.showDelaySeconds) * 1000);
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [dismissed, removed, data.showDelaySeconds]);

  // Body-scroll lock + Escape close while visible.
  useEffect(() => {
    if (!visible) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (dismissed || removed) return null;

  const onClose = () => {
    setVisible(false);
    setTimeout(() => {
      setRemoved(true);
      dismiss();
    }, 250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      className={
        "fixed inset-0 z-[60] flex items-center justify-center px-4 transition-opacity duration-200 motion-reduce:transition-none " +
        (visible ? "opacity-100" : "pointer-events-none opacity-0")
      }
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div
        className={
          "relative w-full max-w-md transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none " +
          (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")
        }
      >
        {/* Forward the close button ref into the card */}
        <CardBody
          {...props}
          onClose={() => {
            // The card's own close button calls this; tunnel through.
            onClose();
          }}
        />
        {/* Hidden initial-focus target */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="sr-only"
          tabIndex={-1}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Server helper — sanitize body once, on the server               */
/* -------------------------------------------------------------- */

export function prepareAnnouncementBody(html: string | null | undefined): string | null {
  if (!html) return null;
  const trimmed = html.trim();
  if (!trimmed) return null;
  return sanitizeHtml(trimmed);
}
