"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Redirect } from "@/db/schema";
import { saveRedirectsAction } from "./_actions";

export function RedirectsEditor({ initial }: { initial: Redirect[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Redirect[]>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateAt = (i: number, patch: Partial<Redirect>) =>
    setItems((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeAt = (i: number) =>
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  const add = () =>
    setItems((cur) => [...cur, { from: "", to: "", permanent: false }]);

  const onSave = () => {
    setError(null);
    setSaved(false);
    const cleaned = items
      .map((r) => ({
        from: r.from.trim(),
        to: r.to.trim(),
        permanent: !!r.permanent,
      }))
      .filter((r) => r.from || r.to); // drop fully-empty rows

    start(async () => {
      const r = await saveRedirectsAction({ items: cleaned });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setItems(cleaned);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-cream/40 px-6 py-12 text-center text-sm text-ink-3">
          No redirects yet. Add one to start.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r, i) => (
            <li
              key={i}
              className="grid items-center gap-2 rounded-md border border-rule bg-white p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  From (path on this site)
                </label>
                <input
                  type="text"
                  value={r.from}
                  maxLength={500}
                  placeholder="/youth"
                  onChange={(e) => updateAt(i, { from: e.target.value })}
                  className="form-input font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  To (path or full URL)
                </label>
                <input
                  type="text"
                  value={r.to}
                  maxLength={1000}
                  placeholder="/ministries/youth-ministry"
                  onChange={(e) => updateAt(i, { to: e.target.value })}
                  className="form-input font-mono text-sm"
                />
              </div>
              <label
                className="flex items-center gap-2 text-xs text-ink-2"
                title="308 (Permanent). Use sparingly — search engines memoize permanent redirects."
              >
                <input
                  type="checkbox"
                  checked={!!r.permanent}
                  onChange={(e) => updateAt(i, { permanent: e.target.checked })}
                  className="size-4"
                />
                Permanent
              </label>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-rust-dark hover:border-rust"
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        className="rounded-pill border border-rule bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy"
      >
        + Add redirect
      </button>

      <div className="sticky bottom-0 -mx-4 border-t border-rule bg-white/95 p-4 backdrop-blur sm:-mx-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-pill bg-rust px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save redirects"}
          </button>
          {error && (
            <span className="text-sm font-semibold text-rust-dark">{error}</span>
          )}
          {saved && !error && (
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Saved.
            </span>
          )}
          <span className="ml-auto text-xs text-ink-3">{items.length}/500</span>
        </div>
      </div>
    </div>
  );
}
