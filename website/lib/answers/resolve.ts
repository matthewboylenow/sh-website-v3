import { nextOccurrence, shiftDays } from "./liturgical";
import type { AnswerCard, Moment, ResolvedCard } from "./types";

/**
 * What a card says today.
 *
 * A card can carry dated moments — an information meeting, a feast, a
 * registration deadline. Once a moment has passed it either disappears, is
 * kept as a note, takes the whole card with it, or rolls forward to its next
 * occurrence. This is the piece that lets the parish write a card once and
 * leave it alone for years.
 *
 * Ported from SHA_Cards::resolve() and resolve_when().
 */

/**
 * Where a rolling moment actually falls, given today.
 *
 * Returns null when the moment cannot be placed — an unknown liturgical
 * rule, or an anniversary that could not be rolled inside five years.
 */
export function resolveWhen(moment: Moment, today: string): string | null {
  if (moment.after !== "roll") return moment.when;

  if (moment.rule) {
    // The stored date is discarded — the rule is the truth.
    return nextOccurrence(moment.rule, today);
  }

  // No liturgical rule, so roll the same month and day forward a year.
  const date = moment.when.slice(0, 10);
  if (date >= today) return moment.when;

  const time = moment.when.slice(10);
  const thisYear = Number(today.slice(0, 4));
  for (let i = 0; i < 5; i++) {
    const candidate = `${thisYear + i}${date.slice(4)}`;
    if (candidate >= today) return candidate + time;
  }
  return null;
}

/**
 * Is this card findable today?
 *
 * NEW behaviour, not in the WordPress original. Six seed cards carried notes
 * like "Activate 3 weeks before, archive the day after" and lived in a group
 * called "Seasonal, activates on its own", but nothing implemented it — the
 * Christmas card was searchable in June. A card with an activation window is
 * in the index only between `leadDays` before its feast and `trailDays`
 * after it.
 *
 * A card with no window is always active, which is every other card.
 */
export function isActive(card: Pick<AnswerCard, "activation">, today: string): boolean {
  const w = card.activation;
  if (!w) return true;

  // Look at this year's feast and next year's, because the window for a
  // late-December feast opens while the calendar still says November — and
  // for Advent it can open in the previous year entirely.
  const year = Number(today.slice(0, 4));
  for (const y of [year - 1, year, year + 1]) {
    const feast = feastIn(w.rule, y);
    if (!feast) continue;
    const opens = shiftDays(feast, -Math.max(0, w.leadDays));
    const closes = shiftDays(feast, Math.max(0, w.trailDays));
    if (today >= opens && today <= closes) return true;
  }
  return false;
}

function feastIn(rule: string, year: number): string | null {
  // nextOccurrence walks forward from a date, so ask it from Jan 1 of the
  // year we want and take the answer only if it landed in that year.
  const d = nextOccurrence(rule, `${year}-01-01`);
  return d && d.slice(0, 4) === String(year) ? d : null;
}

/**
 * Resolve a card for a given day.
 *
 * Returns null when the card should not appear at all — either an `archive`
 * moment has passed or its activation window is closed.
 */
export function resolveCard(
  card: AnswerCard,
  today: string,
): ResolvedCard | null {
  if (!isActive(card, today)) return null;

  let next: { date: string; when: string; moment: Moment } | null = null;
  const past: string[] = [];

  for (const moment of card.moments) {
    const when = resolveWhen(moment, today);
    if (!when) continue;
    const date = when.slice(0, 10);

    if (date >= today) {
      // A moment falling today counts as ahead of us, not behind. That is
      // why "archive the day after" works: the card survives its own feast.
      if (next === null || date < next.date) {
        next = { date, when, moment };
      }
      continue;
    }

    if (moment.after === "archive") return null;
    if (moment.after === "note") past.push(moment.label);
    // `drop` falls through and is forgotten, which is the point.
  }

  return {
    key: card.key,
    title: card.title,
    answer: card.answer,
    links: card.links,
    contact: card.contact,
    pastoral: card.pastoral,
    next: next
      ? {
          label: next.moment.label,
          where: next.moment.where,
          when: next.when,
        }
      : null,
    past,
  };
}
