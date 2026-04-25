"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "I'm New", href: "/im-new" },
  { label: "Worship", href: "/mass" },
  { label: "Ministries", href: "/ministries" },
  { label: "Events", href: "/events" },
  { label: "Bulletin", href: "/bulletin" },
] as const;

const SCROLL_TRIGGER = 120;

/**
 * Two visual states:
 *  - **Hero overlay** (default on `/`): transparent, white text, sits absolutely
 *    over the homepage hero so the video shows behind the pill. Same layout
 *    as design-ref/assets/kit.css §MASTHEAD.
 *  - **Solid frosted** (after scroll OR on every interior page): fixed at top,
 *    navy-frosted, slides down. White text. Reads on cream/white interior pages.
 */
export function Header() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHomepage) return; // Interior pages stay solid — no listener needed.
    const onScroll = () => setScrolled(window.scrollY > SCROLL_TRIGGER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomepage]);

  // Initial state for the homepage is transparent-over-hero. After scrolling
  // past the trigger, OR on every other page, render the solid frosted look.
  const solid = !isHomepage || scrolled;

  return (
    <header
      className={
        solid
          ? "fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-navy/80 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-navy/65 animate-[slide-down_300ms_ease-out]"
          : "absolute inset-x-0 top-0 z-40"
      }
    >
      <div
        className={
          solid
            ? "mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-3 sm:px-8"
            : "mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-5 sm:px-8 sm:py-6"
        }
      >
        <Link
          href="/"
          className="font-serif text-lg font-bold tracking-tight text-white hover:text-gold"
        >
          Saint Helen
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                      (active
                        ? "bg-white/15 text-white"
                        : "text-white/90 hover:bg-white/10 hover:text-white")
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href="/give"
          className="inline-flex items-center rounded-full bg-rust px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Give
        </Link>
      </div>
    </header>
  );
}
