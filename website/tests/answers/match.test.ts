import { describe, expect, it } from "vitest";
import {
  MAX_CARDS_SHOWN,
  SCORE,
  close,
  editDistance,
  findCards,
  findPages,
  scoreCard,
  search,
} from "@/lib/answers/match";
import { normalizeQuery, tokenize } from "@/lib/answers/normalize";
import type { CorpusCard, CorpusPage } from "@/lib/answers/types";

/**
 * The scoring ladder. This is what decides whether somebody looking for a
 * Mass time gets the Mass times, so it gets the most assertions in the
 * codebase.
 *
 * Ladder, unchanged from the WordPress plugin:
 *   exact trigger          100
 *   substring either way    60
 *   token equals trigger    45
 *   token inside trigger    30
 *   fuzzy, longer tokens    25
 */

const card = (k: string, ...t: string[]): CorpusCard => ({
  k,
  t,
  a: `Answer for ${k}`,
  l: [],
  c: "",
  next: null,
  past: [],
});

const score = (c: CorpusCard, query: string) => {
  const needle = normalizeQuery(query);
  return scoreCard(c, needle, tokenize(needle));
};

describe("editDistance", () => {
  it("is zero for identical strings", () => {
    expect(editDistance("bulletin", "bulletin")).toBe(0);
  });

  it("counts a substitution as one", () => {
    expect(editDistance("mass", "mess")).toBe(1);
  });

  it("counts an insertion and a deletion as one each", () => {
    expect(editDistance("mas", "mass")).toBe(1);
    expect(editDistance("masss", "mass")).toBe(1);
  });

  it("has no transposition shortcut — it is Levenshtein, not Damerau", () => {
    expect(editDistance("amss", "mass")).toBe(2);
  });

  it("handles an empty operand", () => {
    expect(editDistance("", "mass")).toBe(4);
    expect(editDistance("mass", "")).toBe(4);
    expect(editDistance("", "")).toBe(0);
  });
});

describe("close", () => {
  it("catches the misspellings the parish actually gets", () => {
    expect(close("bulletin", "bulliten")).toBe(true);
    expect(close("confirmation", "conformation")).toBe(true);
  });

  it("allows two edits on a long trigger and one on a short one", () => {
    expect(close("bulletin", "bulletim")).toBe(true); // 8 chars, 1 edit
    expect(close("bulletin", "bulliten")).toBe(true); // 8 chars, 2 edits
    expect(close("advent", "advant")).toBe(true); // 6 chars, 1 edit
    expect(close("advent", "advamt")).toBe(false); // 6 chars, 2 edits
  });

  it("rejects a length gap over two", () => {
    expect(close("mass", "massively")).toBe(false);
  });

  it("takes its allowance from the trigger, not the token", () => {
    // Deliberately asymmetric, matching the original. Argument order is
    // close(trigger, token) and swapping it changes the answer.
    expect(close("baptism", "baptsm")).toBe(true); // trigger 7 → 2 allowed
    expect(close("baptsm", "baptism")).toBe(true); // trigger 6 → 1 allowed
    expect(close("funerals", "funrl")).toBe(false);
  });
});

describe("the scoring ladder", () => {
  const massTimes = card(
    "mass-times",
    "mass times",
    "mass schedule",
    "what time is mass",
    "mass",
  );

  it("scores an exact trigger 100", () => {
    expect(score(massTimes, "mass times")).toBe(SCORE.exact);
    expect(score(massTimes, "Mass Times")).toBe(SCORE.exact);
    expect(score(massTimes, "  mass   times  ")).toBe(SCORE.exact);
  });

  it("scores a substring either direction 60", () => {
    // Query contains the trigger.
    expect(score(card("c", "mass times"), "what are the mass times today")).toBe(
      SCORE.substring,
    );
    // Trigger contains the query.
    expect(score(card("c", "mass times schedule"), "mass times")).toBe(
      SCORE.substring,
    );
  });

  it("scores a token equal to a trigger 45", () => {
    // Reachable only when the substring rung declines, which now means a
    // trigger under four characters. The parish has several: cyo, vbs, wwp.
    expect(score(card("c", "cyo"), "cyo signup")).toBe(
      SCORE.tokenEqualsTrigger,
    );
  });

  it("lets the substring rung win when a longer trigger is a whole word", () => {
    // "baptism class" contains the trigger "baptism", so it is a 60 and
    // never reaches the token rung. Worth pinning: in the WordPress original
    // this made rung 45 unreachable for every trigger of four characters or
    // more, which is nearly all of them.
    expect(score(card("c", "baptism"), "baptism class")).toBe(SCORE.substring);
  });

  it("scores a token inside a trigger 30", () => {
    expect(score(card("c", "baptism preparation"), "baptism class")).toBe(
      SCORE.tokenInsideTrigger,
    );
  });

  it("scores a fuzzy match 25", () => {
    expect(score(card("c", "bulletin"), "bulliten")).toBe(SCORE.fuzzy);
  });

  it("returns 0 when nothing matches", () => {
    expect(score(card("c", "baptism"), "parking")).toBe(0);
  });

  it("never accumulates — a card matching many triggers still scores once", () => {
    // Five near-misses, all landing on the fuzzy rung. The score is 25, not
    // 125. If this ever returns something off the ladder, scoring has
    // started summing and every ranking on the site is wrong.
    const many = card(
      "c",
      "bulletim",
      "bulleton",
      "bullelin",
      "bulletix",
      "bullexin",
    );
    expect(score(many, "bulletin")).toBe(SCORE.fuzzy);

    // Exact wins outright and stops looking.
    const all = card("c", "mass", "mass times", "mass schedule");
    expect(score(all, "mass")).toBe(SCORE.exact);
  });

  it("takes the best rung across all triggers, not the first", () => {
    // "confession" scores 30 inside "confession times"; the second trigger
    // is an exact hit and must win.
    const c = card("c", "confession times", "confession");
    expect(score(c, "confession")).toBe(SCORE.exact);
  });

  it("only ever produces a score from the ladder", () => {
    const allowed = new Set([0, 25, 30, 45, 60, 100]);
    const c = card("c", "baptism", "baptism preparation", "bulletin");
    for (const q of ["baptism", "baptisms", "bulliten", "prep", "zzz", "a b"]) {
      expect(allowed.has(score(c, q))).toBe(true);
    }
  });

  it("ignores triggers that normalise to nothing", () => {
    expect(score(card("c", "!!!", "baptism"), "baptism")).toBe(SCORE.exact);
  });

  it("ignores tokens under three characters on the token rungs", () => {
    // "an" is too short to earn 45 against the trigger "an".
    expect(score(card("c", "an"), "an ocia")).toBe(0);
  });

  it("only reaches the fuzzy rung for tokens of five or more", () => {
    expect(score(card("c", "lent"), "lant")).toBe(0);
    expect(score(card("c", "advent"), "advant")).toBe(SCORE.fuzzy);
  });
});

describe("FIX — short queries no longer hijack the substring rung", () => {
  const christmas = card("christmas", "christmas mass");
  const stations = card("stations", "stations of the cross");
  const ocia = card("ocia", "ocia");

  it("does not score a two-letter query against every trigger containing it", () => {
    // In WordPress "st" scored 60 here, beating a genuine token match
    // elsewhere and returning a near-random top two.
    expect(score(christmas, "st")).toBe(0);
    expect(score(stations, "st")).toBe(0);
  });

  it("still scores an exact short trigger", () => {
    // A card whose trigger really is short is unaffected — exact match
    // short-circuits above the substring rung.
    expect(score(ocia, "ocia")).toBe(SCORE.exact);
  });

  it("admits four-letter words, which is where real matches start", () => {
    expect(score(card("c", "mass times"), "mass")).toBe(SCORE.substring);
    expect(score(card("c", "lenten schedule"), "lent")).toBe(SCORE.substring);
  });

  it("still reaches the token rung when neither string contains the other", () => {
    expect(score(card("c", "baptism preparation"), "baptism class")).toBe(
      SCORE.tokenInsideTrigger,
    );
  });

  describe("FIX — a token must be a word, not any run of letters", () => {
    it("does not match a short token buried inside a longer word", () => {
      // The real one: "car insurance" returned the childcare card, because
      // "car" sits inside "childcare" and inside "careers".
      expect(score(card("kids-mass", "childcare"), "car insurance")).toBe(0);
      expect(score(card("jobs", "careers"), "car insurance")).toBe(0);
    });

    it("still matches a token that is a whole word in the trigger", () => {
      expect(score(card("c", "ash wednesday"), "ash service")).toBe(
        SCORE.tokenInsideTrigger,
      );
    });

    it("still matches a four-letter-or-longer prefix of a word", () => {
      // "confess" should find "confession". Length gap is 3, so the fuzzy
      // rung cannot rescue this one and the prefix rule has to.
      expect(score(card("c", "confession times"), "confess today")).toBe(
        SCORE.tokenInsideTrigger,
      );
    });

    it("does not let a three-letter prefix through", () => {
      expect(score(card("c", "careers page"), "car park")).toBe(0);
    });
  });
});

describe("findCards", () => {
  const cards = [
    card("mass-times", "mass times", "mass"),
    card("confession", "confession", "reconciliation"),
    card("baptism", "baptism", "christening"),
  ];

  const run = (q: string) => {
    const needle = normalizeQuery(q);
    return findCards(cards, needle, tokenize(needle));
  };

  it("returns only cards that scored", () => {
    expect(run("baptism").map((h) => h.card.k)).toEqual(["baptism"]);
  });

  it("sorts by score descending", () => {
    const hits = run("mass times");
    expect(hits[0]!.card.k).toBe("mass-times");
    expect(hits[0]!.score).toBe(SCORE.exact);
  });

  it("returns an empty list when nothing matches", () => {
    expect(run("parking")).toEqual([]);
  });

  it("keeps corpus order for ties, so admin ordering still decides", () => {
    const tied = [
      card("second", "adoration chapel"),
      card("first", "adoration hours"),
    ];
    const needle = normalizeQuery("adoration");
    const hits = findCards(tied, needle, tokenize(needle));
    expect(hits.map((h) => h.score)).toEqual([SCORE.substring, SCORE.substring]);
    expect(hits.map((h) => h.card.k)).toEqual(["second", "first"]);
  });
});

describe("findPages", () => {
  const pages: CorpusPage[] = [
    { t: "Parish Picnic", u: "/picnic", s: "Food on the lawn every August." },
    { t: "Ministries", u: "/ministries", s: "Find a parish picnic volunteer role." },
    { t: "Contact", u: "/contact", s: "Reach the parish office." },
  ];

  it("weights a title hit above a body hit", () => {
    const hits = findPages(pages, tokenize("picnic"));
    expect(hits[0]!.u).toBe("/picnic");
  });

  it("accumulates across tokens, unlike cards", () => {
    // Both tokens in the title beats one token in a title and one in a body.
    const hits = findPages(pages, tokenize("parish picnic"));
    expect(hits[0]!.u).toBe("/picnic");
  });

  it("returns nothing when every token is too short", () => {
    expect(findPages(pages, tokenize("a of"))).toEqual([]);
  });

  it("returns nothing when nothing matches", () => {
    expect(findPages(pages, tokenize("zebra"))).toEqual([]);
  });

  it("caps at six", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      t: `Ministry ${i}`,
      u: `/m${i}`,
      s: "",
    }));
    expect(findPages(many, tokenize("ministry"))).toHaveLength(6);
  });

  it("does not fuzzy match — a page is a worse answer than a card", () => {
    expect(findPages(pages, tokenize("picnik"))).toEqual([]);
  });
});

describe("search — what actually goes on screen", () => {
  const cards = [
    card("mass-times", "mass times", "mass"),
    card("mass-livestream", "livestream", "watch mass online", "mass online"),
    card("daily-mass", "daily mass", "weekday mass"),
    card("confession", "confession"),
    card("adoration", "adoration"),
  ];
  const pages: CorpusPage[] = [
    { t: "Mass and Worship", u: "/mass", s: "Times and what to expect." },
    { t: "Livestream", u: "/live", s: "Watch the 10am Mass." },
    { t: "I'm New", u: "/im-new", s: "Everything a first visit needs." },
    { t: "Ministries", u: "/ministries", s: "Mass servers and more." },
  ];

  it("shows at most two cards however many matched", () => {
    const out = search("mass", cards, pages);
    expect(out.cards.length).toBeLessThanOrEqual(MAX_CARDS_SHOWN);
    expect(out.matchCount).toBeGreaterThan(MAX_CARDS_SHOWN);
  });

  it("suppresses pages entirely once two cards match", () => {
    const out = search("mass", cards, pages);
    expect(out.cards).toHaveLength(2);
    expect(out.pages).toEqual([]);
  });

  it("backfills three pages beneath a single card", () => {
    const out = search("adoration", cards, [
      { t: "Adoration", u: "/adoration", s: "Chapel hours." },
      { t: "Prayer", u: "/prayer", s: "Adoration and more." },
      { t: "Chapel", u: "/chapel", s: "Adoration space." },
      { t: "Sacraments", u: "/sacraments", s: "Adoration listed here." },
    ]);
    expect(out.cards).toHaveLength(1);
    expect(out.pages).toHaveLength(3);
    expect(out.kind).toBe("card");
  });

  it("falls back to six pages when no card matches", () => {
    const out = search("volunteer", [], [
      ...Array.from({ length: 9 }, (_, i) => ({
        t: `Volunteer ${i}`,
        u: `/v${i}`,
        s: "",
      })),
    ]);
    expect(out.cards).toEqual([]);
    expect(out.pages).toHaveLength(6);
    expect(out.kind).toBe("page");
  });

  it("reports none when nothing matches at all", () => {
    const out = search("helicopter", cards, pages);
    expect(out).toMatchObject({
      kind: "none",
      topCardKey: "",
      shownCount: 0,
      matchCount: 0,
    });
  });

  it("reports card when cards and pages are both on screen", () => {
    const out = search("adoration", cards, [
      { t: "Adoration", u: "/adoration", s: "Chapel hours." },
    ]);
    expect(out.kind).toBe("card");
  });

  it("returns nothing for an empty or unmatchable query", () => {
    expect(search("", cards, pages).kind).toBe("none");
    expect(search("   ", cards, pages).kind).toBe("none");
    expect(search("!!!", cards, pages).kind).toBe("none");
  });

  it("names the top card for the search log", () => {
    expect(search("confession", cards, pages).topCardKey).toBe("confession");
  });

  describe("FIX — one result count, and it is what the visitor saw", () => {
    it("counts what is on screen, not what matched", () => {
      // WordPress logged the unclipped match count in the search row and the
      // rendered count in the feedback row, so "shown 2nd of 9" could appear
      // for a screen that only ever held two cards.
      const out = search("mass", cards, pages);
      expect(out.shownCount).toBe(out.cards.length + out.pages.length);
      expect(out.shownCount).toBe(2);
    });

    it("still exposes the match count separately", () => {
      // Kept because it answers a different question: a card matching far
      // more often than it should is winning matches it has no business
      // winning, and the shown count cannot reveal that.
      const out = search("mass", cards, pages);
      expect(out.matchCount).toBe(3);
    });
  });
});
