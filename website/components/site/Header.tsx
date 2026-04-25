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

const SCROLL_TIGHTEN = 80;

/**
 * Floating frosted pill — always visible, fixed at the top with breathing
 * room. Navy/85 background reads on the dark homepage hero AND on cream
 * interior pages, so we don't need a per-page tone variant. Tightens its
 * top-margin once the user scrolls past 80 px so it docks closer to the
 * viewport edge.
 */
export function Header() {
  const pathname = usePathname();
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > SCROLL_TIGHTEN);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "fixed inset-x-0 z-40 px-4 transition-[top] duration-300 ease-out sm:px-6 " +
        (docked ? "top-2" : "top-4")
      }
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/15 bg-navy/85 px-4 py-2 shadow-lg backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-navy/70 sm:px-5">
        <Link
          href="/"
          className="font-serif text-base font-bold tracking-tight text-white hover:text-gold sm:text-lg"
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
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                      (active
                        ? "bg-white/20 text-white"
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
          className="inline-flex items-center rounded-full bg-rust px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-5 sm:py-2"
        >
          Give
        </Link>
      </div>
    </header>
  );
}
