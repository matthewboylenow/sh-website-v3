import Link from "next/link";
import { Container } from "@/components/site/Container";
import { EventsFilters } from "@/components/events/EventsFilters";
import { InteriorHero } from "@/components/site/InteriorHero";
import {
  formatMonthLong,
  formatMonthShort,
  formatTimeOfDay,
  formatWeekdayLong,
  formatWeekdayShort,
  monthKey,
  toDate,
} from "@/lib/dates";
import {
  getLatestFeaturedEvent,
  getUpcomingEvents,
} from "@/lib/queries/events.query";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { DEFAULT_HORIZON_MONTHS, expandEvents } from "@/lib/recurrence";

export const metadata = {
  title: "Events",
  description:
    "Everything happening across the parish. Filter by audience or category, or search for something specific.",
};

export const revalidate = 3600;

type SearchParams = {
  audience?: string;
  category?: string;
  q?: string;
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const audience = params.audience ?? "all";
  const category = params.category && params.category !== "all" ? params.category : null;
  const q = (params.q ?? "").trim();

  const [featured, allUpcoming, settings] = await Promise.all([
    getLatestFeaturedEvent(),
    getUpcomingEvents(200),
    getSiteSettings(),
  ]);
  const tax = settings?.taxonomies ?? {
    eventCategories: [],
    eventAudiences: [],
    ministryAudiences: [],
  };

  // Expand recurring events into concrete instances across the next
  // 6 months (DEFAULT_HORIZON_MONTHS). Each item keeps its parent event's
  // metadata + a `occurrenceStartsAt` that we treat as the display date.
  const now = new Date();
  const horizon = new Date(now);
  horizon.setMonth(horizon.getMonth() + DEFAULT_HORIZON_MONTHS);
  const instances = expandEvents(allUpcoming, now, horizon);

  const filtered = instances.filter((e) => {
    if (audience !== "all" && !(e.audiences ?? []).includes(audience)) return false;
    if (category && !(e.categories ?? []).includes(category)) return false;
    if (q) {
      const hay = `${e.title} ${e.lede ?? ""} ${e.location ?? ""} ${(e.audiences ?? []).join(" ")} ${(e.categories ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Group by month for display, keyed off the *occurrence* date.
  const byMonth = new Map<string, typeof filtered>();
  for (const e of filtered) {
    const key = monthKey(e.occurrenceStartsAt);
    const list = byMonth.get(key) ?? [];
    list.push(e);
    byMonth.set(key, list);
  }

  return (
    <>
      <InteriorHero
        eyebrow={formatDateRangeEyebrow(instances)}
        title="What's on."
        lede="Everything happening across the parish. Filter by audience or category, or search for something specific."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Events" }]}
        photoLabel="Parish life in motion"
        photoBrief="Harvest Fest on the front lawn · wide, golden hour."
        photoTone="warm"
      />

      <section className="py-16">
        <Container width="wide">
          {/* Featured card — for recurring events, snap to the next instance. */}
          {featured && (
            <FeaturedCard
              event={featured}
              displayStartsAt={
                expandEvents([featured], now, horizon)[0]?.occurrenceStartsAt ?? null
              }
            />
          )}

          {/* Active filter summary */}
          <ActiveSummary
            audience={audience}
            category={category}
            q={q}
            count={filtered.length}
            audienceOptions={tax.eventAudiences}
            categoryOptions={tax.eventCategories}
          />

          <div className="mt-10 grid gap-12 md:grid-cols-[260px_1fr] md:items-start">
            <EventsFilters
              audience={audience}
              category={category}
              q={q}
              audienceOptions={tax.eventAudiences}
              categoryOptions={tax.eventCategories}
            />

            <div>
              {byMonth.size === 0 ? (
                <EmptyState />
              ) : (
                [...byMonth.entries()].map(([key, entries]) => {
                  // monthKey now emits a real calendar month (2026-08 for
                  // August). It used to emit a zero-indexed one, which this
                  // line silently compensated for.
                  const [y, mStr] = key.split("-");
                  const label = new Date(
                    Number(y),
                    Number(mStr) - 1,
                    1,
                  ).toLocaleString("en-US", { month: "long" });
                  return (
                    <div key={key} className="mb-12">
                      <h2 className="flex items-baseline gap-3 font-serif text-2xl font-bold text-navy">
                        {label}{" "}
                        <span className="text-xs font-sans font-medium uppercase tracking-[0.12em] text-ink-3">
                          {y}
                        </span>
                      </h2>
                      <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-white">
                        {entries.map((e) => (
                          <li key={`${e.id}-${e.occurrenceStartsAt.toISOString()}`}>
                            <EventRow
                              slug={e.slug}
                              title={e.title}
                              startsAt={e.occurrenceStartsAt}
                              location={e.location}
                              audiences={e.audiences}
                              categories={e.categories}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function FeaturedCard({
  event,
  displayStartsAt,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getLatestFeaturedEvent>>>;
  displayStartsAt: Date | null;
}) {
  const d = displayStartsAt ?? toDate(event.startsAt);
  return (
    <div className="sh-on-dark mb-10 grid gap-8 rounded-xl bg-navy p-8 text-white md:grid-cols-[260px_1fr] md:items-center md:p-10">
      <div className="rounded-lg border border-white/15 bg-gradient-to-br from-gold/20 to-rust-dark/25 p-8 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          {formatMonthShort(d)}
        </div>
        <div className="mt-1 font-serif text-[64px] font-bold leading-none">
          {d.getDate()}
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.1em] text-white/70">
          {formatWeekdayLong(d)}
        </div>
      </div>
      <div>
        <span className="sh-eyebrow text-gold">Featured · {(event.audiences ?? []).join(" · ") || "All-parish"}</span>
        <h3 className="mt-2 font-serif text-3xl font-bold text-white">
          {event.title}
        </h3>
        {event.lede && (
          <p className="mt-3 max-w-[60ch] text-white/85">{event.lede}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {event.registerUrl && (
            <a
              href={event.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
            >
              {event.registerCtaLabel || "Sign Up"}
              <span aria-hidden="true">→</span>
            </a>
          )}
          <Link
            href={`/events/${event.slug}`}
            className={
              event.registerUrl
                ? "inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                : "inline-flex items-center gap-2 rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
            }
          >
            Event details <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventRow({
  slug,
  title,
  startsAt,
  location,
  audiences,
  categories,
}: {
  slug: string;
  title: string;
  startsAt: Date | string;
  location: string | null;
  audiences: string[] | null;
  categories: string[] | null;
}) {
  const d = toDate(startsAt);
  const allTags = [...(categories ?? []), ...(audiences ?? [])].slice(0, 3);
  return (
    <Link
      href={`/events/${slug}`}
      className="grid grid-cols-[72px_1fr_auto] items-center gap-5 px-5 py-4 transition-colors hover:bg-cream"
    >
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
          {formatMonthShort(d)}
        </div>
        <div className="font-serif text-2xl font-bold leading-none text-navy">
          {d.getDate()}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {formatWeekdayShort(d)}
        </div>
      </div>
      <div>
        <h4 className="font-serif text-base font-bold text-navy">{title}</h4>
        <div className="mt-1 text-xs text-ink-3">
          {formatTimeOfDay(d)}
          {location ? ` · ${location}` : ""}
        </div>
        {allTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {allTags.map((t) => (
              <span
                key={t}
                className="rounded-pill bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-2"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="text-lg text-ink-3">→</span>
    </Link>
  );
}

function ActiveSummary({
  audience,
  category,
  q,
  count,
  audienceOptions,
  categoryOptions,
}: {
  audience: string;
  category: string | null;
  q: string;
  count: number;
  audienceOptions: readonly string[];
  categoryOptions: readonly string[];
}) {
  const pretty = (k: string) => k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pieces: string[] = [];
  if (audience !== "all" && audienceOptions.includes(audience)) {
    pieces.push(pretty(audience));
  }
  if (category && categoryOptions.includes(category)) {
    pieces.push(pretty(category));
  }
  if (q) pieces.push(`“${q}”`);
  return (
    <p className="mt-4 text-sm text-ink-3">
      {count} event{count === 1 ? "" : "s"}
      {pieces.length > 0 ? ` · ${pieces.join(" · ")}` : ""}
    </p>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-rule bg-white p-12 text-center">
      <h3 className="font-serif text-xl font-bold text-navy">
        Nothing matches.
      </h3>
      <p className="mt-2 text-sm text-ink-2">
        Try clearing your filters or widening the audience.
      </p>
    </div>
  );
}

function formatDateRangeEyebrow(
  instances: Array<{ occurrenceStartsAt: Date }>,
) {
  if (instances.length === 0) return "Upcoming events";
  const first = instances[0]!.occurrenceStartsAt;
  const last = instances[instances.length - 1]!.occurrenceStartsAt;
  const firstLabel = formatMonthLong(first);
  const lastLabel = formatMonthLong(last);
  const year = last.getFullYear();
  return firstLabel === lastLabel
    ? `${firstLabel} ${year}`
    : `${firstLabel} — ${lastLabel} ${year}`;
}
