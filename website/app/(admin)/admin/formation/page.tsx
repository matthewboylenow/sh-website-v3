import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { FORMATION_CATEGORIES, formationPages } from "@/db/schema";

export const metadata = { title: "Formation · Admin" };

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
] as const;

const CATEGORY_LABEL: Record<(typeof FORMATION_CATEGORIES)[number], string> = {
  kids: "Kids",
  youth: "Youth",
  adults: "Adults",
  families: "Families",
};

export default async function AdminFormationList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";
  const where =
    status === "all"
      ? undefined
      : eq(formationPages.status, status as "draft" | "published" | "archived");

  const rows = await db
    .select({
      id: formationPages.id,
      slug: formationPages.slug,
      name: formationPages.name,
      category: formationPages.category,
      status: formationPages.status,
      orderingPriority: formationPages.orderingPriority,
      updatedAt: formationPages.updatedAt,
    })
    .from(formationPages)
    .where(where as never)
    .orderBy(asc(formationPages.orderingPriority), desc(formationPages.updatedAt))
    .limit(200);

  const countsRaw = await db
    .select({ status: formationPages.status, n: sql<number>`count(*)::int` })
    .from(formationPages)
    .groupBy(formationPages.status);
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
          <h1 className="mt-2 text-3xl">Formation</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Religious-ed pages — kids, youth, adults, families. Lives at <code>/formation</code>.
          </p>
        </div>
        <Link
          href="/admin/formation/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New page
        </Link>
      </header>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-rule">
        {STATUS_TABS.map((tab) => {
          const n = tab.key === "all" ? total : (counts[tab.key] ?? 0);
          const active = status === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/admin/formation" : `/admin/formation?status=${tab.key}`}
              className={
                "rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-rule bg-cream text-navy"
                  : "border-transparent text-ink-3 hover:text-navy")
              }
            >
              {tab.label} <span className="text-[11px] text-ink-3">({n})</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-0 overflow-x-auto rounded-b-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-3">
                  No formation pages in this view.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/formation/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {r.name}
                    </Link>
                    <div className="font-mono text-[11px] text-ink-3">/{r.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2">
                    {CATEGORY_LABEL[r.category]}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-3">{r.orderingPriority}</td>
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
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {status}
    </span>
  );
}
