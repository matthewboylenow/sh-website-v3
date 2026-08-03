import { describe, expect, it } from "vitest";
import {
  filterLinks,
  isBlocked,
  normalizeBlockUrl,
  type BlockRule,
} from "@/lib/answers/blocklist";

/**
 * The real case this exists for: the baptism form. Tracey sends it privately
 * after speaking with a family, and it must never turn up in a search result
 * even though the URL works. Everything here is about closing the ways a URL
 * can be spelled differently and slip past.
 */

const rules: BlockRule[] = [
  {
    url: "https://sainthelen.org/baptism/",
    reason: "Sent privately after a conversation. Must never be discoverable.",
    match: "children",
  },
  {
    url: "https://sainthelen.org/staff-only",
    reason: "Internal.",
    match: "exact",
  },
];

describe("normalizeBlockUrl", () => {
  it("strips the scheme", () => {
    expect(normalizeBlockUrl("https://sainthelen.org/x")).toBe(
      "sainthelen.org/x",
    );
    expect(normalizeBlockUrl("http://sainthelen.org/x")).toBe(
      "sainthelen.org/x",
    );
  });

  it("strips www and lowercases the host", () => {
    expect(normalizeBlockUrl("https://WWW.SaintHelen.ORG/x")).toBe(
      "sainthelen.org/x",
    );
  });

  it("strips every trailing slash", () => {
    expect(normalizeBlockUrl("https://sainthelen.org/x///")).toBe(
      "sainthelen.org/x",
    );
  });

  it("strips query strings and fragments", () => {
    // FIX: WordPress left these on, so /baptism?src=email normalised to
    // something the blocklist did not recognise and was served.
    expect(normalizeBlockUrl("https://sainthelen.org/baptism?src=email")).toBe(
      "sainthelen.org/baptism",
    );
    expect(normalizeBlockUrl("https://sainthelen.org/baptism#form")).toBe(
      "sainthelen.org/baptism",
    );
  });

  it("preserves path case", () => {
    // FIX: WordPress lowercased the whole URL, silently conflating two
    // different pages on a case-sensitive origin.
    expect(normalizeBlockUrl("https://sainthelen.org/Baptism")).toBe(
      "sainthelen.org/Baptism",
    );
  });

  it("handles a bare host and empty input", () => {
    expect(normalizeBlockUrl("https://sainthelen.org")).toBe("sainthelen.org");
    expect(normalizeBlockUrl("")).toBe("");
    expect(normalizeBlockUrl(null)).toBe("");
    expect(normalizeBlockUrl("   ")).toBe("");
  });
});

describe("isBlocked", () => {
  it("blocks the exact URL", () => {
    expect(isBlocked(rules, "https://sainthelen.org/baptism/")).toBe(true);
  });

  it("blocks it however it is spelled", () => {
    for (const url of [
      "http://sainthelen.org/baptism",
      "https://www.sainthelen.org/baptism/",
      "https://WWW.SAINTHELEN.ORG/baptism///",
      "sainthelen.org/baptism",
    ]) {
      expect(isBlocked(rules, url), url).toBe(true);
    }
  });

  it("blocks it with a tracking parameter attached", () => {
    expect(isBlocked(rules, "https://sainthelen.org/baptism?src=email")).toBe(
      true,
    );
    expect(isBlocked(rules, "https://sainthelen.org/baptism/?utm=x")).toBe(true);
    expect(isBlocked(rules, "https://sainthelen.org/baptism#top")).toBe(true);
  });

  it("blocks children when the rule says so", () => {
    expect(isBlocked(rules, "https://sainthelen.org/baptism/form")).toBe(true);
    expect(isBlocked(rules, "https://sainthelen.org/baptism/form/step-2")).toBe(
      true,
    );
  });

  it("does not treat a sibling path as a child", () => {
    // /baptism-forms/ is a different page and must stay findable.
    expect(isBlocked(rules, "https://sainthelen.org/baptism-forms/")).toBe(
      false,
    );
    expect(isBlocked(rules, "https://sainthelen.org/baptismal-font")).toBe(
      false,
    );
  });

  it("does not block children of an exact-only rule", () => {
    expect(isBlocked(rules, "https://sainthelen.org/staff-only")).toBe(true);
    expect(isBlocked(rules, "https://sainthelen.org/staff-only/rota")).toBe(
      false,
    );
  });

  it("leaves ordinary pages alone", () => {
    expect(isBlocked(rules, "https://sainthelen.org/mass")).toBe(false);
    expect(isBlocked(rules, "https://example.org/baptism/")).toBe(false);
  });

  it("returns false for empty input and an empty rule list", () => {
    expect(isBlocked(rules, "")).toBe(false);
    expect(isBlocked(rules, null)).toBe(false);
    expect(isBlocked([], "https://sainthelen.org/baptism/")).toBe(false);
  });

  it("ignores a rule with an empty url", () => {
    const withJunk: BlockRule[] = [
      { url: "", reason: "", match: "children" },
      ...rules,
    ];
    expect(isBlocked(withJunk, "https://sainthelen.org/mass")).toBe(false);
    expect(isBlocked(withJunk, "https://sainthelen.org/baptism/")).toBe(true);
  });
});

describe("filterLinks", () => {
  const links = [
    { label: "Mass times", url: "https://sainthelen.org/mass" },
    { label: "Baptism form", url: "https://sainthelen.org/baptism/form" },
    { label: "Empty", url: "" },
  ];

  it("drops blocked and empty links, keeps the rest", () => {
    expect(filterLinks(rules, links)).toEqual([
      { label: "Mass times", url: "https://sainthelen.org/mass" },
    ]);
  });

  it("hides links already stored on a card once a rule is added", () => {
    // Enforcement at render is what makes a new rule retroactive without
    // anyone having to go and edit old cards.
    const before = filterLinks([], links);
    expect(before).toHaveLength(2);
    expect(filterLinks(rules, links)).toHaveLength(1);
  });

  it("returns an empty list rather than throwing on no links", () => {
    expect(filterLinks(rules, [])).toEqual([]);
  });
});
