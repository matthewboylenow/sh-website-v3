"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISS_KEY = "sh.give-fab.dismissed.v1";
const SCROLL_THRESHOLD = 400;
const MOBILE_BREAKPOINT = 760;

/**
 * Mobile Give FAB — appears below 760 px after 400 px of scroll.
 * Dismissible; state persists for the session.
 * Never shown on /give.
 *
 * Contract from design-ref/pages/handoff.html §07 and design-notes §03.
 */
export function GiveFab() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }

    const check = () => {
      const narrow = window.innerWidth < MOBILE_BREAKPOINT;
      const scrolled = window.scrollY > SCROLL_THRESHOLD;
      setVisible(narrow && scrolled);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (pathname === "/give") return null;
  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 md:hidden">
      <Link
        href="/give"
        className="inline-flex items-center gap-2 rounded-pill bg-rust px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21.4l8.8-8.9a5.5 5.5 0 0 0 0-7.9z" />
        </svg>
        Give
      </Link>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="grid size-9 place-items-center rounded-full bg-white/95 text-ink-3 shadow-md"
        aria-label="Dismiss give button"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
