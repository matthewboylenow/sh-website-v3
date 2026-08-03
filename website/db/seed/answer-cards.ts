import type {
  ActivationWindow,
  AnswerCard,
  LiturgicalRule,
  MomentAfter,
} from "@/lib/answers/types";

/**
 * The 52 starter cards, carried over from the WordPress plugin's
 * data/seed-cards.json.
 *
 * Two things are decided here rather than in the JSON, because the
 * WordPress importer decided them in code too:
 *
 * 1. The liturgical rule on a rolling moment was derived from the card key,
 *    never stored. Same map, same six keys.
 * 2. The activation window. Six cards carried notes like "Activate 3 weeks
 *    before, archive the day after" and sat in a group called "Seasonal,
 *    activates on its own", and nothing implemented it — the Christmas card
 *    was findable in June. The windows below are read straight off those
 *    notes.
 */

/** Rolling moments take their date from a feast, not from what was typed. */
const RULE_FOR_KEY: Record<string, LiturgicalRule> = {
  "ash-wednesday": "ash_wednesday",
  stations: "ash_wednesday",
  "holy-week": "easter",
  "easter-scroll": "easter",
  christmas: "christmas",
  advent: "advent_start",
};

/**
 * When each seasonal card is findable, taken from its own note.
 *
 *   ash-wednesday  "Activate 3 weeks before, archive the day after"
 *   stations       "Activate with the Ash Wednesday card, archive after Easter"
 *   holy-week      "Activate Palm Sunday minus 3 weeks" — Palm Sunday is
 *                  Easter minus 7, so 28 days before Easter, through Easter
 *   easter-scroll  same season as Holy Week, and it runs on through Easter
 *   christmas      "Activate Dec 1" — 24 days before the 25th
 *   advent         "Activate Nov 20" — Advent starts Nov 29 in 2026, so 9
 *                  days of lead, running to Christmas Eve
 */
const ACTIVATION_FOR_KEY: Record<string, ActivationWindow> = {
  "ash-wednesday": { rule: "ash_wednesday", leadDays: 21, trailDays: 0 },
  stations: { rule: "ash_wednesday", leadDays: 21, trailDays: 53 },
  "holy-week": { rule: "easter", leadDays: 28, trailDays: 1 },
  "easter-scroll": { rule: "easter", leadDays: 28, trailDays: 49 },
  christmas: { rule: "christmas", leadDays: 24, trailDays: 12 },
  advent: { rule: "advent_start", leadDays: 9, trailDays: 26 },
};

/** The shape the WordPress JSON actually uses. */
type SeedJsonCard = {
  key: string;
  group?: string | null;
  triggers?: string[] | null;
  answer?: string | null;
  links?: [string, string][] | null;
  contact?: string | null;
  moments?:
    | {
        label?: string | null;
        when?: string | null;
        where?: string | null;
        after?: string | null;
      }[]
    | null;
  clergy_review?: boolean | null;
  note?: string | null;
};

const AFTER_VALUES: MomentAfter[] = ["drop", "note", "archive", "roll"];

/** Title case a key the way the WordPress importer did: "ocia" → "Ocia". */
function titleFromKey(key: string): string {
  return key
    .split("-")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Convert one JSON card into the v3 shape.
 *
 * Pastoral cards land in `review`, not `published` — grief, funerals,
 * anointing and mental health should be read by a person before they answer
 * anyone. That was the WordPress behaviour and it is worth keeping.
 */
export function seedCardFromJson(
  raw: SeedJsonCard,
): (AnswerCard & { status: "published" | "review"; position: number }) | null {
  const key = String(raw.key ?? "").trim();
  if (!key) return null;

  const pastoral = Boolean(raw.clergy_review);
  const rule = RULE_FOR_KEY[key];

  const moments = (raw.moments ?? [])
    .map((m) => {
      const when = String(m?.when ?? "").trim();
      if (!when) return null;
      const after: MomentAfter = AFTER_VALUES.includes(m?.after as MomentAfter)
        ? (m!.after as MomentAfter)
        : "drop";
      return {
        label: String(m?.label ?? ""),
        when,
        where: String(m?.where ?? ""),
        after,
        // Only a rolling moment takes a liturgical rule.
        rule: after === "roll" && rule ? rule : ("" as const),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return {
    key,
    title: titleFromKey(key),
    answer: String(raw.answer ?? ""),
    group: String(raw.group ?? ""),
    triggers: (raw.triggers ?? []).map((t) => String(t).trim()).filter(Boolean),
    links: (raw.links ?? [])
      .filter((l) => Array.isArray(l) && l[1])
      .map((l) => ({ label: String(l[0] ?? l[1]), url: String(l[1]) })),
    moments,
    contact: String(raw.contact ?? ""),
    pastoral,
    note: String(raw.note ?? ""),
    source: "Seed import",
    activation: ACTIVATION_FOR_KEY[key] ?? null,
    status: pastoral ? "review" : "published",
    position: 0,
  };
}

export function seedCardsFromJson(cards: SeedJsonCard[]) {
  return cards
    .map(seedCardFromJson)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c, i) => ({ ...c, position: i }));
}
