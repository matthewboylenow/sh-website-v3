"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ICON_CATALOG,
  ICON_GROUPS,
  type IconCatalogEntry,
} from "@/lib/icon-catalog";
import { IconRender } from "@/components/site/IconRender";

/**
 * Admin control: shows current icon (or empty slot), opens a searchable
 * modal to pick from the curated catalog. `value` is the lucide name.
 * Pass `null` from onChange to clear.
 */
export function IconPickerButton({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex size-12 items-center justify-center rounded-md border border-rule bg-white text-navy hover:border-navy"
            aria-label={value ? `Change icon (currently ${value})` : "Pick an icon"}
          >
            {value ? (
              <IconRender name={value} size={24} />
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                Icon
              </span>
            )}
          </button>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
            >
              {value ? "Change icon" : "Pick an icon"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="block text-[11px] text-rust-dark hover:text-rust"
              >
                Remove icon
              </button>
            )}
          </div>
        </div>
        {value && (
          <p className="text-[11px] text-ink-3">
            Icon overrides image when set.
          </p>
        )}
      </div>
      {open && (
        <IconPickerModal
          value={value ?? null}
          onSelect={(name) => {
            onChange(name);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function IconPickerModal({
  value,
  onSelect,
  onClose,
}: {
  value: string | null;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("");
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
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
  }, [onClose]);

  const filtered = useMemo<IconCatalogEntry[]>(() => {
    const q = query.trim().toLowerCase();
    return ICON_CATALOG.filter((entry) => {
      if (group && entry.group !== group) return false;
      if (!q) return true;
      if (entry.name.toLowerCase().includes(q)) return true;
      if (entry.label.toLowerCase().includes(q)) return true;
      return entry.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [query, group]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close icon picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-rule bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-navy">Pick an icon</h2>
            <p className="text-xs text-ink-3">
              {ICON_CATALOG.length} icons curated for parish life — search by what
              you mean (e.g. &ldquo;welcome&rdquo;, &ldquo;youth&rdquo;, &ldquo;baptism&rdquo;,
              &ldquo;coffee&rdquo;).
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

        <div className="grid gap-2 border-b border-rule px-5 py-3 sm:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons by name, label, or tag…"
            className="form-input"
            autoFocus
          />
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="form-input"
          >
            <option value="">All groups</option>
            {ICON_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <p className="rounded-md border border-dashed border-rule bg-cream/40 px-4 py-12 text-center text-sm text-ink-3">
              No icons match &ldquo;{query}&rdquo;. Try another word.
            </p>
          ) : (
            <ul
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
            >
              {filtered.map((entry) => {
                const active = entry.name === value;
                return (
                  <li key={entry.name}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry.name)}
                      title={`${entry.label} · ${entry.tags.join(", ")}`}
                      className={
                        "flex w-full flex-col items-center gap-1 rounded-md border bg-white px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-navy hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust " +
                        (active
                          ? "border-rust ring-2 ring-rust/30"
                          : "border-rule")
                      }
                    >
                      <span className="text-navy">
                        <IconRender name={entry.name} size={24} />
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-tight text-ink-2">
                        {entry.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-rule bg-cream/40 px-5 py-3 text-xs text-ink-3">
          <span>
            Showing {filtered.length} of {ICON_CATALOG.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-rule bg-white px-3 py-1 font-semibold text-navy hover:border-navy"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
