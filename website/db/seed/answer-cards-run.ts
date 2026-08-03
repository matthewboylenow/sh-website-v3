/**
 * Load the 52 starter answer cards.
 *
 * Run with:
 *   pnpm answers:seed            # add anything missing
 *   pnpm answers:seed --dry-run  # say what it would do and change nothing
 *
 * Safe to run more than once. A card whose key already exists is left
 * completely alone, edits included — this fills gaps, it does not restore.
 * That is deliberate: nobody wants a seed script quietly reverting the Mass
 * times somebody corrected last week.
 *
 * The ten pastoral cards — funerals, grief, anointing, mental health,
 * safety — land in `review` rather than `published`. They are the most
 * sensitive answers the parish gives and somebody should read them before
 * they answer anyone. Publish them from /admin/answers when you have.
 */

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { answerCards } from "@/db/schema";
import seedJson from "./data/answer-cards.json";
import { seedCardsFromJson } from "./answer-cards";

type SeedCard = ReturnType<typeof seedCardsFromJson>[number];

function toRow(c: SeedCard) {
  return {
    key: c.key,
    title: c.title,
    answer: c.answer,
    group: c.group,
    triggers: c.triggers,
    links: c.links,
    moments: c.moments,
    contact: c.contact,
    pastoral: c.pastoral,
    activation: c.activation,
    status: c.status,
    note: c.note,
    source: c.source,
    position: c.position,
  };
}

export async function seedAnswerCards({ dryRun = false } = {}) {
  const cards = seedCardsFromJson(seedJson.cards as never);
  const keys = cards.map((c) => c.key);

  const existing = await db
    .select({ key: answerCards.key })
    .from(answerCards)
    .where(inArray(answerCards.key, keys));
  const have = new Set(existing.map((r) => r.key));

  const missing = cards.filter((c) => !have.has(c.key));

  console.log(`\n  ${cards.length} cards in the seed file`);
  console.log(`  ${have.size} already in the database, left untouched`);
  console.log(`  ${missing.length} to add\n`);

  if (missing.length === 0) {
    console.log("  Nothing to do.\n");
    return { added: 0, skipped: have.size };
  }

  for (const c of missing) {
    const flag = c.status === "review" ? "  (needs reading)" : "";
    console.log(`    + ${c.key}${flag}`);
  }

  if (dryRun) {
    console.log("\n  Dry run — nothing written.\n");
    return { added: 0, skipped: have.size };
  }

  // ON CONFLICT DO NOTHING rather than trusting the count above. The read
  // and the write are separate statements, so a card can appear between
  // them — two people running this at once, or somebody creating a card in
  // the admin mid-run. Letting Postgres arbitrate means the worst case is
  // "did nothing" instead of "threw halfway through".
  const inserted = await db
    .insert(answerCards)
    .values(missing.map(toRow))
    .onConflictDoNothing({ target: answerCards.key })
    .returning({ key: answerCards.key });

  const addedKeys = new Set(inserted.map((r) => r.key));
  const review = missing.filter(
    (c) => c.status === "review" && addedKeys.has(c.key),
  ).length;

  if (inserted.length !== missing.length) {
    console.log(
      `\n  ${missing.length - inserted.length} appeared while this was ` +
        `running and were left alone.`,
    );
  }
  console.log(`\n  Added ${inserted.length}.`);
  if (review > 0) {
    console.log(
      `  ${review} are pastoral and are waiting to be read — they will not\n` +
        `  answer any search until somebody publishes them at /admin/answers.`,
    );
  }
  console.log("");
  return { added: inserted.length, skipped: cards.length - inserted.length };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log("\nSaint Helen — answer cards");
  await seedAnswerCards({ dryRun });
}

main().catch((err) => {
  console.error("\nSeeding the answer cards failed:\n", err);
  process.exit(1);
});
