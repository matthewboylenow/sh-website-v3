/**
 * The answer engine, ported from the WordPress plugin Saint Helen Answers
 * 2.4.1-b. The PHP is not the asset — the behaviour is. These types are the
 * shape that behaviour operates on.
 *
 * Four deliberate departures from the WordPress original are marked FIX in
 * the modules that implement them. Everything else is faithful.
 */

/** A link on a card. WordPress stored these as [label, url] pairs in JSON. */
export type AnswerLink = { label: string; url: string };

/**
 * What happens to a dated moment once its date has passed.
 *
 * - `drop`    — forgotten silently. The card stays, the line goes.
 * - `note`    — the label is kept and rendered as "X has already taken place."
 * - `archive` — the whole card leaves the index the day after.
 * - `roll`    — the moment moves to its next occurrence instead of passing.
 *               A rolling moment is therefore never in the past.
 */
export const MOMENT_AFTER = ["drop", "note", "archive", "roll"] as const;
export type MomentAfter = (typeof MOMENT_AFTER)[number];

/** Feasts the liturgical calendar can compute. */
export const LITURGICAL_RULES = [
  "ash_wednesday",
  "palm_sunday",
  "holy_thursday",
  "good_friday",
  "easter",
  "pentecost",
  "advent_start",
  "christmas",
  "immaculate",
  "all_saints",
  "all_souls",
] as const;
export type LiturgicalRule = (typeof LITURGICAL_RULES)[number];

/** A dated line on a card — an information meeting, a feast, a deadline. */
export type Moment = {
  label: string;
  /** `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`. No timezone suffix; parish local. */
  when: string;
  where: string;
  after: MomentAfter;
  /** Only meaningful when `after` is `roll`. Empty means roll by anniversary. */
  rule: LiturgicalRule | "";
};

/**
 * NEW — the activation window the WordPress copy promised and never built.
 *
 * Six seed cards carry notes like "Activate 3 weeks before, archive the day
 * after" and sit in a group called "Seasonal, activates on its own", but
 * nothing implemented it: the Christmas card was searchable in June.
 *
 * A card with a window is in the index only between `leadDays` before its
 * feast and `trailDays` after it.
 */
export type ActivationWindow = {
  rule: LiturgicalRule;
  /** Days before the feast the card becomes findable. */
  leadDays: number;
  /** Days after the feast the card stays findable. 0 = gone the next day. */
  trailDays: number;
};

/** A card as stored. */
export type AnswerCard = {
  key: string;
  title: string;
  answer: string;
  group: string;
  triggers: string[];
  links: AnswerLink[];
  moments: Moment[];
  /** Key into the contacts map, not a person's details. */
  contact: string;
  /** Grief, loss or crisis. Cannot be published without the review role. */
  pastoral: boolean;
  /** Editorial note, never public. */
  note: string;
  /** Provenance, e.g. "Seed import" or "Bulletin, March 2 2026". */
  source: string;
  activation: ActivationWindow | null;
};

/** What a card looks like once resolved for a given day. */
export type ResolvedCard = {
  key: string;
  title: string;
  answer: string;
  links: AnswerLink[];
  contact: string;
  pastoral: boolean;
  /** The next moment still ahead, if any. */
  next: {
    label: string;
    where: string;
    when: string;
  } | null;
  /** Labels of past moments that asked to be noted. */
  past: string[];
};

/** The compact shape shipped to the browser. Field names are short on
 *  purpose — this payload is inlined on every page that carries the widget. */
export type CorpusCard = {
  k: string;
  t: string[];
  a: string;
  l: [string, string][];
  c: string;
  next: { label: string; where: string; when: string } | null;
  past: string[];
};

/** A page from the site-wide fallback corpus. */
export type CorpusPage = {
  /** Title. */
  t: string;
  /** URL. */
  u: string;
  /** Snippet. */
  s: string;
};

export type SearchResultKind = "card" | "page" | "none";
