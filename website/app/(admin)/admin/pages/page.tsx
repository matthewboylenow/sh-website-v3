import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";

export const metadata = { title: "Pages · Admin" };

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
] as const;

export default async function AdminPagesList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";

  const where =
    status === "all"
      ? undefined
      : eq(pages.status, status as "draft" | "published" | "archived");

  const rows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      summary: pages.summary,
      status: pages.status,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(where as never)
    .orderBy(desc(pages.updatedAt))
    .limit(200);

  const countsRaw = await db
    .select({ status: pages.status, n: sql<number>`count(*)::int` })
    .from(pages)
    .groupBy(pages.status);
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
          <h1 className="mt-2 text-3xl">Pages</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Free-form CMS pages built with the block editor. Live at{" "}
            <code>/p/&lt;slug&gt;</code>.
          </p>
        </div>
        <Link
          href="/admin/pages/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New page
        </Link>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-rule" aria-label="Filter by status">
        {STATUS_TABS.map((t) => {
          const active = (status || "all") === t.key;
          const n = t.key === "all" ? total : (counts[t.key] ?? 0);
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/pages" : `/admin/pages?status=${t.key}`}
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
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">URL</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-3">
                  No pages.{" "}
                  <Link href="/admin/pages/new" className="font-semibold text-rust-dark">
                    Create one →
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pages/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {r.title}
                    </Link>
                    {r.summary && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-ink-3">
                        {r.summary}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-3">
                    /p/{r.slug}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-3">
                    {new Date(r.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
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
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {status}
    </span>
  );
}
