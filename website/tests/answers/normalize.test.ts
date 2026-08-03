import { describe, expect, it } from "vitest";
import { normalizeQuery, tokenize } from "@/lib/answers/normalize";

/**
 * Normalisation is the first thing a query meets. Everything downstream —
 * the scoring ladder, the dead-ends report, the trigger comparisons — runs
 * on its output, so a change here silently changes all of them.
 */

describe("normalizeQuery", () => {
  it("lowercases", () => {
    expect(normalizeQuery("Mass Times")).toBe("mass times");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeQuery("  mass    times \n")).toBe("mass times");
  });

  it("replaces punctuation with a space rather than deleting it", () => {
    // "mass/times" must become two words, not one. This is the difference
    // between matching the mass-times card and matching nothing.
    expect(normalizeQuery("mass/times")).toBe("mass times");
    expect(normalizeQuery("mass-times")).toBe("mass times");
    expect(normalizeQuery("mass, times?")).toBe("mass times");
  });

  it("keeps straight apostrophes", () => {
    expect(normalizeQuery("st helen's")).toBe("st helen's");
  });

  it("folds curly apostrophes to straight ones", () => {
    // WordPress dropped the curly one and split the word, so a phone
    // keyboard's default apostrophe matched differently from a laptop's.
    expect(normalizeQuery("st helen’s")).toBe("st helen's");
    expect(normalizeQuery("st helen’s")).toBe(normalizeQuery("st helen's"));
  });

  it("folds accents", () => {
    expect(normalizeQuery("Café")).toBe("cafe");
    expect(normalizeQuery("Msgr. Tomás")).toBe("msgr tomas");
  });

  it("keeps digits", () => {
    expect(normalizeQuery("5:30 mass")).toBe("5 30 mass");
    expect(normalizeQuery("2026")).toBe("2026");
  });

  it("does not remove stop words", () => {
    expect(normalizeQuery("when is the mass")).toBe("when is the mass");
  });

  it("does not stem or fold plurals", () => {
    expect(normalizeQuery("baptisms")).toBe("baptisms");
    expect(normalizeQuery("baptisms")).not.toBe(normalizeQuery("baptism"));
  });

  it("handles empty and non-string input without throwing", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(normalizeQuery("!!!")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeQuery("St. Helen's — Mass/Times?");
    expect(normalizeQuery(once)).toBe(once);
  });
});

describe("tokenize", () => {
  it("splits on spaces", () => {
    expect(tokenize("mass times sunday")).toEqual(["mass", "times", "sunday"]);
  });

  it("returns nothing for an empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("drops empty tokens", () => {
    expect(tokenize("mass  times")).toEqual(["mass", "times"]);
  });
});
