import Link from "next/link";
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { massTimes, staff } from "@/db/schema";

export const metadata = { title: "Mass times · Admin" };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TABS = [
  { key: "weekly", label: "Weekly" },
  { key: "overrides", label: "One-off overrides" },
] as const;

export default async function AdminMassTimesList({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "overrides" ? "overrides" : "weekly";

  const where = view === "weekly" ? isNull(massTimes.overrideDate) : undefined;

  const rows = await db
    .select({
      id: massTimes.id,
      dayOfWeek: massTimes.dayOfWeek,
      time: massTimes.time,
      kind: massTimes.kind,
      label: massTimes.label,
      isActive: massTimes.isActive,
      overrideDate: massTimes.overrideDate,
      overrideKind: massTimes.overrideKind,
      presiderName: staff.name,
    })
    .from(massTimes)
    .leftJoin(staff, eq(massTimes.presiderId, staff.id))
    .where(where as never)
    .orderBy(
      asc(massTimes.overrideDate),
      asc(massTimes.dayOfWeek),
      asc(massTimes.time),
    );

  // For overrides view, exclude the weekly rows that snuck in.
  const filtered =
    view === "overrides" ? rows.filter((r) => r.overrideDate !== null) : rows;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Content</span>
          <h1 className="mt-2 text-3xl">Mass times</h1>
        </div>
        <Link
          href="/admin/mass-times/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New
        </Link>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-rule" aria-label="View">
        {TABS.map((t) => {
          const active = view === t.key;
          return (
            <Link
              key={t.key}
              href={t.key === "weekly" ? "/admin/mass-times" : `/admin/mass-times?view=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "border-rust text-navy" : "border-transparent text-ink-3 hover:text-navy"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              {view === "weekly" ? <th className="px-4 py-3 font-semibold">Day</th> : <th className="px-4 py-3 font-semibold">Date</th>}
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Presider</th>
              <th className="px-4 py-3 font-semibold">Label / Notes</th>
              <th className="px-4 py-3 font-semibold">Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-3">
                  {view === "weekly"
                    ? "No weekly Masses yet."
                    : "No one-off overrides scheduled."}{" "}
                  <Link href="/admin/mass-times/new" className="font-semibold text-rust-dark">
                    Add one →
                  </Link>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                    {view === "weekly"
                      ? r.dayOfWeek != null
                        ? DOW[r.dayOfWeek]
                        : "—"
                      : r.overrideDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">
                    <Link
                      href={`/admin/mass-times/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {prettyTime(r.time)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-ink-2">
                    {r.kind.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2">
                    {r.presiderName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2">
                    {r.label ??
                      (r.overrideKind ? `Override · ${r.overrideKind}` : "—")}
                  </td>
                  <td className="px-4 py-3">
                    {r.isActive ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-600">
                        Off
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function prettyTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}:00 ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
