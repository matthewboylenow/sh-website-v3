import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ministries } from "@/db/schema";

export const metadata = { title: "Ministries · Admin" };

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
] as const;

export default async function AdminMinistriesList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";
  const where =
    status === "all"
      ? undefined
      : eq(ministries.status, status as "draft" | "published" | "archived");

  const rows = await db
    .select({
      id: ministries.id,
      slug: ministries.slug,
      name: ministries.name,
      tagline: ministries.tagline,
      category: ministries.category,
      status: ministries.status,
      orderingPriority: ministries.orderingPriority,
      isAcceptingNew: ministries.isAcceptingNew,
    })
    .from(ministries)
    .where(where as never)
    .orderBy(asc(ministries.orderingPriority), asc(ministries.name))
    .limit(500);

  const countsRaw = await db
    .select({ status: ministries.status, n: sql<number>`count(*)::int` })
    .from(ministries)
    .groupBy(ministries.status);
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
          <h1 className="mt-2 text-3xl">Ministries</h1>
        </div>
        <Link
          href="/admin/ministries/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New ministry
        </Link>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-rule" aria-label="Status">
        {STATUS_TABS.map((t) => {
          const active = (status || "all") === t.key;
          const n = t.key === "all" ? total : (counts[t.key] ?? 0);
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/ministries" : `/admin/ministries?status=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "border-rust text-navy" : "border-transparent text-ink-3 hover:text-navy"
              }`}
            >
              {t.label} <span className="ml-2 text-xs text-ink-4">{n}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Open</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink-3">
                  No ministries.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/ministries/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {r.name}
                    </Link>
                    {r.tagline && (
                      <div className="mt-0.5 text-xs text-ink-3">{r.tagline}</div>
                    )}
                    <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                      /ministries/{r.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-ink-2">
                    {r.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-3">
                    {r.orderingPriority}
                  </td>
                  <td className="px-4 py-3">
                    {r.isAcceptingNew ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-600">
                        Closed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
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

function StatusPill({ status }: { status: "draft" | "published" | "archived" }) {
  const cls =
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-stone-100 text-stone-600";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${cls}`}>
      {status}
    </span>
  );
}
