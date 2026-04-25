"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Filter sidebar — URL-synced via searchParams. Server Component
 * does the actual filtering; this just pushes the chosen state into
 * the URL. Shared links preserve filter state.
 *
 * Audience and category options come from /admin/settings/taxonomies
 * via siteSettings — passed in by the Server Component parent.
 */
export function EventsFilters({
  audience,
  category,
  q,
  audienceOptions,
  categoryOptions,
}: {
  audience: string;
  category: string | null;
  q: string;
  audienceOptions: readonly string[];
  categoryOptions: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const pushWith = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      start(() => router.push(s ? `${pathname}?${s}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  return (
    <aside
      className={`sticky top-24 text-sm ${pending ? "opacity-80" : ""}`}
      aria-label="Event filters"
    >
      <form
        role="search"
        className="relative mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
          pushWith({ q: input.value.trim() });
        }}
      >
        <label htmlFor="events-search" className="sr-only">
          Search events
        </label>
        <input
          id="events-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search events…"
          className="w-full rounded-pill border border-rule bg-white px-4 py-2 text-sm placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-rust/60"
        />
      </form>

      <FilterGroup
        title="Audience"
        options={[
          { key: "all", label: "All audiences" },
          ...audienceOptions.map((k) => ({ key: k, label: prettify(k) })),
        ]}
        selected={audience}
        onSelect={(k) => pushWith({ audience: k })}
      />

      <FilterGroup
        title="Category"
        options={[
          { key: "all", label: "All categories" },
          ...categoryOptions.map((k) => ({ key: k, label: prettify(k) })),
        ]}
        selected={category ?? "all"}
        onSelect={(k) => pushWith({ category: k })}
      />

      <button
        type="button"
        onClick={() => pushWith({ audience: null, category: null, q: null })}
        className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-rust-dark hover:text-rust"
      >
        Reset filters
      </button>
    </aside>
  );
}

function prettify(key: string): string {
  return key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FilterGroup({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="mb-7">
      <h5 className="mb-3 border-b border-rule pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        {title}
      </h5>
      <ul className="space-y-0.5">
        {options.map((o) => {
          const active = o.key === selected;
          return (
            <li key={o.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(o.key)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[14px] transition-colors ${
                  active ? "bg-navy text-white" : "text-ink hover:bg-cream"
                }`}
              >
                <span>{o.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
