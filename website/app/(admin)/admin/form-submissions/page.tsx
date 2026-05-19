import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  FORM_SUBMISSION_KINDS,
  formSubmissions,
  type FormSubmissionKind,
} from "@/db/schema";
import { toDate } from "@/lib/dates";

export const metadata = { title: "Form submissions · Admin" };

const KIND_LABEL: Record<FormSubmissionKind, string> = {
  funeral: "Funeral",
  baptism: "Baptism",
};

const KIND_PILL: Record<FormSubmissionKind, string> = {
  funeral: "bg-navy/10 text-navy",
  baptism: "bg-rust-pale text-rust-dark",
};

const FILTERS = ["all", ...FORM_SUBMISSION_KINDS] as const;
type Filter = (typeof FILTERS)[number];

export default async function FormSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/form-submissions");
  if (session.user.role === "ministry_lead") redirect("/admin");

  const { kind, q } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(kind ?? "")
    ? (kind as Filter)
    : "all";

  const whereClauses: SQL<unknown>[] = [];
  if (filter !== "all") {
    whereClauses.push(eq(formSubmissions.kind, filter));
  }
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    const search = or(
      ilike(formSubmissions.submitterName, term),
      ilike(formSubmissions.submitterEmail, term),
      ilike(formSubmissions.subjectName, term),
    );
    if (search) whereClauses.push(search);
  }
  const whereExpr =
    whereClauses.length === 0
      ? undefined
      : whereClauses.length === 1
        ? whereClauses[0]
        : and(...whereClauses);

  const base = db
    .select({
      id: formSubmissions.id,
      kind: formSubmissions.kind,
      submitterName: formSubmissions.submitterName,
      submitterEmail: formSubmissions.submitterEmail,
      subjectName: formSubmissions.subjectName,
      subjectDate: formSubmissions.subjectDate,
      pdfBlobKey: formSubmissions.pdfBlobKey,
      createdAt: formSubmissions.createdAt,
    })
    .from(formSubmissions);

  const rowsQuery = whereExpr ? base.where(whereExpr) : base;
  const rows = await rowsQuery.orderBy(desc(formSubmissions.createdAt)).limit(200);

  return (
    <div>
      <header>
        <span className="sh-eyebrow">Pipeline</span>
        <h1 className="mt-2 text-3xl">Form submissions</h1>
        <p className="sh-lede mt-2 text-[15px]">
          Sacramental intake forms from the public site. Each row has the full
          intake PDF + the original answers. Recipients are configured in{" "}
          <Link href="/admin/settings" className="text-rust-dark underline">
            Site settings → Forms &amp; footer
          </Link>
          .
        </p>
      </header>

      <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Form
          </label>
          <select
            name="kind"
            defaultValue={filter}
            className="form-input min-w-[140px]"
          >
            <option value="all">All forms</option>
            {FORM_SUBMISSION_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Search
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, email, or subject"
            className="form-input w-full"
          />
        </div>
        <button
          type="submit"
          className="rounded-pill bg-navy px-4 py-2 text-xs font-semibold text-white"
        >
          Filter
        </button>
        {(filter !== "all" || (q && q.length > 0)) && (
          <Link
            href="/admin/form-submissions"
            className="text-xs text-ink-3 underline"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-white">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-3">
            No submissions yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              <tr>
                <th className="px-4 py-3 text-left">Form</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Submitted by</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-rule hover:bg-cream/40"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ${
                        KIND_PILL[r.kind as FormSubmissionKind]
                      }`}
                    >
                      {KIND_LABEL[r.kind as FormSubmissionKind]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-navy">
                    <Link
                      href={`/admin/form-submissions/${r.id}`}
                      className="hover:text-rust-dark"
                    >
                      {r.subjectName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{r.submitterName}</div>
                    <a
                      href={`mailto:${r.submitterEmail}`}
                      className="text-xs text-ink-3 hover:text-rust-dark"
                    >
                      {r.submitterEmail}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {r.subjectDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-3 text-xs">
                    {toDate(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/form-submissions/${r.id}`}
                      className="text-xs font-semibold text-rust-dark hover:text-rust"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
