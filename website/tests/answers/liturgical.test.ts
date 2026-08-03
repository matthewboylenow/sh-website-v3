import { describe, expect, it } from "vitest";
import {
  dateFor,
  easter,
  isLiturgicalRule,
  nextOccurrence,
  shiftDays,
} from "@/lib/answers/liturgical";

/**
 * The liturgical calendar is what lets a seasonal card be written once and
 * left alone. If it drifts, the Ash Wednesday card announces the wrong date
 * to the whole parish, in public, on the homepage.
 *
 * Every date below was cross-checked against the published calendar.
 */

describe("easter", () => {
  it("computes the right date for the next several years", () => {
    expect(easter(2025)).toBe("2025-04-20");
    expect(easter(2026)).toBe("2026-04-05");
    expect(easter(2027)).toBe("2027-03-28");
    expect(easter(2028)).toBe("2028-04-16");
    expect(easter(2029)).toBe("2029-04-01");
    expect(easter(2030)).toBe("2030-04-21");
  });

  it("handles the known awkward years", () => {
    expect(easter(2038)).toBe("2038-04-25"); // latest possible
    expect(easter(2008)).toBe("2008-03-23"); // very early
    expect(easter(2000)).toBe("2000-04-23"); // century boundary
  });

  it("always lands on a Sunday", () => {
    for (let y = 2025; y <= 2060; y++) {
      const d = new Date(`${easter(y)}T00:00:00Z`);
      expect(d.getUTCDay(), `Easter ${y} should be a Sunday`).toBe(0);
    }
  });

  it("always falls between March 22 and April 25", () => {
    for (let y = 2025; y <= 2060; y++) {
      const md = easter(y).slice(5);
      expect(md >= "03-22" && md <= "04-25", `Easter ${y} = ${md}`).toBe(true);
    }
  });
});

describe("dateFor", () => {
  it("places the moveable feasts around Easter", () => {
    expect(dateFor("ash_wednesday", 2026)).toBe("2026-02-18");
    expect(dateFor("palm_sunday", 2026)).toBe("2026-03-29");
    expect(dateFor("holy_thursday", 2026)).toBe("2026-04-02");
    expect(dateFor("good_friday", 2026)).toBe("2026-04-03");
    expect(dateFor("easter", 2026)).toBe("2026-04-05");
    expect(dateFor("pentecost", 2026)).toBe("2026-05-24");
  });

  it("matches the dates written on the seed cards", () => {
    // The Ash Wednesday card's own note says: 2027 Feb 10, 2028 Mar 1,
    // 2029 Feb 14. The Holy Week card says 2027 Mar 28, 2028 Apr 16.
    expect(dateFor("ash_wednesday", 2027)).toBe("2027-02-10");
    expect(dateFor("ash_wednesday", 2028)).toBe("2028-03-01");
    expect(dateFor("ash_wednesday", 2029)).toBe("2029-02-14");
    expect(dateFor("easter", 2027)).toBe("2027-03-28");
    expect(dateFor("easter", 2028)).toBe("2028-04-16");
  });

  it("places the fixed feasts", () => {
    expect(dateFor("christmas", 2026)).toBe("2026-12-25");
    expect(dateFor("immaculate", 2026)).toBe("2026-12-08");
    expect(dateFor("all_saints", 2026)).toBe("2026-11-01");
    expect(dateFor("all_souls", 2026)).toBe("2026-11-02");
  });

  it("finds the fourth Sunday before Christmas for Advent", () => {
    expect(dateFor("advent_start", 2025)).toBe("2025-11-30");
    expect(dateFor("advent_start", 2026)).toBe("2026-11-29");
    expect(dateFor("advent_start", 2027)).toBe("2027-11-28");
    expect(dateFor("advent_start", 2029)).toBe("2029-12-02");
  });

  it("goes back a full week when Christmas is itself a Sunday", () => {
    // 2028: Christmas falls on a Monday, giving the latest possible Advent.
    expect(dateFor("advent_start", 2028)).toBe("2028-12-03");
    // 2027: Christmas on a Saturday.
    expect(dateFor("advent_start", 2027)).toBe("2027-11-28");
  });

  it("always puts Advent on a Sunday", () => {
    for (let y = 2025; y <= 2060; y++) {
      const d = new Date(`${dateFor("advent_start", y)}T00:00:00Z`);
      expect(d.getUTCDay(), `Advent ${y} should start on a Sunday`).toBe(0);
    }
  });

  it("returns null for a rule it does not know", () => {
    expect(dateFor("corpus_christi", 2026)).toBeNull();
    expect(dateFor("", 2026)).toBeNull();
    expect(dateFor("EASTER", 2026)).toBeNull();
  });
});

describe("shiftDays", () => {
  it("crosses a month boundary", () => {
    expect(shiftDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("crosses a year boundary", () => {
    expect(shiftDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("handles a leap day", () => {
    expect(shiftDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("is unaffected by the machine's timezone", () => {
    // The suite runs in America/New_York. If this used local-time accessors
    // it would be off by one for half the year.
    expect(shiftDays("2026-03-08", 1)).toBe("2026-03-09"); // US DST start
    expect(shiftDays("2026-11-01", 1)).toBe("2026-11-02"); // US DST end
  });
});

describe("nextOccurrence", () => {
  it("returns this year's feast when it is still ahead", () => {
    expect(nextOccurrence("christmas", "2026-08-02")).toBe("2026-12-25");
  });

  it("rolls to next year once the feast has passed", () => {
    expect(nextOccurrence("christmas", "2026-12-26")).toBe("2027-12-25");
  });

  it("counts the feast day itself as still ahead", () => {
    expect(nextOccurrence("christmas", "2026-12-25")).toBe("2026-12-25");
  });

  it("rolls a moveable feast correctly", () => {
    expect(nextOccurrence("easter", "2026-04-06")).toBe("2027-03-28");
    expect(nextOccurrence("ash_wednesday", "2026-03-01")).toBe("2027-02-10");
  });

  it("returns null for an unknown rule rather than vanishing silently", () => {
    // WordPress returned an empty string here and the caller treated it as
    // "this moment does not exist", so a typo'd rule made the line disappear
    // with no error anywhere.
    expect(nextOccurrence("candlemas", "2026-08-02")).toBeNull();
  });
});

describe("isLiturgicalRule", () => {
  it("accepts the eleven known rules", () => {
    expect(isLiturgicalRule("easter")).toBe(true);
    expect(isLiturgicalRule("advent_start")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLiturgicalRule("corpus_christi")).toBe(false);
    expect(isLiturgicalRule("")).toBe(false);
    expect(isLiturgicalRule(null)).toBe(false);
    expect(isLiturgicalRule(42)).toBe(false);
  });
});
