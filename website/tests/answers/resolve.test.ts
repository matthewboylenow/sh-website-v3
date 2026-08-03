import { describe, expect, it } from "vitest";
import { isActive, resolveCard, resolveWhen } from "@/lib/answers/resolve";
import type { AnswerCard, Moment } from "@/lib/answers/types";

/**
 * Moment resolution is what lets the parish write a card once and leave it
 * alone. It decides whether an information meeting still shows, whether the
 * Ash Wednesday card has quietly archived itself, and — new in this port —
 * whether a seasonal card is in season at all.
 */

const moment = (over: Partial<Moment> = {}): Moment => ({
  label: "Information meeting",
  when: "2026-09-15T19:00",
  where: "the Church",
  after: "drop",
  rule: "",
  ...over,
});

const makeCard = (over: Partial<AnswerCard> = {}): AnswerCard => ({
  key: "ireland",
  title: "Ireland Pilgrimage",
  answer: "A parish pilgrimage to Ireland.",
  group: "Current, time-bound",
  triggers: ["ireland", "pilgrimage"],
  links: [],
  moments: [],
  contact: "office",
  pastoral: false,
  note: "",
  source: "Seed import",
  activation: null,
  ...over,
});

describe("resolveWhen", () => {
  it("returns the stored date untouched for a non-rolling moment", () => {
    expect(resolveWhen(moment({ after: "drop" }), "2026-08-02")).toBe(
      "2026-09-15T19:00",
    );
    expect(resolveWhen(moment({ after: "note" }), "2027-01-01")).toBe(
      "2026-09-15T19:00",
    );
  });

  describe("rolling by liturgical rule", () => {
    it("discards the stored date and uses the rule", () => {
      const m = moment({ after: "roll", rule: "easter", when: "2020-04-12" });
      expect(resolveWhen(m, "2026-08-02")).toBe("2027-03-28");
    });

    it("returns this year's feast when it is still ahead", () => {
      const m = moment({ after: "roll", rule: "christmas", when: "2020-12-25" });
      expect(resolveWhen(m, "2026-08-02")).toBe("2026-12-25");
    });

    it("returns null for an unknown rule instead of vanishing quietly", () => {
      const m = moment({
        after: "roll",
        rule: "candlemas" as Moment["rule"],
        when: "2026-02-02",
      });
      expect(resolveWhen(m, "2026-08-02")).toBeNull();
    });
  });

  describe("rolling by anniversary", () => {
    it("leaves a future date alone, keeping its time", () => {
      const m = moment({ after: "roll", when: "2026-09-15T19:00" });
      expect(resolveWhen(m, "2026-08-02")).toBe("2026-09-15T19:00");
    });

    it("rolls a past date to this year", () => {
      const m = moment({ after: "roll", when: "2020-09-15T19:00" });
      expect(resolveWhen(m, "2026-08-02")).toBe("2026-09-15T19:00");
    });

    it("rolls to next year when this year's has already gone", () => {
      const m = moment({ after: "roll", when: "2020-09-15T19:00" });
      expect(resolveWhen(m, "2026-10-01")).toBe("2027-09-15T19:00");
    });

    it("keeps a bare date bare", () => {
      const m = moment({ after: "roll", when: "2020-09-15" });
      expect(resolveWhen(m, "2026-08-02")).toBe("2026-09-15");
    });
  });

  it("a rolling moment is never in the past", () => {
    const today = "2026-08-02";
    for (const when of ["2019-01-01", "2026-08-01", "2030-05-05"]) {
      const resolved = resolveWhen(moment({ after: "roll", when }), today);
      expect(resolved).not.toBeNull();
      expect(resolved!.slice(0, 10) >= today).toBe(true);
    }
  });
});

describe("resolveCard — a card with no moments", () => {
  it("always resolves and carries its fields through", () => {
    const out = resolveCard(makeCard(), "2026-08-02");
    expect(out).toMatchObject({
      key: "ireland",
      title: "Ireland Pilgrimage",
      contact: "office",
      pastoral: false,
      next: null,
      past: [],
    });
  });
});

describe("resolveCard — which moment is next", () => {
  const card = makeCard({
    moments: [
      moment({ label: "Final payment", when: "2026-11-01", after: "drop" }),
      moment({ label: "Information meeting", when: "2026-09-15T19:00" }),
      moment({ label: "Departure", when: "2027-03-01", after: "drop" }),
    ],
  });

  it("picks the earliest date still ahead", () => {
    const out = resolveCard(card, "2026-08-02");
    expect(out!.next).toMatchObject({
      label: "Information meeting",
      where: "the Church",
      when: "2026-09-15T19:00",
    });
  });

  it("moves on once that one has passed", () => {
    expect(resolveCard(card, "2026-09-16")!.next!.label).toBe("Final payment");
  });

  it("counts a moment falling today as still ahead", () => {
    // This is why "archive the day after" works — a card survives its own
    // feast rather than disappearing on the morning of it.
    expect(resolveCard(card, "2026-09-15")!.next!.label).toBe(
      "Information meeting",
    );
  });

  it("ignores time of day when deciding past from future", () => {
    // A 7pm meeting is still "next" at 11pm on the day.
    expect(resolveCard(card, "2026-09-15")!.next!.when).toBe(
      "2026-09-15T19:00",
    );
  });

  it("breaks a date tie on array order", () => {
    const tied = makeCard({
      moments: [
        moment({ label: "First", when: "2026-09-15" }),
        moment({ label: "Second", when: "2026-09-15" }),
      ],
    });
    expect(resolveCard(tied, "2026-08-02")!.next!.label).toBe("First");
  });

  it("leaves next null once everything has gone by", () => {
    const out = resolveCard(card, "2030-01-01");
    expect(out).not.toBeNull();
    expect(out!.next).toBeNull();
  });
});

describe("resolveCard — what happens after a moment passes", () => {
  it("drop forgets it entirely", () => {
    const card = makeCard({
      moments: [moment({ label: "Gone", when: "2020-01-01", after: "drop" })],
    });
    const out = resolveCard(card, "2026-08-02");
    expect(out!.past).toEqual([]);
    expect(out!.next).toBeNull();
  });

  it("note keeps the label so the card can say it has happened", () => {
    const card = makeCard({
      moments: [
        moment({ label: "Information meeting", when: "2020-01-01", after: "note" }),
      ],
    });
    expect(resolveCard(card, "2026-08-02")!.past).toEqual([
      "Information meeting",
    ]);
  });

  it("archive takes the whole card out of the index", () => {
    const card = makeCard({
      moments: [moment({ label: "Ash Wednesday", when: "2026-02-18", after: "archive" })],
    });
    expect(resolveCard(card, "2026-02-19")).toBeNull();
  });

  it("archives the day after, not the day of", () => {
    const card = makeCard({
      moments: [moment({ label: "Ash Wednesday", when: "2026-02-18", after: "archive" })],
    });
    expect(resolveCard(card, "2026-02-18")).not.toBeNull();
    expect(resolveCard(card, "2026-02-19")).toBeNull();
  });

  it("archive wins over everything else on the card", () => {
    const card = makeCard({
      moments: [
        moment({ label: "Kept", when: "2020-01-01", after: "note" }),
        moment({ label: "Done", when: "2020-06-01", after: "archive" }),
        moment({ label: "Ahead", when: "2030-01-01", after: "drop" }),
      ],
    });
    expect(resolveCard(card, "2026-08-02")).toBeNull();
  });

  it("collects several notes in order", () => {
    const card = makeCard({
      moments: [
        moment({ label: "First", when: "2020-01-01", after: "note" }),
        moment({ label: "Second", when: "2021-01-01", after: "note" }),
      ],
    });
    expect(resolveCard(card, "2026-08-02")!.past).toEqual(["First", "Second"]);
  });

  it("a rolling moment never notes and never archives", () => {
    const card = makeCard({
      moments: [
        moment({ label: "Rolls", when: "2020-01-01", after: "roll" }),
      ],
    });
    const out = resolveCard(card, "2026-08-02");
    expect(out!.past).toEqual([]);
    expect(out!.next).not.toBeNull();
  });

  it("skips a moment whose rule cannot be resolved", () => {
    const card = makeCard({
      moments: [
        moment({
          label: "Broken",
          when: "2026-02-02",
          after: "roll",
          rule: "candlemas" as Moment["rule"],
        }),
        moment({ label: "Fine", when: "2026-09-15" }),
      ],
    });
    expect(resolveCard(card, "2026-08-02")!.next!.label).toBe("Fine");
  });
});

/**
 * NEW BEHAVIOUR — the activation window.
 *
 * Six seed cards carried notes like "Activate 3 weeks before, archive the
 * day after" and lived in a group called "Seasonal, activates on its own".
 * Nothing implemented it: the Christmas card was findable in June.
 */
describe("the activation window", () => {
  const christmas = makeCard({
    key: "christmas",
    activation: { rule: "christmas", leadDays: 24, trailDays: 7 },
  });

  it("keeps a card with no window findable all year", () => {
    expect(isActive(makeCard(), "2026-06-15")).toBe(true);
    expect(isActive(makeCard(), "2026-12-25")).toBe(true);
  });

  it("hides the Christmas card in June", () => {
    expect(isActive(christmas, "2026-06-15")).toBe(false);
    expect(resolveCard(christmas, "2026-06-15")).toBeNull();
  });

  it("opens it on the lead day and not before", () => {
    expect(isActive(christmas, "2026-11-30")).toBe(false);
    expect(isActive(christmas, "2026-12-01")).toBe(true);
  });

  it("keeps it through the feast and the trail", () => {
    expect(isActive(christmas, "2026-12-25")).toBe(true);
    expect(isActive(christmas, "2027-01-01")).toBe(true);
    expect(isActive(christmas, "2027-01-02")).toBe(false);
  });

  it("reopens the following year", () => {
    expect(isActive(christmas, "2027-12-01")).toBe(true);
  });

  it("handles a window that straddles new year", () => {
    // Advent 2026 starts Nov 29. A three-week lead opens Nov 8.
    const advent = makeCard({
      key: "advent",
      activation: { rule: "advent_start", leadDays: 21, trailDays: 28 },
    });
    expect(isActive(advent, "2026-11-07")).toBe(false);
    expect(isActive(advent, "2026-11-08")).toBe(true);
    expect(isActive(advent, "2026-12-27")).toBe(true);
    expect(isActive(advent, "2026-12-28")).toBe(false);
  });

  it("handles a moveable feast", () => {
    // Ash Wednesday 2027 is Feb 10. Three weeks before is Jan 20.
    const ash = makeCard({
      key: "ash-wednesday",
      activation: { rule: "ash_wednesday", leadDays: 21, trailDays: 0 },
    });
    expect(isActive(ash, "2027-01-19")).toBe(false);
    expect(isActive(ash, "2027-01-20")).toBe(true);
    expect(isActive(ash, "2027-02-10")).toBe(true);
    expect(isActive(ash, "2027-02-11")).toBe(false);
  });

  it("treats a negative lead or trail as zero rather than inverting", () => {
    const odd = makeCard({
      activation: { rule: "christmas", leadDays: -5, trailDays: -5 },
    });
    expect(isActive(odd, "2026-12-25")).toBe(true);
    expect(isActive(odd, "2026-12-24")).toBe(false);
    expect(isActive(odd, "2026-12-26")).toBe(false);
  });

  it("closes the card even when a moment is still ahead", () => {
    // The window is the outer gate. A card out of season does not appear
    // just because it has a future date on it.
    const seasonal = makeCard({
      activation: { rule: "christmas", leadDays: 24, trailDays: 7 },
      moments: [moment({ label: "Carols", when: "2026-12-24" })],
    });
    expect(resolveCard(seasonal, "2026-06-15")).toBeNull();
    expect(resolveCard(seasonal, "2026-12-05")).not.toBeNull();
  });
});
