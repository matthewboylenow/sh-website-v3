import { describe, expect, it } from "vitest";
import {
  PARISH_TZ,
  formatInParish,
  fromParishWallClock,
  parishDateString,
  parishOffsetMinutes,
  toParishWallClock,
} from "@/lib/timezone";

/**
 * The parish clock. Everything in the recurrence engine now rests on this,
 * so it gets tested across both daylight-saving boundaries in both
 * directions, plus the two mornings that do not behave like ordinary days.
 *
 * 2026: clocks go forward Sunday 8 March, back Sunday 1 November.
 * 2027: forward Sunday 14 March, back Sunday 7 November.
 */

describe("toParishWallClock", () => {
  it("reads a summer instant as Eastern Daylight Time", () => {
    // 23:00 UTC on 5 August is 7pm in Westfield.
    expect(toParishWallClock(new Date("2026-08-05T23:00:00Z"))).toEqual({
      year: 2026,
      month: 8,
      day: 5,
      hour: 19,
      minute: 0,
    });
  });

  it("reads a winter instant as Eastern Standard Time", () => {
    // 00:00 UTC on 6 January is 7pm on the 5th in Westfield.
    expect(toParishWallClock(new Date("2026-01-06T00:00:00Z"))).toEqual({
      year: 2026,
      month: 1,
      day: 5,
      hour: 19,
      minute: 0,
    });
  });

  it("handles midnight without rendering it as hour 24", () => {
    expect(toParishWallClock(new Date("2026-08-05T04:00:00Z")).hour).toBe(0);
  });
});

describe("parishOffsetMinutes", () => {
  it("is -240 in summer and -300 in winter", () => {
    expect(parishOffsetMinutes(new Date("2026-08-05T12:00:00Z"))).toBe(-240);
    expect(parishOffsetMinutes(new Date("2026-01-05T12:00:00Z"))).toBe(-300);
  });

  it("changes at the right instant in spring", () => {
    // 2026-03-08, 07:00 UTC is 2:00am EST — the moment clocks jump to 3am.
    expect(parishOffsetMinutes(new Date("2026-03-08T06:59:00Z"))).toBe(-300);
    expect(parishOffsetMinutes(new Date("2026-03-08T07:00:00Z"))).toBe(-240);
  });

  it("changes at the right instant in autumn", () => {
    // 2026-11-01, 06:00 UTC is 2:00am EDT — clocks fall back to 1am.
    expect(parishOffsetMinutes(new Date("2026-11-01T05:59:00Z"))).toBe(-240);
    expect(parishOffsetMinutes(new Date("2026-11-01T06:00:00Z"))).toBe(-300);
  });
});

describe("fromParishWallClock", () => {
  const wall = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute = 0,
  ) => ({ year, month, day, hour, minute });

  it("converts a summer evening", () => {
    expect(fromParishWallClock(wall(2026, 8, 5, 19)).toISOString()).toBe(
      "2026-08-05T23:00:00.000Z",
    );
  });

  it("converts a winter evening", () => {
    expect(fromParishWallClock(wall(2026, 1, 5, 19)).toISOString()).toBe(
      "2026-01-06T00:00:00.000Z",
    );
  });

  it("round-trips through the wall clock for any instant", () => {
    for (const iso of [
      "2026-01-15T18:30:00Z",
      "2026-06-21T12:00:00Z",
      "2026-03-08T12:00:00Z",
      "2026-11-01T12:00:00Z",
      "2027-12-25T05:00:00Z",
    ]) {
      const instant = new Date(iso);
      const back = fromParishWallClock(toParishWallClock(instant));
      expect(back.toISOString(), iso).toBe(instant.toISOString());
    }
  });

  it("keeps 7pm at 7pm on both sides of the spring change", () => {
    // This is the whole point. A 7pm event stays 7pm; the UTC instant moves.
    const before = fromParishWallClock(wall(2026, 3, 7, 19));
    const after = fromParishWallClock(wall(2026, 3, 9, 19));
    expect(before.toISOString()).toBe("2026-03-08T00:00:00.000Z");
    expect(after.toISOString()).toBe("2026-03-09T23:00:00.000Z");
    expect(toParishWallClock(before).hour).toBe(19);
    expect(toParishWallClock(after).hour).toBe(19);
  });

  it("keeps 7pm at 7pm on both sides of the autumn change", () => {
    const before = fromParishWallClock(wall(2026, 10, 31, 19));
    const after = fromParishWallClock(wall(2026, 11, 2, 19));
    expect(before.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(after.toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });

  describe("the two awkward mornings", () => {
    it("resolves a time that does not exist to the moment clocks jump to", () => {
      // 2:30am on 8 March 2026 never happens.
      const resolved = fromParishWallClock(wall(2026, 3, 8, 2, 30));
      expect(toParishWallClock(resolved)).toMatchObject({ hour: 3, minute: 30 });
    });

    it("resolves a time that happens twice to the first one", () => {
      // 1:30am on 1 November 2026 happens twice. Somebody scheduling an
      // event means the first.
      const resolved = fromParishWallClock(wall(2026, 11, 1, 1, 30));
      expect(resolved.toISOString()).toBe("2026-11-01T05:30:00.000Z");
      expect(toParishWallClock(resolved)).toMatchObject({ hour: 1, minute: 30 });
    });
  });
});

describe("parishDateString", () => {
  it("uses the parish day, not the UTC day", () => {
    // 01:00 UTC on 3 August is still the evening of the 2nd in Westfield.
    expect(parishDateString(new Date("2026-08-03T01:00:00Z"))).toBe("2026-08-02");
  });

  it("rolls at parish midnight", () => {
    expect(parishDateString(new Date("2026-08-03T03:59:00Z"))).toBe("2026-08-02");
    expect(parishDateString(new Date("2026-08-03T04:01:00Z"))).toBe("2026-08-03");
  });

  it("pads single digits", () => {
    expect(parishDateString(new Date("2026-01-05T15:00:00Z"))).toBe("2026-01-05");
  });
});

describe("formatInParish", () => {
  it("formats on the parish clock regardless of the machine", () => {
    const t = new Date("2026-01-06T00:00:00Z");
    expect(
      formatInParish(t, { hour: "numeric", minute: "2-digit", hour12: true }),
    ).toBe("7:00 PM");
    expect(formatInParish(t, { weekday: "long" })).toBe("Monday");
  });
});

describe("the constant", () => {
  it("names Westfield's zone", () => {
    expect(PARISH_TZ).toBe("America/New_York");
  });
});

describe("lib/dates on the parish clock", () => {
  it("groups by the parish month, not the UTC one", async () => {
    const { monthKey } = await import("@/lib/dates");
    // 00:30Z on 1 September is 8:30pm on 31 August in Westfield, so this
    // event belongs to August.
    expect(monthKey(new Date("2026-09-01T00:30:00Z"))).toBe("2026-08");
    expect(monthKey(new Date("2026-09-01T13:00:00Z"))).toBe("2026-09");
  });

  it("emits a real calendar month, not a zero-indexed one", async () => {
    const { monthKey } = await import("@/lib/dates");
    // The old version returned "2026-07" for an August date, and the events
    // page compensated by using the value as a month index.
    expect(monthKey(new Date("2026-08-15T16:00:00Z"))).toBe("2026-08");
    expect(monthKey(new Date("2026-01-15T16:00:00Z"))).toBe("2026-01");
  });

  it("formats the time of day on the parish clock", async () => {
    const { formatTimeOfDay, formatWeekdayLong } = await import("@/lib/dates");
    const evening = new Date("2026-01-06T00:00:00Z");
    expect(formatTimeOfDay(evening)).toBe("7:00 PM");
    expect(formatWeekdayLong(evening)).toBe("Monday");
  });
});
