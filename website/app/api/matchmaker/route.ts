import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedMinistries } from "@/lib/queries/ministries.query";
import { getSiteSettings } from "@/lib/queries/site-settings.query";

/**
 * Stateless quiz scoring.
 *
 * POST { answers: Record<questionId, answerId> } → top-5 ministries
 * sorted by tag-intersection score. Falls back to ministries by
 * orderingPriority if no answers score above zero (so the user always
 * sees something).
 */

const Body = z.object({
  answers: z.record(z.string(), z.string()),
});

const TOP_N = 5;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const [settings, ministries] = await Promise.all([
    getSiteSettings(),
    getPublishedMinistries(),
  ]);

  const manifest = settings?.matchmaker ?? { questions: [] };

  // Collect the user's tag bag from selected answers + manifest fallback.
  const userTags = new Set<string>(manifest.fallbackTags ?? []);
  for (const question of manifest.questions) {
    const chosenId = parsed.data.answers[question.id];
    if (!chosenId) continue;
    const answer = question.answers.find((a) => a.id === chosenId);
    if (!answer) continue;
    for (const tag of answer.tags) userTags.add(tag);
  }

  // Score each ministry by tag intersection size.
  const scored = ministries.map((m) => {
    const ministryTags = new Set(m.matchmakerTags ?? []);
    let score = 0;
    for (const t of userTags) if (ministryTags.has(t)) score += 1;
    return { ministry: m, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.ministry.orderingPriority - b.ministry.orderingPriority;
  });

  // If nothing scored above zero, return the first N ministries by priority
  // so the UX never bottoms out empty.
  const anyMatched = scored.some((s) => s.score > 0);
  const top = (anyMatched ? scored : scored.slice()).slice(0, TOP_N);

  return NextResponse.json({
    matches: top.map(({ ministry, score }) => ({
      slug: ministry.slug,
      name: ministry.name,
      tagline: ministry.tagline,
      description: ministry.description,
      meetingCadence: ministry.meetingCadence,
      contactEmail: ministry.contactEmail,
      score,
    })),
    matched: anyMatched,
  });
}
