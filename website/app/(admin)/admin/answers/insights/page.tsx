import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWriteContent } from "@/lib/authz";
import {
  getAnswerSummary,
  getDeadEnds,
  getTopQueries,
  getUnhelpfulCards,
  getWantedNotes,
} from "@/lib/answers/reports.query";
import { getRetentionStatus } from "@/lib/answers/retention";

export const metadata = { title: "What people searched for · Admin" };
export const dynamic = "force-dynamic";

function pct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function when(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(d);
}

export default async function AnswerInsights() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/answers/insights");
  if (!canWriteContent(session.user.role)) redirect("/admin");

  const [summary, deadEnds, unhelpful, notes, top, retention] =
    await Promise.all([
      getAnswerSummary(30),
      getDeadEnds(90, 40),
      getUnhelpfulCards(30, 8, 20),
      getWantedNotes(180, 40),
      getTopQueries(30, 20),
      getRetentionStatus(),
    ]);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/answers" className="hover:text-rust-dark">
          Answer cards
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span>What people searched for</span>
      </nav>

      <h1 className="text-3xl">What people searched for</h1>
      <p className="sh-lede mt-2 max-w-[62ch] text-[15px]">
        The last 30 days. People do not report a bad search result — they just
        leave — so this is the only place that failure is visible.
      </p>

      {/* ---- Headline numbers -------------------------------------- */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Searches" value={String(summary.total)} />
        <Stat
          label="Answered by a card"
          value={pct(summary.cards, summary.total)}
        />
        <Stat
          label="Found nothing"
          value={pct(summary.dead, summary.total)}
          tone={summary.dead > summary.total / 4 ? "warn" : undefined}
        />
        <Stat
          label="Marked helpful"
          value={
            summary.yes + summary.no === 0
              ? "—"
              : pct(summary.yes, summary.yes + summary.no)
          }
        />
      </div>

      {/* ---- Dead ends --------------------------------------------- */}
      <Section
        title="Nobody found an answer for these"
        blurb="Ninety days, most common first. Each row is a card somebody wanted and the parish has not written yet — a to-do list that writes itself."
      >
        {deadEnds.length === 0 ? (
          <Empty>
            Nothing yet. Either the cards are covering everything, or the widget
            has not been used much.
          </Empty>
        ) : (
          <ul className="divide-y divide-rule">
            {deadEnds.map((d) => (
              <li
                key={d.query}
                className="flex items-baseline justify-between gap-4 py-2.5"
              >
                <span className="font-mono text-sm">{d.query}</span>
                <span className="whitespace-nowrap text-xs text-ink-3">
                  {d.count} time{d.count === 1 ? "" : "s"} · last{" "}
                  {when(new Date(d.lastSeen))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ---- Unhelpful, with the searches underneath ---------------- */}
      <Section
        title="Cards people said did not help"
        blurb="With the searches that led to each one. Five people typing the same thing is a card you are missing. Five people typing five different things is a card winning matches it should not. The count alone cannot tell those apart."
      >
        {unhelpful.length === 0 ? (
          <Empty>No card has been marked unhelpful in the last 30 days.</Empty>
        ) : (
          <ul className="space-y-5">
            {unhelpful.map((card) => (
              <li key={card.cardKey}>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-sm font-semibold">
                    {card.cardKey}
                  </span>
                  <span className="text-xs text-ink-3">
                    {card.no} no · {card.yes} yes
                  </span>
                </div>
                <ul className="mt-2 space-y-2 border-l-2 border-rule pl-4">
                  {card.searches.map((s, i) => (
                    <li key={i}>
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <span className="text-sm">
                          {s.query ? `"${s.query}"` : (
                            <span className="text-ink-3">no search recorded</span>
                          )}
                        </span>
                        <span className="text-xs text-ink-3">
                          {when(new Date(s.when))}
                        </span>
                      </div>
                      <p className="text-xs text-ink-3">
                        {s.position > 0
                          ? `shown ${ordinal(s.position)} of ${s.resultCount}`
                          : `${s.resultCount} result${s.resultCount === 1 ? "" : "s"} on screen`}
                        {s.also.length > 0 && ` · alongside ${s.also.join(", ")}`}
                      </p>
                      {s.wanted && (
                        <p className="mt-1 rounded bg-cream px-2 py-1 text-sm text-ink-2">
                          &ldquo;{s.wanted}&rdquo;
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ---- The sentences ----------------------------------------- */}
      <Section
        title="What people said they were looking for"
        blurb="One sentence from a real person is worth more than a hundred aggregate rows, and it is the only way to hear about content that does not exist yet."
      >
        {notes.length === 0 ? (
          <Empty>Nobody has typed anything yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {notes.map((n, i) => (
              <li key={i} className="rounded-md bg-cream px-3 py-2">
                <p className="text-sm text-ink">&ldquo;{n.wanted}&rdquo;</p>
                <p className="mt-1 text-xs text-ink-3">
                  after searching{" "}
                  {n.query ? `"${n.query}"` : "(not recorded)"} · on{" "}
                  <span className="font-mono">{n.cardKey}</span> ·{" "}
                  {when(new Date(n.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-3">
          Contact details are stripped before anything is stored, and these are
          wiped after {retention.wantedRetentionDays} days while the counts stay
          for {retention.rowRetentionDays}. Holding {retention.sentencesHeld}{" "}
          right now
          {retention.sentencesOverdue > 0 && (
            <>
              {" "}
              — <strong>{retention.sentencesOverdue} past due</strong>, which
              means the nightly job is not running
            </>
          )}
          .
        </p>
      </Section>

      {/* ---- Top searches ------------------------------------------ */}
      <Section
        title="Most common searches"
        blurb="What the parish is actually asked, in its own words."
      >
        {top.length === 0 ? (
          <Empty>No searches recorded yet.</Empty>
        ) : (
          <ul className="divide-y divide-rule">
            {top.map((t) => (
              <li
                key={t.query}
                className="flex items-baseline justify-between gap-4 py-2.5"
              >
                <span className="font-mono text-sm">{t.query}</span>
                <span className="whitespace-nowrap text-xs text-ink-3">
                  {t.count}× · {t.clicks} click{t.clicks === 1 ? "" : "s"}
                  {t.dead > 0 && ` · ${t.dead} found nothing`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function ordinal(n: number): string {
  return (
    ["first", "second", "third", "fourth", "fifth", "sixth"][n - 1] ?? `${n}th`
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        tone === "warn" ? "border-rust" : "border-rule"
      }`}
    >
      <span className="block font-serif text-2xl font-bold text-navy">
        {value}
      </span>
      <span className="text-xs uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
    </div>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 rounded-lg border border-rule bg-white p-6">
      <h2 className="font-serif text-xl font-bold text-navy">{title}</h2>
      <p className="mt-1 max-w-[68ch] text-sm text-ink-2">{blurb}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-3">{children}</p>;
}
