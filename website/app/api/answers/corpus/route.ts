import { NextResponse } from "next/server";
import {
  getAnswerContacts,
  getAnswerCorpus,
  parishToday,
} from "@/lib/answers/corpus.query";

/**
 * The corpus the search widget downloads once and then searches locally.
 *
 * No model runs when a visitor searches — the matching happens in their
 * browser against this payload. Nothing can be invented and nothing costs
 * money per search.
 *
 * Cards are resolved server-side for the parish's own date, so a card whose
 * feast has passed or whose season has not opened never reaches the browser
 * at all. That keeps "is this in season" off every visitor's clock.
 */

export const runtime = "nodejs";

export async function GET() {
  const today = parishToday();
  const [corpus, contacts] = await Promise.all([
    getAnswerCorpus(today),
    getAnswerContacts(),
  ]);

  return NextResponse.json(
    { cards: corpus.cards, pages: corpus.pages, contacts, today },
    {
      headers: {
        // Fifteen minutes at the edge, an hour of stale-while-revalidate.
        // A card edit busts the server cache immediately; this only decides
        // how long a browser keeps its own copy.
        "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      },
    },
  );
}
