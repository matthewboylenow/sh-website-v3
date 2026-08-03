import { describe, expect, it } from "vitest";
import seedJson from "@/db/seed/data/answer-cards.json";
import { seedCardsFromJson } from "@/db/seed/answer-cards";
import { isBlocked, type BlockRule } from "@/lib/answers/blocklist";
import { normalizeQuery } from "@/lib/answers/normalize";
import { search } from "@/lib/answers/match";
import { isActive, resolveCard } from "@/lib/answers/resolve";
import type { CorpusCard } from "@/lib/answers/types";

/**
 * The 52 starter cards, carried over from WordPress. These are the answers
 * the parish actually gives, so the conversion gets checked against real
 * questions rather than synthetic ones.
 */

const cards = seedCardsFromJson(seedJson.cards as never);
const byKey = new Map(cards.map((c) => [c.key, c]));

const asCorpus = (today: string): CorpusCard[] =>
  cards
    .filter((c) => c.status === "published")
    .map((c) => ({ card: c, resolved: resolveCard(c, today) }))
    .filter((r) => r.resolved !== null)
    .map(({ card, resolved }) => ({
      k: card.key,
      t: card.triggers,
      a: resolved!.answer,
      l: resolved!.links.map((l) => [l.label, l.url] as [string, string]),
      c: resolved!.contact,
      next: resolved!.next,
      past: resolved!.past,
    }));

describe("the conversion", () => {
  it("brings all 52 cards across", () => {
    expect(cards).toHaveLength(52);
  });

  it("gives every card a key, a title, an answer and at least one trigger", () => {
    for (const c of cards) {
      expect(c.key, JSON.stringify(c.key)).toMatch(/^[a-z0-9-]+$/);
      expect(c.title.length, c.key).toBeGreaterThan(0);
      expect(c.answer.length, c.key).toBeGreaterThan(0);
      expect(c.triggers.length, c.key).toBeGreaterThan(0);
    }
  });

  it("has no duplicate keys", () => {
    expect(new Set(cards.map((c) => c.key)).size).toBe(cards.length);
  });

  it("holds the ten pastoral cards back for review", () => {
    const review = cards.filter((c) => c.status === "review").map((c) => c.key);
    expect(review.sort()).toEqual(
      [
        "anointing",
        "caregivers",
        "disability-support",
        "funeral",
        "funeral-livestream",
        "funeral-support",
        "grief",
        "help-need",
        "mental-health",
        "safety",
      ].sort(),
    );
    for (const key of review) {
      expect(byKey.get(key)!.pastoral, key).toBe(true);
    }
  });

  it("publishes the other 42", () => {
    expect(cards.filter((c) => c.status === "published")).toHaveLength(42);
  });

  it("converts links from pairs to objects and keeps them all", () => {
    const mass = byKey.get("mass-times")!;
    expect(mass.links.length).toBeGreaterThan(0);
    for (const c of cards) {
      for (const l of c.links) {
        expect(l.url, `${c.key} link url`).not.toBe("");
        expect(l.label, `${c.key} link label`).not.toBe("");
      }
    }
  });

  it("assigns a liturgical rule to every rolling moment and no others", () => {
    for (const c of cards) {
      for (const m of c.moments) {
        if (m.after === "roll") {
          expect(m.rule, `${c.key} rolling moment`).not.toBe("");
        } else {
          expect(m.rule, `${c.key} ${m.after} moment`).toBe("");
        }
      }
    }
  });

  it("stores no blocked link", () => {
    const rules = (seedJson.blocked_urls as BlockRule[]).map((r) => ({
      ...r,
      match: (r.match as unknown) === "exact" ? ("exact" as const) : ("children" as const),
    }));
    expect(rules.length).toBeGreaterThan(0);
    for (const c of cards) {
      for (const l of c.links) {
        expect(isBlocked(rules, l.url), `${c.key} → ${l.url}`).toBe(false);
      }
    }
  });
});

describe("the six seasonal cards now have a season", () => {
  const seasonal = [
    "ash-wednesday",
    "stations",
    "holy-week",
    "easter-scroll",
    "christmas",
    "advent",
  ];

  it("gives each of them an activation window", () => {
    for (const key of seasonal) {
      expect(byKey.get(key)!.activation, key).not.toBeNull();
    }
  });

  it("leaves every other card findable all year", () => {
    for (const c of cards) {
      if (!seasonal.includes(c.key)) {
        expect(c.activation, c.key).toBeNull();
      }
    }
  });

  it("takes the Christmas card out of a June search", () => {
    // The thing that prompted this: searching "christmas" in June returned
    // the full Christmas Mass schedule as if it were current.
    expect(isActive(byKey.get("christmas")!, "2026-06-15")).toBe(false);
    expect(isActive(byKey.get("christmas")!, "2026-12-10")).toBe(true);
  });

  it("opens Advent on November 20, as its note says", () => {
    // Advent 2026 begins Nov 29; the note reads "Activate Nov 20".
    expect(isActive(byKey.get("advent")!, "2026-11-19")).toBe(false);
    expect(isActive(byKey.get("advent")!, "2026-11-20")).toBe(true);
  });

  it("opens Ash Wednesday three weeks before and closes the day after", () => {
    // Ash Wednesday 2027 is Feb 10.
    const ash = byKey.get("ash-wednesday")!;
    expect(isActive(ash, "2027-01-19")).toBe(false);
    expect(isActive(ash, "2027-01-20")).toBe(true);
    expect(isActive(ash, "2027-02-10")).toBe(true);
    expect(isActive(ash, "2027-02-11")).toBe(false);
  });

  it("keeps Stations up through Lent and drops it after Easter", () => {
    const stations = byKey.get("stations")!;
    expect(isActive(stations, "2027-03-01")).toBe(true); // mid-Lent
    expect(isActive(stations, "2027-03-28")).toBe(true); // Easter
    expect(isActive(stations, "2027-05-01")).toBe(false);
  });
});

describe("the cards answer the questions people actually ask", () => {
  // August, so the seasonal cards are correctly out of season.
  const today = "2026-08-02";
  const corpus = asCorpus(today);
  const top = (q: string) => search(q, corpus, []).cards[0]?.k;

  it("answers the Mass-time questions", () => {
    expect(top("mass times")).toBe("mass-times");
    expect(top("what time is mass")).toBe("mass-times");
    expect(top("sunday mass")).toBe("mass-times");
    expect(top("daily mass")).toBe("mass-times");
  });

  it("survives a typo", () => {
    // "masd" is a real trigger on the card, because it is a real typo.
    expect(top("masd")).toBe("mass-times");
  });

  it("answers confession", () => {
    expect(top("confession")).toBe("confession");
  });

  it("does not return the Christmas card in August", () => {
    const out = search("christmas mass", corpus, []);
    expect(out.cards.map((c) => c.k)).not.toContain("christmas");
  });

  it("does return it in December", () => {
    const december = asCorpus("2026-12-10");
    const out = search("christmas mass", december, []);
    expect(out.cards.map((c) => c.k)).toContain("christmas");
  });

  it("holds the pastoral cards out of the corpus until someone publishes them", () => {
    // Funerals, grief, anointing and mental health are the most sensitive
    // answers the parish gives, and they should be read before they answer
    // anyone. Worth a first-run prompt in the admin.
    expect(corpus.map((c) => c.k)).not.toContain("funeral");
    expect(corpus.map((c) => c.k)).not.toContain("grief");
  });

  it("normalises every trigger to something non-empty", () => {
    for (const c of cards) {
      for (const t of c.triggers) {
        expect(normalizeQuery(t), `${c.key}: ${JSON.stringify(t)}`).not.toBe("");
      }
    }
  });

  it("has no card whose triggers are so broad it wins unrelated searches", () => {
    // A guard against the failure mode the feedback report exists to catch.
    // Nothing should match a question the parish has no answer for.
    for (const q of ["helicopter", "bitcoin", "car insurance"]) {
      expect(search(q, corpus, []).cards, q).toEqual([]);
    }
  });
});
