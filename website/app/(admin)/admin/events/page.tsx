import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import {
  formatMonthShort,
  formatTimeOfDay,
  formatWeekdayShort,
  toDate,
} from "@/lib/dates";

export const metadata = { title: "Events · Admin" };

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
] as const;

export default async function AdminEventsList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";

  const where =
    status === "all"
      ? undefined
      : eq(events.status, status as "draft" | "published" | "archived");

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      startsAt: events.startsAt,
      status: events.status,
      isFeatured: events.isFeatured,
      audiences: events.audiences,
      updatedAt: events.updatedAt,
      lastEditedAt: events.lastEditedAt,
      lastEditedByName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(users.id, events.lastEditedBy))
    .where(where as never)
    .orderBy(desc(events.startsAt))
    .limit(200);

  // Counts for tab badges.
  const countsRaw = await db
    .select({
      status: events.status,
      n: sql<number>`count(*)::int`,
    })
    .from(events)
    .groupBy(events.status);
  const counts: Record<string, number> = {};
  let total = 0;
  for (const c of countsRaw) {
    counts[c.status] = c.n;
    total += c.n;
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Content</span>
          <h1 className="mt-2 text-3xl">Events</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New event
        </Link>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-rule" aria-label="Filter by status">
        {STATUS_TABS.map((t) => {
          const active = (status || "all") === t.key;
          const n = t.key === "all" ? total : (counts[t.key] ?? 0);
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/events" : `/admin/events?status=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-rust text-navy"
                  : "border-transparent text-ink-3 hover:text-navy"
              }`}
            >
              {t.label}
              <span className="ml-2 text-xs text-ink-4">{n}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Audience</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-ink-3"
                >
                  No events. <Link href="/admin/events/new" className="font-semibold text-rust-dark">Create one →</Link>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const d = toDate(r.startsAt);
                return (
                  <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                      <div className="font-mono text-xs text-ink-3">
                        {formatMonthShort(d)} {d.getDate()} · {formatWeekdayShort(d)}
                      </div>
                      <div className="text-xs text-ink-3">{formatTimeOfDay(d)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/events/${r.id}`}
                        className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                      >
                        {r.title}
                      </Link>
                      {r.isFeatured && (
                        <span className="ml-2 inline-block rounded-pill bg-gold/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy">
                          Featured
                        </span>
                      )}
                      <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                        /events/{r.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-2">
                      {(r.audiences ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-3">
                      {formatRelative(toDate(r.updatedAt))}
                      {r.lastEditedByName && (
                        <div className="text-[10px] text-ink-3/80">
                          by {r.lastEditedByName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "draft" | "published" | "archived" }) {
  const cls =
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-stone-100 text-stone-600";
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {status}
    </span>
  );
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day} day${day === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
