import Link from "next/link";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { toDate } from "@/lib/dates";

export const metadata = { title: "Announcements · Admin" };

const KIND_LABEL: Record<"slide_in" | "modal", string> = {
  slide_in: "Slide-in",
  modal: "Modal",
};

export default async function AdminAnnouncementsList() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/settings/announcements");
  if (session.user.role !== "admin") redirect("/admin");

  const rows = await db
    .select({
      id: announcements.id,
      kind: announcements.kind,
      title: announcements.title,
      status: announcements.status,
      priority: announcements.priority,
      startsAt: announcements.startsAt,
      endsAt: announcements.endsAt,
      updatedAt: announcements.updatedAt,
    })
    .from(announcements)
    .orderBy(desc(announcements.priority), desc(announcements.updatedAt))
    .limit(200);

  return (
    <div>
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/settings" className="hover:text-rust-dark">
          Site settings
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Announcements</span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Announcements</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Slide-ins and full-screen modal popups. Schedule a window; the
            highest-priority active announcement renders site-wide.
          </p>
        </div>
        <Link
          href="/admin/settings/announcements/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New announcement
        </Link>
      </header>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Window</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink-3">
                  No announcements yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/settings/announcements/${r.id}`}
                      className="font-serif text-base font-bold text-navy hover:text-rust-dark"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2">
                    {KIND_LABEL[r.kind]}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-3 whitespace-nowrap">
                    {r.startsAt ? formatShort(r.startsAt) : "—"}
                    {" → "}
                    {r.endsAt ? formatShort(r.endsAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-3">{r.priority}</td>
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

function formatShort(d: Date | string) {
  return toDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
