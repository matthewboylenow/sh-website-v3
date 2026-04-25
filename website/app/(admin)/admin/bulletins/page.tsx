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
        </div>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-pill bg-ink-4/40 px-5 py-2.5 text-sm font-semibold text-white"
          title="Upload flow ships in Step 5"
        >
          + Upload bulletin
        </button>
      </header>

      <div className="mt-6 rounded-lg border-l-4 border-navy bg-navy-pale p-5 text-sm text-navy">
        <strong>Bulletin uploads ship in Step 5.</strong> The schema is in place
        but every bulletin row needs a real PDF in Vercel Blob (FK to
        <code className="mx-1 rounded bg-white px-1 py-0.5 text-xs">blob_assets</code>).
        Once the client-upload flow is wired, this list populates with the weekly
        archive and editors can replace the stub PDF if they spot a typo.
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
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
                  No bulletins yet — uploads ship in Step 5.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3 text-ink-2">
                    {toDate(r.weekOf).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 font-serif text-base font-bold text-navy">
                    {r.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2">{r.pageCount ?? "—"}</td>
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

      <p className="mt-4 text-xs text-ink-3">
        Browse the public archive at{" "}
        <Link href="/bulletin" className="font-semibold text-rust-dark">
          /bulletin
        </Link>{" "}
        once content lands.
      </p>
    </div>
  );
}
