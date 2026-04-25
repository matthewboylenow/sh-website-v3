import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bulletins } from "@/db/schema";
import { toDate } from "@/lib/dates";

export const metadata = { title: "Bulletins · Admin" };

export default async function AdminBulletinsList() {
  const rows = await db
    .select()
    .from(bulletins)
    .orderBy(desc(bulletins.weekOf))
    .limit(60);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Content</span>
          <h1 className="mt-2 text-3xl">Bulletins</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Weekly bulletin archive. Upload a PDF for each Sunday — bulletins
            appear on{" "}
            <code className="rounded bg-cream px-1.5 py-0.5 text-xs">/bulletin</code>{" "}
            immediately.
          </p>
        </div>
        <Link
          href="/admin/bulletins/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + Upload bulletin
        </Link>
      </header>

      <div className="mt-8 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Week of</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Pages</th>
              <th className="px-4 py-3 font-semibold">Published</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-3">
                  No bulletins yet.{" "}
                  <Link
                    href="/admin/bulletins/new"
                    className="font-semibold text-rust-dark"
                  >
                    Upload the first one →
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-rule last:border-0 hover:bg-cream/50"
                >
                  <td className="px-4 py-3 text-ink-2">
                    <Link
                      href={`/admin/bulletins/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {toDate(r.weekOf).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-serif text-base text-navy">
                    {r.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2">
                    {r.pageCount ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-3">
                    {r.publishedAt
                      ? toDate(r.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Not yet"}
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
