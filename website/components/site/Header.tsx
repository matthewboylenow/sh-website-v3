"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_NAV_MANIFEST, type NavItem, type NavManifest } from "@/db/schema";

const SCROLL_TIGHTEN = 80;

/**
 * Floating frosted pill — fixed at the top with breathing room. Reads
 * NavManifest from siteSettings (passed in from the server layout) so
 * admins can edit nav items + mega-menus at /admin/settings/navigation.
 *
 * Logo: when siteSettings.logoBlobKey is set, the brand slot renders an
 * <img> auto-scaled to ~32-36px tall. Otherwise falls back to the
 * "Saint Helen" wordmark.
 *
 * Mobile (< md): the desktop nav hides, a hamburger button appears, and
 * tapping it opens a slide-in drawer with all nav items (mega-menu
 * sections flattened into single-level link groups).
 */
export function Header({
  nav,
  logoUrl,
  logoAlt = "Saint Helen",
}: {
  nav?: NavManifest;
  logoUrl?: string | null;
  logoAlt?: string;
}) {
  const pathname = usePathname();
  const [docked, setDocked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > SCROLL_TIGHTEN);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const items = nav?.items?.length ? nav.items : DEFAULT_NAV_MANIFEST.items;

  return (
    <>
      <header
        className={
          "fixed inset-x-0 z-40 px-4 transition-[top] duration-300 ease-out sm:px-6 " +
          (docked ? "top-2" : "top-4")
        }
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/15 bg-navy/85 px-4 py-2 shadow-lg backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-navy/70 sm:px-5">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-gold">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- header logo, sized below LCP threshold
              <img
                src={logoUrl}
                alt={logoAlt}
                className="block h-8 w-auto sm:h-9"
              />
            ) : (
              <span className="font-serif text-base font-bold tracking-tight sm:text-lg">
                Saint Helen
              </span>
            )}
          </Link>

          <nav className="hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((item, idx) => (
                <NavTopItem key={`${item.href}-${idx}`} item={item} pathname={pathname} />
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/give"
              className="inline-flex items-center rounded-full bg-rust px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-5 sm:py-2"
            >
              Give
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 md:hidden"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={items}
        pathname={pathname}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
      />
    </>
  );
}

function NavTopItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLLIElement | null>(null);

  const active =
    pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
  const hasMega = !!item.mega && item.mega.sections.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const baseLink =
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
  const activeLink = "bg-white/20 text-white";
  const idleLink = "text-white/90 hover:bg-white/10 hover:text-white";

  if (!hasMega) {
    return (
      <li>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`${baseLink} ${active ? activeLink : idleLink}`}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
        className={`${baseLink} inline-flex items-center gap-1 ${active ? activeLink : idleLink}`}
      >
        {item.label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l3 3 3-3" />
        </svg>
      </button>
      {open && item.mega && <MegaPanel mega={item.mega} onClose={() => setOpen(false)} />}
    </li>
  );
}

function MegaPanel({
  mega,
  onClose,
}: {
  mega: NonNullable<NavItem["mega"]>;
  onClose: () => void;
}) {
  return (
    <div
      role="menu"
      className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-rule bg-white p-6 shadow-[0_30px_60px_rgba(15,26,53,0.28),0_10px_20px_rgba(15,26,53,0.14)]"
    >
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l border-t border-rule bg-white"
      />
      <div
        className={
          "grid gap-7 " +
          (mega.feature
            ? mega.sections.length === 1
              ? "grid-cols-1 sm:grid-cols-[1fr_1.1fr]"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.1fr]"
            : mega.sections.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2")
        }
      >
        {mega.sections.map((s, i) => (
          <div key={`${s.heading}-${i}`}>
            <h6 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-rust-dark">
              {s.heading}
            </h6>
            <ul className="space-y-1">
              {s.links.map((l, j) => (
                <li key={`${l.href}-${j}`}>
                  <Link
                    href={l.href}
                    onClick={onClose}
                    className="block rounded-md px-1 py-1.5 text-sm text-ink transition-[color,padding] hover:pl-2 hover:text-rust-dark"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {mega.feature && (
          <Link
            href={mega.feature.ctaHref}
            onClick={onClose}
            className="relative flex flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-navy via-navy to-rust p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_30%_30%,rgba(212,175,55,0.28),transparent_60%)]"
            />
            <div className="relative">
              {mega.feature.tag && (
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] opacity-85">
                  {mega.feature.tag}
                </span>
              )}
              <p className="mt-1 font-serif text-lg font-bold leading-tight text-white">
                {mega.feature.title}
              </p>
              {mega.feature.body && (
                <p className="mt-1.5 text-[13px] leading-snug text-white/85">
                  {mega.feature.body}
                </p>
              )}
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white">
                {mega.feature.ctaLabel}
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  items,
  pathname,
  logoUrl,
  logoAlt,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  logoUrl?: string | null;
  logoAlt: string;
}) {
  // Lock body scroll while open; trap focus on the close button initially.
  const closeRef = useRef<HTMLButtonElement | null>(null);
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

  if (!open) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <div
      id="mobile-nav"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      className="fixed inset-0 z-50 md:hidden"
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-navy text-white shadow-2xl sh-on-dark">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-navy/95 px-5 py-4 backdrop-blur">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2 hover:text-gold"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- mobile drawer logo
              <img src={logoUrl} alt={logoAlt} className="h-8 w-auto" />
            ) : (
              <span className="font-serif text-base font-bold">Saint Helen</span>
            )}
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <svg
              width="18"
              height="18"
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

        <nav className="flex-1 px-5 py-6">
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={`${item.href}-${i}`}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={
                    "block rounded-lg px-3 py-2 font-serif text-lg font-bold transition-colors " +
                    (isActive(item.href)
                      ? "bg-white/15 text-white"
                      : "text-white hover:bg-white/10")
                  }
                >
                  {item.label}
                </Link>

                {item.mega && item.mega.sections.length > 0 && (
                  <div className="mt-1 space-y-3 border-l border-white/15 pl-4">
                    {item.mega.sections.map((s, si) => (
                      <div key={`${s.heading}-${si}`}>
                        <h6 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                          {s.heading}
                        </h6>
                        <ul className="mt-1.5 space-y-0.5">
                          {s.links.map((l, li) => (
                            <li key={`${l.href}-${li}`}>
                              <Link
                                href={l.href}
                                onClick={onClose}
                                className="block rounded-md px-2 py-1 text-sm text-white/85 hover:bg-white/10 hover:text-white"
                              >
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {item.mega.feature && (
                      <Link
                        href={item.mega.feature.ctaHref}
                        onClick={onClose}
                        className="block rounded-md px-2 py-1.5 text-sm font-semibold text-gold hover:bg-white/10"
                      >
                        {item.mega.feature.ctaLabel} →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <Link
            href="/give"
            onClick={onClose}
            className="mt-8 inline-flex w-full items-center justify-center rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
          >
            Give
          </Link>
        </nav>
      </div>
    </div>
  );
}
