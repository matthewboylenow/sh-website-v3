import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";

export const metadata = { title: "Staff · Admin" };

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
] as const;

export default async function AdminStaffList({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const where =
    filter === "active"
      ? eq(staff.isActive, true)
      : filter === "inactive"
        ? eq(staff.isActive, false)
        : undefined;

  const rows = await db
    .select()
    .from(staff)
    .where(where as never)
    .orderBy(asc(staff.orderingPriority), asc(staff.name));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Content</span>
          <h1 className="mt-2 text-3xl">Staff</h1>
        </div>
        <Link
          href="/admin/staff/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New staff
        </Link>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-rule" aria-label="Filter">
        {TABS.map((t) => {
          const active = filter === t.key;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/staff" : `/admin/staff?filter=${t.key}`}
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
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink-3">
                  No staff. <Link href="/admin/staff/new" className="font-semibold text-rust-dark">Add one →</Link>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/staff/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {r.name}
                    </Link>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                      /staff/{r.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{r.role}</td>
                  <td className="px-4 py-3 text-xs text-ink-3">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-3">{r.orderingPriority}</td>
                  <td className="px-4 py-3">
                    {r.isActive ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-600">
                        Hidden
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
