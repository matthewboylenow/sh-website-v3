import Link from "next/link";
import { type Event as EventRow } from "@/db/schema";
import {
  formatMonthShort,
  formatTimeOfDay,
  formatWeekdayShort,
  toDate,
} from "@/lib/dates";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

/**
 * Event card — .event in the mockup. Presentational: expects an
 * already-typed event row from Drizzle. Dates may come in as either
 * Date or string (the unstable_cache layer serializes through JSON).
 */
export function EventCard({
  event,
}: {
  event: Pick<
    EventRow,
    "slug" | "title" | "startsAt" | "photoBlobKey" | "audiences" | "categories"
  >;
}) {
  const d = toDate(event.startsAt);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover"
    >
      <PhotoPlaceholder
        label="Event photo"
        brief={event.title}
        tone="navy"
        aspect="16/10"
        className="rounded-none border-0"
      />
      <div className="p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rust">
          {formatMonthShort(d)} {d.getDate()} · {d.getFullYear()}
        </div>
        <h3 className="mt-2 font-serif text-lg font-bold leading-snug text-navy">
          {event.title}
        </h3>
        <div className="mt-2 text-xs text-ink-3">
          {formatWeekdayShort(d)} · {formatTimeOfDay(d)}
        </div>
      </div>
    </Link>
  );
}
