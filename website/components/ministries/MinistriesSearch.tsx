"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";

/**
 * Search box for /ministries — URL-synced via ?q= like the events
 * filters. The Server Component does the actual matching (with the
 * loose normalization in lib/search-normalize.ts); this island just
 * pushes the query into the URL as the visitor types.
 */
export function MinistriesSearch({ q }: { q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQ = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      const s = next.toString();
      start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  return (
    <form
      role="search"
      className={`relative w-full max-w-md ${pending ? "opacity-80" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (debounce.current) clearTimeout(debounce.current);
        const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
        pushQ(input.value);
      }}
    >
      <label htmlFor="ministries-search" className="sr-only">
        Search ministries
      </label>
      <input
        id="ministries-search"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search ministries…"
        onChange={(e) => {
          const value = e.currentTarget.value;
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(() => pushQ(value), 250);
        }}
        className="w-full rounded-pill border border-rule bg-white px-5 py-2.5 text-sm placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-rust/60"
      />
    </form>
  );
}
