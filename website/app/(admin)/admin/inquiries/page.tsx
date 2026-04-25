import Link from "next/link";
import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { INQUIRY_STATUSES, inquiries, ministries } from "@/db/schema";
import { toDate } from "@/lib/dates";
import { visibleMinistryFilter } from "./_actions";

export const metadata = { title: "Inquiries · Admin" };

const STATUS_FILTERS = ["open", "all", ...INQUIRY_STATUSES] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_LABELS: Record<(typeof INQUIRY_STATUSES)[number], string> = {
  new: "New",
  contacted: "Contacted",
  joined: "Joined",
  declined: "Declined",
  stuck: "Stuck",
};

const STATUS_PILL: Record<(typeof INQUIRY_STATUSES)[number], string> = {
  new: "bg-rust-pale text-rust-dark",
  contacted: "bg-amber-50 text-amber-700",
  joined: "bg-emerald-50 text-emerald-700",
  declined: "bg-stone-100 text-stone-600",
  stuck: "bg-rose-50 text-rose-700",
};

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; ministry?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/inquiries");

  const { status, q, ministry } = await searchParams;
  const statusFilter: StatusFilter = (STATUS_FILTERS as readonly string[]).includes(
    status ?? "",
  )
    ? (status as StatusFilter)
    : "open";

  const scope = await visibleMinistryFilter();
  if (scope.kind === "none") redirect("/admin");

  const whereClauses: SQL<unknown>[] = [];
  if (scope.kind === "scope") {
    whereClauses.push(inArray(inquiries.ministryId, scope.ministryIds));
  }
  if (statusFilter === "open") {
    whereClauses.push(inArray(inquiries.status, ["new", "contacted", "stuck"]));
  } else if (statusFilter !== "all") {
    whereClauses.push(eq(inquiries.status, statusFilter));
  }
  if (ministry) whereClauses.push(eq(inquiries.ministryId, ministry));
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    const search = or(
      ilike(inquiries.name, term),
      ilike(inquiries.email, term),
      ilike(inquiries.message, term),
    );
    if (search) whereClauses.push(search);
  }

  const whereExpr =
    whereClauses.length === 0
      ? undefined
      : whereClauses.length === 1
        ? whereClauses[0]
        : and(...whereClauses);

  const baseQuery = db
    .select({
      id: inquiries.id,
      kind: inquiries.kind,
      name: inquiries.name,
      email: inquiries.email,
      phone: inquiries.phone,
      status: inquiries.status,
      createdAt: inquiries.createdAt,
      ministryId: inquiries.ministryId,
      ministryName: ministries.name,
      ministrySlug: ministries.slug,
    })
    .from(inquiries)
    .innerJoin(ministries, eq(inquiries.ministryId, ministries.id));

  const rowsQuery = whereExpr ? baseQuery.where(whereExpr) : baseQuery;
  const rows = await rowsQuery.orderBy(desc(inquiries.createdAt)).limit(200);

  const ministryOptions =
    scope.kind === "all"
      ? await db
          .select({ id: ministries.id, name: ministries.name })
          .from(ministries)
          .orderBy(ministries.name)
      : await db
          .select({ id: ministries.id, name: ministries.name })
          .from(ministries)
          .where(inArray(ministries.id, scope.ministryIds))
          .orderBy(ministries.name);

  return (
    <div>
      <header>
        <span className="sh-eyebrow">Pipeline</span>
        <h1 className="mt-2 text-3xl">Inquiries</h1>
        <p className="sh-lede mt-2 text-[15px]">
          Every Join / Inquire / Volunteer submission from the public site.
          Click a row to add notes, update status, or hand off to another lead.
        </p>
      </header>

      <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Status
          </label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="form-input min-w-[140px]"
          >
            <option value="open">Open (new + contacted + stuck)</option>
            <option value="all">All</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {ministryOptions.length > 1 && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Ministry
            </label>
            <select name="ministry" defaultValue={ministry ?? ""} className="form-input min-w-[200px]">
              <option value="">All ministries</option>
              {ministryOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Search
          </label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, email, or message…"
            className="form-input w-full"
          />
        </div>
        <button
          type="submit"
          className="rounded-pill bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Ministry</th>
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink-3">
                  No inquiries match this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-rule last:border-0 hover:bg-cream/50"
                >
                  <td className="px-4 py-3 text-xs text-ink-3 whitespace-nowrap">
                    {toDate(r.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inquiries/${r.id}`}
                      className="block hover:text-rust-dark"
                    >
                      <div className="font-serif text-base font-bold text-navy">
                        {r.name}
                      </div>
                      <div className="font-mono text-[11px] text-ink-3">{r.email}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2">{r.ministryName}</td>
                  <td className="px-4 py-3 text-xs text-ink-3 capitalize">{r.kind}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${STATUS_PILL[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length === 200 && (
        <p className="mt-4 text-xs text-ink-3">
          Showing the 200 most recent. Tighten the filters to see older rows.
        </p>
      )}
    </div>
  );
}
