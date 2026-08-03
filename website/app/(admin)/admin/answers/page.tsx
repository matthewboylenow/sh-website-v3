import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { answerCards } from "@/db/schema";
import { canWriteContent } from "@/lib/authz";

export const metadata = { title: "Answers · Admin" };

const STATUS_STYLE: Record<string, string> = {
  published: "bg-[#E6F0EA] text-[#3F7D58]",
  review: "bg-[#F6EEDC] text-[#7A5E12]",
  draft: "bg-[#EFEDE8] text-ink-2",
  archived: "bg-[#EFEDE8] text-ink-3",
};

export default async function AnswerCardsList() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/answers");
  if (!canWriteContent(session.user.role)) redirect("/admin");

  const rows = await db
    .select()
    .from(answerCards)
    .orderBy(asc(answerCards.position), desc(answerCards.updatedAt))
    .limit(300);

  const inReview = rows.filter((r) => r.status === "review");
  const published = rows.filter((r) => r.status === "published");

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Content</span>
          <h1 className="mt-2 text-3xl">Answer cards</h1>
          <p className="sh-lede mt-2 max-w-[62ch] text-[15px]">
            Write the answer once, list the things people actually type to find
            it — misspellings included — and it comes back instantly. No AI runs
            when somebody searches, so nothing can be invented.
          </p>
        </div>
        <Link
          href="/admin/answers/new"
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
        >
          + New card
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/admin/answers/insights"
          className="rounded-pill border border-rule bg-white px-4 py-2 hover:border-rust hover:text-rust-dark"
        >
          What people searched for →
        </Link>
      </div>

      {inReview.length > 0 && (
        <div className="mt-8 rounded-lg border-l-4 border-gold bg-[#F6EEDC]/50 p-5">
          <h2 className="font-serif text-lg font-bold text-navy">
            {inReview.length} card{inReview.length === 1 ? "" : "s"} waiting to
            be read
          </h2>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-2">
            These touch grief, loss or crisis. They are not searchable until
            somebody publishes them, which is deliberate — these are the most
            sensitive answers the parish gives, and they should be read by a
            person first.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {inReview.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/answers/${c.id}`}
                  className="rounded-pill border border-rule bg-white px-3 py-1 text-sm hover:border-rust hover:text-rust-dark"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 text-sm text-ink-3">
        {published.length} card{published.length === 1 ? "" : "s"} answering
        searches right now, {rows.length} in total.
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">Card</th>
              <th className="px-4 py-3 font-semibold">Group</th>
              <th className="px-4 py-3 font-semibold">Triggers</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-3">
                  No answer cards yet.{" "}
                  <Link
                    href="/admin/answers/new"
                    className="font-semibold text-rust-dark"
                  >
                    Write the first one →
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-rule last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/answers/${c.id}`}
                      className="font-semibold text-rust-dark hover:text-rust"
                    >
                      {c.title}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-ink-3">
                      {c.key}
                    </span>
                    {c.activation && (
                      <span className="ml-2 rounded bg-[#E9E4F2] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4A3A73]">
                        Seasonal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{c.group || "—"}</td>
                  <td className="px-4 py-3 text-ink-3">
                    {c.triggers.length} phrase
                    {c.triggers.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                        STATUS_STYLE[c.status] ?? STATUS_STYLE.draft
                      }`}
                    >
                      {c.status === "review" ? "Needs reading" : c.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length === 300 && (
        <p className="mt-3 text-xs text-ink-3">
          Showing the first 300 cards. If the parish ever gets past this,
          searching this list is the next thing to build.
        </p>
      )}
    </div>
  );
}
