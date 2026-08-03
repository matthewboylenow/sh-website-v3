import { asc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import {
  answerCards,
  formationPages,
  ministries,
  pages,
  siteSettings,
} from "@/db/schema";
import { parishToday } from "@/lib/timezone";
import { filterLinks, isBlocked, type BlockRule } from "./blocklist";
import { resolveCard } from "./resolve";
import type { AnswerCard, CorpusCard, CorpusPage } from "./types";

/**
 * The corpus the browser searches.
 *
 * Cards are resolved for today before they go out, so a card whose feast has
 * passed, or whose season has not opened, never reaches the browser at all.
 * That means "is this card in season" is decided once on the server rather
 * than by every visitor's clock.
 */

/** The parish's own date, which is what card resolution is relative to. */
export { parishToday };

/**
 * Pages that must never be discoverable even though the URL works. The
 * parish case is the baptism form, which Tracey sends privately after
 * speaking with a family.
 *
 * Hardcoded until the admin screen for it lands, and deliberately so — an
 * empty list here would quietly un-block it.
 */
const BLOCK_RULES: BlockRule[] = [
  {
    url: "https://sainthelen.org/baptism/",
    reason:
      "Baptism form. Sent privately after a conversation. Must never be discoverable.",
    match: "children",
  },
];

function loadBlockRules(): BlockRule[] {
  return BLOCK_RULES;
}

function toCorpusCard(card: AnswerCard, today: string, rules: BlockRule[]) {
  const resolved = resolveCard(card, today);
  if (!resolved) return null;
  const links = filterLinks(rules, resolved.links);
  return {
    k: resolved.key,
    t: card.triggers,
    a: resolved.answer,
    l: links.map((l) => [l.label, l.url] as [string, string]),
    c: resolved.contact,
    next: resolved.next,
    past: resolved.past,
  } satisfies CorpusCard;
}

/**
 * Published cards, resolved for the given day.
 *
 * Cards in review are deliberately absent. The ten pastoral ones — funerals,
 * grief, anointing, mental health — should be read by a person before they
 * answer anybody.
 */
export async function buildCardCorpus(today: string): Promise<CorpusCard[]> {
  const rules = loadBlockRules();
  const rows = await db
    .select()
    .from(answerCards)
    .where(eq(answerCards.status, "published"))
    .orderBy(asc(answerCards.position), asc(answerCards.key));

  const out: CorpusCard[] = [];
  for (const row of rows) {
    const card = toCorpusCard(
      {
        key: row.key,
        title: row.title,
        answer: row.answer,
        group: row.group,
        triggers: row.triggers,
        links: row.links,
        moments: row.moments,
        contact: row.contact,
        pastoral: row.pastoral,
        note: row.note,
        source: row.source,
        activation: row.activation ?? null,
      },
      today,
      rules,
    );
    if (card) out.push(card);
  }
  return out;
}

/** The page fallback for the long tail — titles and snippets only. */
export async function buildPageCorpus(): Promise<CorpusPage[]> {
  const rules = loadBlockRules();

  const [cmsPages, ministryRows, formationRows] = await Promise.all([
    db
      .select({ slug: pages.slug, title: pages.title, summary: pages.summary })
      .from(pages)
      .where(eq(pages.status, "published"))
      .limit(400),
    db
      .select({
        slug: ministries.slug,
        name: ministries.name,
        summary: ministries.tagline,
      })
      .from(ministries)
      .where(eq(ministries.status, "published"))
      .limit(400),
    db
      .select({
        slug: formationPages.slug,
        name: formationPages.name,
        summary: formationPages.summary,
      })
      .from(formationPages)
      .where(eq(formationPages.status, "published"))
      .limit(400),
  ]);

  const all: CorpusPage[] = [
    ...cmsPages.map((p) => ({ t: p.title, u: `/${p.slug}`, s: p.summary ?? "" })),
    ...ministryRows.map((m) => ({
      t: m.name,
      u: `/ministries/${m.slug}`,
      s: m.summary ?? "",
    })),
    ...formationRows.map((f) => ({
      t: f.name,
      u: `/formation/${f.slug}`,
      s: f.summary ?? "",
    })),
  ];

  return all.filter((p) => !isBlocked(rules, p.u));
}

/**
 * Cached for an hour and busted on any card edit.
 *
 * The date is part of the cache key on purpose: a card that archives itself
 * overnight, or a season that opens, must not wait for a stale entry.
 */
export const getAnswerCorpus = unstable_cache(
  async (today: string) => {
    const [cards, pageList] = await Promise.all([
      buildCardCorpus(today),
      buildPageCorpus(),
    ]);
    return { cards, pages: pageList, today };
  },
  ["answers:corpus"],
  { tags: ["answer-cards", "pages", "ministries"], revalidate: 3600 },
);

/** Contact details cards point at, by key. */
export async function getAnswerContacts(): Promise<
  Record<string, { name: string; phone: string; email: string }>
> {
  const [row] = await db
    .select({
      email: siteSettings.contactEmail,
      phone: siteSettings.contactPhone,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  return {
    office: {
      name: "Parish Office",
      phone: row?.phone ?? "",
      email: row?.email ?? "",
    },
  };
}

/** Look up several cards by key — used by the admin reports. */
export async function getCardsByKeys(keys: string[]) {
  if (keys.length === 0) return [];
  return db.select().from(answerCards).where(inArray(answerCards.key, keys));
}
