import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { seasonalBanners } from "@/db/schema";
import { toDate } from "@/lib/dates";

export const metadata = { title: "Seasonal banners · Admin" };

export default async function AdminSeasonalBannersList() {
  const rows = await db
    .select()
    .from(seasonalBanners)
    .orderBy(desc(seasonalBanners.startsAt));

  const now = Date.now();

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Content</span>
          <h1 className="mt-2 text-3xl">Seasonal banners</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Time-boxed homepage banners — for Holy Week, Service Auction, etc.
          </p>
        </div>
        <Link
          href="/admin/seasonal-banners/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New banner
        </Link>
      </header>

      <div className="mt-8 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Window</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">CTA</th>
              <th className="px-4 py-3 font-semibold">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-3">
                  No banners yet. <Link href="/admin/seasonal-banners/new" className="font-semibold text-rust-dark">Create one →</Link>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const starts = toDate(r.startsAt);
                const ends = toDate(r.endsAt);
                const live =
                  r.isActive && starts.getTime() <= now && ends.getTime() >= now;
                const future = r.isActive && starts.getTime() > now;
                return (
                  <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-3">
                      <div>{starts.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      <div>→ {ends.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/seasonal-banners/${r.id}`}
                        className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                      >
                        {r.title}
                      </Link>
                      {r.subtitle && (
                        <div className="mt-0.5 text-xs text-ink-3">{r.subtitle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-2">
                      {r.ctaLabel ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {live ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">
                          Live
                        </span>
                      ) : future ? (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-700">
                          Scheduled
                        </span>
                      ) : (
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-600">
                          {r.isActive ? "Past" : "Inactive"}
                        </span>
                      )}
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
