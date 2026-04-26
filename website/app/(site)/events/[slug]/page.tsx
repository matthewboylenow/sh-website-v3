import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/Container";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { RichTextRenderer } from "@/components/site/RichTextRenderer";
import { assetUrl } from "@/lib/blob";
import {
  formatMonthLong,
  formatTimeOfDay,
  formatWeekdayLong,
  toDate,
} from "@/lib/dates";
import { getEventBySlug } from "@/lib/queries/events.query";
import {
  DEFAULT_HORIZON_MONTHS,
  expandEvent,
  summarizeRecurrence,
} from "@/lib/recurrence";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.lede ?? undefined,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const photoUrl = await assetUrl(event.photoBlobKey);

  // Materialize concrete instances within the horizon (now → +6 months).
  const now = new Date();
  const horizon = new Date(now);
  horizon.setMonth(horizon.getMonth() + DEFAULT_HORIZON_MONTHS);
  const upcoming = expandEvent(
    event,
    event.recurrence ?? null,
    event.exceptionDates ?? [],
    now,
    horizon,
  );
  const next = upcoming[0] ?? null;

  // For one-off events with a base time still in the past, fall back to
  // the stored startsAt so the page doesn't render with no date at all.
  const heroStart = next ? next.startsAt : toDate(event.startsAt);
  const heroEnd = next ? next.endsAt : toDate(event.endsAt);

  return (
    <article>
      {/* ---- Hero ------------------------------------------------- */}
      <section className="bg-cream pt-28 pb-12 sm:pt-32 sm:pb-16">
        <Container width="wide">
          <nav className="mb-4 text-xs text-ink-3">
            <Link href="/" className="hover:text-rust-dark">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <Link href="/events" className="hover:text-rust-dark">Events</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span aria-current="page">{event.title}</span>
          </nav>

          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              {(event.audiences && event.audiences.length > 0) && (
                <span className="sh-eyebrow">
                  {event.audiences.join(" · ")}
                </span>
              )}
              <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">{event.title}</h1>
              {event.lede && <p className="sh-lede mt-4 max-w-[60ch]">{event.lede}</p>}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {event.registerUrl && (
                  <a
                    href={event.registerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
                  >
                    {event.registerCtaLabel || "Sign Up"}
                    <span aria-hidden="true">→</span>
                  </a>
                )}
                <Link
                  href="/events"
                  className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
                >
                  All events
                </Link>
              </div>
            </div>

            <PhotoPlaceholder
              imageUrl={photoUrl}
              imageAlt={event.title}
              label="Event photo"
              brief={event.title}
              tone="warm"
              aspect="5/4"
              priority
            />
          </div>
        </Container>
      </section>

      {/* ---- Body + sidebar -------------------------------------- */}
      <section className="bg-white py-16">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr]">
            <div>
              {event.body ? (
                <div className="sh-prose text-[17px] leading-[1.7]">
                  <RichTextRenderer html={event.body} />
                </div>
              ) : (
                <p className="text-ink-3">More details coming soon.</p>
              )}

              {upcoming.length > 1 && (
                <div className="mt-12 border-t border-rule pt-8">
                  <h2 className="font-serif text-2xl font-bold text-navy">
                    Upcoming dates
                  </h2>
                  <p className="mt-1 text-sm text-ink-2">
                    {summarizeRecurrence(event.recurrence)}.
                  </p>
                  <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-cream/40">
                    {upcoming.slice(0, 12).map((inst) => (
                      <li
                        key={inst.startsAt.toISOString()}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <span className="font-serif font-bold text-navy">
                          {formatWeekdayLong(inst.startsAt)},{" "}
                          {formatMonthLong(inst.startsAt)}{" "}
                          {inst.startsAt.getDate()}
                        </span>
                        <span className="text-ink-3">
                          {formatTimeOfDay(inst.startsAt)}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {upcoming.length > 12 && (
                    <p className="mt-3 text-xs text-ink-3">
                      Showing the next 12 of {upcoming.length} upcoming dates.
                    </p>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-5 self-start rounded-lg border border-rule bg-cream p-6">
              <DetailItem label="Date">
                <p className="font-serif text-base font-bold text-navy">
                  {formatWeekdayLong(heroStart)}
                </p>
                <p className="text-sm text-ink-2">
                  {formatMonthLong(heroStart)} {heroStart.getDate()},{" "}
                  {heroStart.getFullYear()}
                </p>
              </DetailItem>

              <DetailItem label="Time">
                <p className="text-sm text-ink-2">
                  {formatTimeOfDay(heroStart)}
                  {sameDay(heroStart, heroEnd) && heroEnd > heroStart
                    ? ` – ${formatTimeOfDay(heroEnd)}`
                    : ""}
                </p>
              </DetailItem>

              {event.location && (
                <DetailItem label="Location">
                  <p className="text-sm text-ink-2">{event.location}</p>
                </DetailItem>
              )}

              {event.recurrence && (
                <DetailItem label="Repeats">
                  <p className="text-sm text-ink-2">
                    {summarizeRecurrence(event.recurrence)}
                  </p>
                </DetailItem>
              )}

              {event.categories && event.categories.length > 0 && (
                <DetailItem label="Categories">
                  <div className="flex flex-wrap gap-1.5">
                    {event.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-pill bg-white px-2.5 py-0.5 text-[11px] font-semibold capitalize text-ink-2"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </DetailItem>
              )}
            </aside>
          </div>
        </Container>
      </section>
    </article>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
        {label}
      </h3>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
