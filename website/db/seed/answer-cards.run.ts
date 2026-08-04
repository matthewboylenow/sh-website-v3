/**
 * Answer-card seed runner — loads the 52 starter cards from
 * data/answer-cards.json through seedCardsFromJson() and inserts any
 * card whose key is not already in answer_cards.
 *
 * Invoked by `pnpm answers:seed` (add --dry-run to preview).
 *
 * Non-destructive on purpose: an existing key is SKIPPED, never
 * overwritten — once a card has been touched in /admin/answers, this
 * runner will not undo that work. Delete a row in admin first if you
 * really want the seed copy back.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { answerCards } from "../schema";
import { seedCardsFromJson } from "./answer-cards";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const jsonPath = path.join(__dirname, "data", "answer-cards.json");
  // The JSON is the WordPress plugin's export: { version, blocked_urls,
  // cards } — the cards array is what seeds; blocked_urls ships with
  // the matching engine, not the DB.
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as { cards: unknown[] };
  const cards = seedCardsFromJson(raw.cards as never);

  console.log(
    `\nSeeding ${cards.length} answer cards${DRY_RUN ? "  (DRY RUN — no writes)" : ""}\n`,
  );

  let inserted = 0;
  let skipped = 0;
  for (const card of cards) {
    const [existing] = await db
      .select({ id: answerCards.id, status: answerCards.status })
      .from(answerCards)
      .where(eq(answerCards.key, card.key))
      .limit(1);
    if (existing) {
      skipped += 1;
      console.log(`  ✓  ${card.key}  (exists, ${existing.status} — skipped)`);
      continue;
    }
    if (!DRY_RUN) {
      await db.insert(answerCards).values({
        key: card.key,
        title: card.title,
        answer: card.answer,
        group: card.group,
        triggers: card.triggers,
        links: card.links,
        moments: card.moments,
        contact: card.contact,
        pastoral: card.pastoral,
        activation: card.activation,
        status: card.status,
        note: card.note,
        source: card.source,
        position: card.position,
      });
    }
    inserted += 1;
    console.log(
      `  ➕  ${card.key}  (${card.status}${card.pastoral ? ", pastoral" : ""})${DRY_RUN ? "  would insert" : ""}`,
    );
  }

  console.log(
    `\n${DRY_RUN ? "Would insert" : "Inserted"} ${inserted}, skipped ${skipped} existing, of ${cards.length} cards.\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nAnswer-card seed failed:\n", err);
    process.exit(1);
  });
