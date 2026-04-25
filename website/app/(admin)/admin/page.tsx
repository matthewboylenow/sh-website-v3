import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  bulletins,
  events,
  massTimes,
  ministries,
  ministryEdits,
  seasonalBanners,
  staff,
} from "@/db/schema";

export const metadata = {
  title: "Dashboard",
};

const TILES = [
  { href: "/admin/events", label: "Events" },
  { href: "/admin/ministries", label: "Ministries" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/mass-times", label: "Mass times" },
  { href: "/admin/bulletins", label: "Bulletins" },
  { href: "/admin/seasonal-banners", label: "Seasonal banners" },
] as const;

export default async function AdminDashboard() {
  const session = await auth();

  const countOne = sql<number>`count(*)::int`;
  // Row counts give a quick sense of state per content type.
  const [
    [{ n: eventsCount = 0 } = { n: 0 }],
    [{ n: ministriesCount = 0 } = { n: 0 }],
    [{ n: staffCount = 0 } = { n: 0 }],
    [{ n: massTimesCount = 0 } = { n: 0 }],
    [{ n: bulletinsCount = 0 } = { n: 0 }],
    [{ n: bannersCount = 0 } = { n: 0 }],
    [{ n: pendingEdits = 0 } = { n: 0 }],
  ] = await Promise.all([
    db.select({ n: countOne }).from(events),
    db.select({ n: countOne }).from(ministries),
    db.select({ n: countOne }).from(staff),
    db.select({ n: countOne }).from(massTimes),
    db.select({ n: countOne }).from(bulletins),
    db.select({ n: countOne }).from(seasonalBanners),
    db
      .select({ n: countOne })
      .from(ministryEdits)
      .where(eq(ministryEdits.status, "pending")),
  ]);

  const counts: Record<string, number> = {
    "/admin/events": eventsCount,
    "/admin/ministries": ministriesCount,
    "/admin/staff": staffCount,
    "/admin/mass-times": massTimesCount,
    "/admin/bulletins": bulletinsCount,
    "/admin/seasonal-banners": bannersCount,
  };

  return (
    <div>
      <header className="mb-8">
        <span className="sh-eyebrow">Dashboard</span>
        <h1 className="mt-2 text-3xl">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="sh-lede mt-2 text-[15px]">
          A quick look at content state. Use the rail to dive in.
        </p>
      </header>

      {pendingEdits > 0 && (
        <Link
          href="/admin/approvals"
          className="mb-6 flex items-center justify-between rounded-md border-l-4 border-rust bg-rust-pale px-5 py-3 text-sm text-rust-dark hover:bg-rust-pale/80"
        >
          <span>
            <strong>{pendingEdits}</strong> ministry edit{pendingEdits === 1 ? "" : "s"} pending review.
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group block rounded-lg border border-rule bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-hover"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl font-bold text-navy">{t.label}</h2>
              <span className="font-mono text-2xl font-bold text-rust">
                {counts[t.href] ?? 0}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-3 group-hover:text-rust-dark">
              Open →
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-rule bg-white p-6">
        <h3 className="font-serif text-lg font-bold text-navy">Recent activity</h3>
        <p className="mt-2 text-sm text-ink-3">
          The audit log lands post-launch (see <code className="rounded bg-cream px-1.5 py-0.5 text-xs">backend.html §17</code>).
          For now, content updates show up immediately on the public site after a publish.
        </p>
      </div>
    </div>
  );
}

