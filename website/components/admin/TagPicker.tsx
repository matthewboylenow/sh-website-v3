"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Chip-style multi-select. Each option in `options` is shown as a
 * toggleable pill. Selected pills become rust; unselected stay
 * outlined. The hidden input carries a comma-separated string so the
 * value rides through standard FormData submits.
 *
 * Usage:
 *   <TagPicker
 *     name="categories"
 *     options={taxonomies.eventCategories}
 *     defaultValue={defaultValues.categories ?? []}
 *   />
 */
export function TagPicker({
  name,
  options,
  defaultValue = [],
}: {
  name: string;
  options: readonly string[];
  defaultValue?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  const toggle = (v: string) =>
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v],
    );

  if (options.length === 0) {
    return (
      <p className="text-xs text-ink-3">
        No options yet — add some in{" "}
        <Link
          href="/admin/settings/taxonomies"
          className="font-semibold text-rust-dark hover:text-rust"
        >
          Settings → Taxonomies
        </Link>
        .
      </p>
    );
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(",")} />
      <ul className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <li key={opt}>
              <button
                type="button"
                onClick={() => toggle(opt)}
                aria-pressed={active}
                className={`rounded-pill border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  active
                    ? "border-rust bg-rust text-white"
                    : "border-rule bg-white text-ink-2 hover:border-rust"
                }`}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
