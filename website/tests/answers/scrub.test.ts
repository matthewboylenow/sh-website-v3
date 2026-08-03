import { describe, expect, it } from "vitest";
import {
  MAX_WANTED_LENGTH,
  REDACTED,
  scrubFreeText,
  scrubQuery,
} from "@/lib/answers/scrub";

/**
 * This is the only place the site keeps something a member of the public
 * typed. A parish is exactly where somebody writes about grief, an
 * annulment, or money trouble, so the scrub gets tested hard in both
 * directions: what must go, and what must survive.
 *
 * Stated plainly, as the original did: this handles the ordinary case of
 * someone helpfully adding their number. It is not a guarantee.
 */

describe("what must not survive", () => {
  it("removes email addresses", () => {
    expect(scrubFreeText("email me at matthew@adventii.com please")).toBe(
      `email me at ${REDACTED} please`,
    );
    expect(scrubFreeText("first.last+tag@sainthelen.org")).toBe(REDACTED);
  });

  it("removes phone numbers however they are written", () => {
    for (const phone of [
      "908-232-1214",
      "(908) 232-1214",
      "908 232 1214",
      "908.232.1214",
      "9082321214",
      "+1 908 232 1214",
      "+1-908-232-1214",
    ]) {
      expect(scrubFreeText(`call me on ${phone} thanks`), phone).toBe(
        `call me on ${REDACTED} thanks`,
      );
    }
  });

  it("removes a social security number", () => {
    expect(scrubFreeText("my ssn is 123-45-6789")).toBe(`my ssn is ${REDACTED}`);
    expect(scrubFreeText("123456789")).toBe(REDACTED);
  });

  it("removes long digit runs like an account or card number", () => {
    expect(scrubFreeText("account 4111111111111111")).toBe(
      `account ${REDACTED}`,
    );
    expect(scrubFreeText("ref 1234567")).toBe(`ref ${REDACTED}`);
  });

  it("strips markup so a tag cannot hide a number from the patterns", () => {
    expect(scrubFreeText("call <b>908-232-1214</b>")).toBe(`call ${REDACTED}`);
    expect(scrubFreeText("<script>alert(1)</script>hello")).toContain("hello");
    expect(scrubFreeText("<b>hi</b>")).toBe("hi");
  });
});

describe("what must survive", () => {
  it("keeps times, which is most of what people ask about", () => {
    expect(scrubFreeText("is there a 5:30 mass")).toBe("is there a 5:30 mass");
    expect(scrubFreeText("the 10:30am mass")).toBe("the 10:30am mass");
    expect(scrubFreeText("mass at 8am and noon")).toBe("mass at 8am and noon");
  });

  it("keeps dates", () => {
    expect(scrubFreeText("is there a mass on 12/25")).toBe(
      "is there a mass on 12/25",
    );
    expect(scrubFreeText("December 25 2026")).toBe("December 25 2026");
    expect(scrubFreeText("Dec 8")).toBe("Dec 8");
  });

  it("keeps a list of Mass times", () => {
    // FIX: the WordPress phone pattern was "ten or more characters of digits
    // and separators", which ate this entire line.
    expect(scrubFreeText("mass at 8 9 10 11 12 1")).toBe(
      "mass at 8 9 10 11 12 1",
    );
    expect(scrubFreeText("psalm 118 . 1 - 4 . 22")).toBe("psalm 118 . 1 - 4 . 22");
    expect(scrubFreeText("2024 2025 2026 2027")).toBe("2024 2025 2026 2027");
  });

  it("keeps a zip code and a street number", () => {
    expect(scrubFreeText("we are in 07090")).toBe("we are in 07090");
    expect(scrubFreeText("1600 Rahway Ave")).toBe("1600 Rahway Ave");
  });

  it("keeps the ordinary sentence somebody actually types", () => {
    const s = "I wanted to know if there is a Mass for my mother's anniversary";
    expect(scrubFreeText(s)).toBe(s);
  });
});

describe("shape of the output", () => {
  it("collapses whitespace and trims", () => {
    expect(scrubFreeText("  too   many\n\nspaces  ")).toBe("too many spaces");
  });

  it("caps at 300 characters, after redaction", () => {
    const long = "a".repeat(400);
    expect(scrubFreeText(long)).toHaveLength(MAX_WANTED_LENGTH);
  });

  it("counts by character, so an emoji is not cut in half", () => {
    const out = scrubFreeText("👋".repeat(400));
    expect([...out]).toHaveLength(MAX_WANTED_LENGTH);
  });

  it("handles empty and non-string input", () => {
    expect(scrubFreeText("")).toBe("");
    expect(scrubFreeText(null)).toBe("");
    expect(scrubFreeText(undefined)).toBe("");
    expect(scrubFreeText("    ")).toBe("");
  });

  it("is idempotent", () => {
    const once = scrubFreeText("call 908-232-1214 or email a@b.com");
    expect(scrubFreeText(once)).toBe(once);
  });
});

describe("scrubQuery", () => {
  it("applies the same scrub to the search box", () => {
    // FIX: WordPress scrubbed only the follow-up sentence and kept the raw
    // search term for 400 days. Somebody who types their number into the
    // search box rather than the feedback box deserves the same treatment.
    expect(scrubQuery("mass times 908-232-1214")).toBe(`mass times ${REDACTED}`);
  });

  it("caps a search term at 190 characters", () => {
    expect(scrubQuery("a".repeat(400))).toHaveLength(190);
  });

  it("leaves an ordinary search alone", () => {
    expect(scrubQuery("what time is mass on sunday")).toBe(
      "what time is mass on sunday",
    );
  });
});
