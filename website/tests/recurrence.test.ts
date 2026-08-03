import { describe, expect, it } from "vitest";
import type { Recurrence } from "@/db/schema";
import {
  DEFAULT_HORIZON_MONTHS,
  expandEvent,
  expandEvents,
  summarizeRecurrence,
} from "@/lib/recurrence";

/**
 * Recurrence expansion is the single most load-bearing pure function on the
 * site. If it drifts, a Mass or a ministry meeting silently stops appearing
 * on /events and nobody finds out until someone shows up to an empty room.
 *
 * Every date here is a real 2026 calendar date, verified against the actual
 * weekday. The horizon dates are wide so a test failing means the rule broke,
 * not that the window clipped it.
 */

const iso = (d: Date) => d.toISOString();
const starts = (list: { startsAt: Date }[]) => list.map((i) => iso(i.startsAt));

/** Aug 5 2026 is a Wednesday. 7pm ET in August = 23:00Z. */
const WED_7PM = "2026-08-05T23:00:00.000Z";
const WED_830PM = "2026-08-06T00:30:00.000Z";

const WINDOW_FROM = new Date("2026-08-01T00:00:00.000Z");
const WINDOW_TO = new Date("2026-10-01T00:00:00.000Z");

const weekly = (over: Partial<Extract<Recurrence, { freq: "weekly" }>> = {}) =>
  ({
    freq: "weekly",
    interval: 1,
    byday: ["WE"],
    ends: { kind: "never" },
    ...over,
  }) satisfies Recurrence;

const monthly = (
  over: Partial<Extract<Recurrence, { freq: "monthly_nth" }>> = {},
) =>
  ({
    freq: "monthly_nth",
    interval: 1,
    nth: 2,
    weekday: "TU",
    ends: { kind: "never" },
    ...over,
  }) satisfies Recurrence;

describe("expandEvent — one-off events", () => {
  const base = { startsAt: WED_7PM, endsAt: WED_830PM };

  it("returns the single instance when it falls inside the window", () => {
    const out = expandEvent(base, null, [], WINDOW_FROM, WINDOW_TO);
    expect(out).toHaveLength(1);
    expect(iso(out[0]!.startsAt)).toBe(WED_7PM);
    expect(iso(out[0]!.endsAt)).toBe(WED_830PM);
    expect(out[0]!.isOriginal).toBe(true);
  });

  it("returns nothing when the event ended before the window opened", () => {
    const from = new Date("2026-09-01T00:00:00.000Z");
    expect(expandEvent(base, null, [], from, WINDOW_TO)).toHaveLength(0);
  });

  it("returns nothing when the event starts after the window closes", () => {
    const to = new Date("2026-07-01T00:00:00.000Z");
    expect(expandEvent(base, null, [], WINDOW_FROM, to)).toHaveLength(0);
  });

  it("keeps an event that straddles the window opening", () => {
    // An all-day-ish event that began before `from` but has not ended yet
    // should still show. This is what keeps a multi-day retreat on the page
    // on its second morning.
    const straddling = {
      startsAt: "2026-07-30T14:00:00.000Z",
      endsAt: "2026-08-02T20:00:00.000Z",
    };
    expect(
      expandEvent(straddling, null, [], WINDOW_FROM, WINDOW_TO),
    ).toHaveLength(1);
  });

  it("accepts Date objects as well as ISO strings", () => {
    const out = expandEvent(
      { startsAt: new Date(WED_7PM), endsAt: new Date(WED_830PM) },
      null,
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([WED_7PM]);
  });
});

describe("expandEvent — weekly rules", () => {
  const base = { startsAt: WED_7PM, endsAt: WED_830PM };

  it("emits every matching weekday inside the window", () => {
    const out = expandEvent(base, weekly(), [], WINDOW_FROM, WINDOW_TO);
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-12T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
      "2026-08-26T23:00:00.000Z",
      "2026-09-02T23:00:00.000Z",
      "2026-09-09T23:00:00.000Z",
      "2026-09-16T23:00:00.000Z",
      "2026-09-23T23:00:00.000Z",
      "2026-09-30T23:00:00.000Z",
    ]);
  });

  it("never emits an occurrence before the event's own start date", () => {
    // Window opens in July, the event starts in August. Nothing in July.
    const out = expandEvent(
      base,
      weekly(),
      [],
      new Date("2026-07-01T00:00:00.000Z"),
      WINDOW_TO,
    );
    expect(out.every((i) => i.startsAt >= new Date(WED_7PM))).toBe(true);
    expect(starts(out)[0]).toBe(WED_7PM);
  });

  it("marks only the original occurrence as isOriginal", () => {
    const out = expandEvent(base, weekly(), [], WINDOW_FROM, WINDOW_TO);
    expect(out.filter((i) => i.isOriginal)).toHaveLength(1);
    expect(iso(out.find((i) => i.isOriginal)!.startsAt)).toBe(WED_7PM);
  });

  it("preserves the event's duration on every occurrence", () => {
    const out = expandEvent(base, weekly(), [], WINDOW_FROM, WINDOW_TO);
    const expected = new Date(WED_830PM).getTime() - new Date(WED_7PM).getTime();
    for (const i of out) {
      expect(i.endsAt.getTime() - i.startsAt.getTime()).toBe(expected);
    }
  });

  it("handles a multi-day picker in calendar order within each week", () => {
    // Tuesday + Thursday, starting on a Tuesday.
    const tueBase = {
      startsAt: "2026-08-04T23:00:00.000Z",
      endsAt: "2026-08-05T00:00:00.000Z",
    };
    const out = expandEvent(
      tueBase,
      weekly({ byday: ["TU", "TH"] }),
      [],
      WINDOW_FROM,
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-04T23:00:00.000Z", // Tue
      "2026-08-06T23:00:00.000Z", // Thu
      "2026-08-11T23:00:00.000Z",
      "2026-08-13T23:00:00.000Z",
      "2026-08-18T23:00:00.000Z",
    ]);
  });

  it("respects interval — every other week skips a week", () => {
    const out = expandEvent(
      base,
      weekly({ interval: 2 }),
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
      "2026-09-02T23:00:00.000Z",
      "2026-09-16T23:00:00.000Z",
      "2026-09-30T23:00:00.000Z",
    ]);
  });

  it("treats interval 0 as interval 1 rather than looping forever", () => {
    const out = expandEvent(
      base,
      weekly({ interval: 0 }),
      [],
      WINDOW_FROM,
      new Date("2026-08-27T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-12T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
      "2026-08-26T23:00:00.000Z",
    ]);
  });

  it("stops after `count` occurrences", () => {
    const out = expandEvent(
      base,
      weekly({ ends: { kind: "count", count: 3 } }),
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-12T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
    ]);
  });

  it("counts occurrences across weekdays, not across weeks", () => {
    const tueBase = {
      startsAt: "2026-08-04T23:00:00.000Z",
      endsAt: "2026-08-05T00:00:00.000Z",
    };
    const out = expandEvent(
      tueBase,
      weekly({ byday: ["TU", "TH"], ends: { kind: "count", count: 3 } }),
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([
      "2026-08-04T23:00:00.000Z",
      "2026-08-06T23:00:00.000Z",
      "2026-08-11T23:00:00.000Z",
    ]);
  });

  it("stops at an `until` date", () => {
    const out = expandEvent(
      base,
      weekly({ ends: { kind: "until", until: "2026-08-19" } }),
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-12T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
    ]);
  });

  it("returns nothing when no weekday is selected", () => {
    expect(
      expandEvent(base, weekly({ byday: [] }), [], WINDOW_FROM, WINDOW_TO),
    ).toHaveLength(0);
  });

  it("stays inside the window it was given", () => {
    const to = new Date("2026-08-20T00:00:00.000Z");
    const out = expandEvent(base, weekly(), [], WINDOW_FROM, to);
    expect(out.every((i) => i.startsAt <= to)).toBe(true);
    expect(starts(out).at(-1)).toBe("2026-08-19T23:00:00.000Z");
  });
});

describe("expandEvent — exception dates", () => {
  const base = { startsAt: WED_7PM, endsAt: WED_830PM };

  it("skips a cancelled occurrence and keeps the rest", () => {
    const out = expandEvent(
      base,
      weekly(),
      ["2026-08-12T23:00:00.000Z"],
      WINDOW_FROM,
      new Date("2026-08-27T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
      "2026-08-26T23:00:00.000Z",
    ]);
  });

  it("can cancel the original occurrence itself", () => {
    const out = expandEvent(
      base,
      weekly(),
      [WED_7PM],
      WINDOW_FROM,
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(out.some((i) => i.isOriginal)).toBe(false);
    expect(starts(out)).toEqual([
      "2026-08-12T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
    ]);
  });

  it("accepts an exception written with a non-UTC offset", () => {
    // 7pm America/New_York in August is 23:00Z. Same instant, different
    // spelling — the Set is keyed on the normalised ISO string, so this works.
    const out = expandEvent(
      base,
      weekly(),
      ["2026-08-12T19:00:00.000-04:00"],
      WINDOW_FROM,
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
    ]);
  });

  it("ignores an exception for a date the rule never generates", () => {
    const out = expandEvent(
      base,
      weekly(),
      ["2026-08-13T23:00:00.000Z"], // a Thursday, rule is Wednesdays
      WINDOW_FROM,
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-12T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
    ]);
  });
});

describe("expandEvent — monthly nth-weekday rules", () => {
  // Aug 11 2026 is the second Tuesday of August.
  const base = {
    startsAt: "2026-08-11T23:00:00.000Z",
    endsAt: "2026-08-12T00:30:00.000Z",
  };

  it("finds the nth weekday in each month", () => {
    const out = expandEvent(
      base,
      monthly(),
      [],
      WINDOW_FROM,
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-11T23:00:00.000Z",
      "2026-09-08T23:00:00.000Z",
      "2026-10-13T23:00:00.000Z",
    ]);
  });

  it("resolves `last` weekday of the month", () => {
    // Aug 28 2026 is the last Friday of August.
    const lastFri = {
      startsAt: "2026-08-28T23:00:00.000Z",
      endsAt: "2026-08-29T00:30:00.000Z",
    };
    const out = expandEvent(
      lastFri,
      monthly({ nth: "last", weekday: "FR" }),
      [],
      WINDOW_FROM,
      new Date("2026-10-01T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-28T23:00:00.000Z",
      "2026-09-25T23:00:00.000Z",
    ]);
  });

  it("skips months that have no fifth occurrence instead of shifting", () => {
    // May 31 2026 is the fifth Sunday of May. June and July 2026 have no
    // fifth Sunday; August does (Aug 30).
    const fifthSun = {
      startsAt: "2026-05-31T22:00:00.000Z",
      endsAt: "2026-05-31T23:00:00.000Z",
    };
    const out = expandEvent(
      fifthSun,
      monthly({ nth: 5, weekday: "SU" }),
      [],
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-09-01T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-05-31T22:00:00.000Z",
      "2026-08-30T22:00:00.000Z",
    ]);
  });

  it("respects interval — every other month", () => {
    const out = expandEvent(
      base,
      monthly({ interval: 2 }),
      [],
      WINDOW_FROM,
      new Date("2027-01-01T00:00:00.000Z"),
    );
    // December's instant is an hour later in UTC because the parish is on
    // standard time by then. The wall clock — 7pm — has not moved.
    expect(starts(out)).toEqual([
      "2026-08-11T23:00:00.000Z",
      "2026-10-13T23:00:00.000Z",
      "2026-12-09T00:00:00.000Z",
    ]);
  });

  it("stops after `count` occurrences", () => {
    const out = expandEvent(
      base,
      monthly({ ends: { kind: "count", count: 2 } }),
      [],
      WINDOW_FROM,
      new Date("2027-06-01T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-11T23:00:00.000Z",
      "2026-09-08T23:00:00.000Z",
    ]);
  });

  it("stops at an `until` date", () => {
    const out = expandEvent(
      base,
      monthly({ ends: { kind: "until", until: "2026-09-30" } }),
      [],
      WINDOW_FROM,
      new Date("2027-06-01T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-11T23:00:00.000Z",
      "2026-09-08T23:00:00.000Z",
    ]);
  });

  it("crosses a year boundary without losing a month", () => {
    const out = expandEvent(
      base,
      monthly(),
      [],
      new Date("2026-11-01T00:00:00.000Z"),
      new Date("2027-03-01T00:00:00.000Z"),
    );
    // All four are 7pm in Westfield; all four are on standard time, so
    // each lands at midnight UTC the following day.
    expect(starts(out)).toEqual([
      "2026-11-11T00:00:00.000Z",
      "2026-12-09T00:00:00.000Z",
      "2027-01-13T00:00:00.000Z",
      "2027-02-10T00:00:00.000Z",
    ]);
  });

  it("skips a cancelled month", () => {
    const out = expandEvent(
      base,
      monthly(),
      ["2026-09-08T23:00:00.000Z"],
      WINDOW_FROM,
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-11T23:00:00.000Z",
      "2026-10-13T23:00:00.000Z",
    ]);
  });
});

describe("expandEvent — runaway protection", () => {
  it("terminates on an open-ended weekly rule over a ten year window", () => {
    const out = expandEvent(
      { startsAt: WED_7PM, endsAt: WED_830PM },
      weekly(),
      [],
      WINDOW_FROM,
      new Date("2036-08-01T00:00:00.000Z"),
    );
    // Bounded by SAFETY_MAX weeks, not by the window.
    expect(out.length).toBeGreaterThan(300);
    expect(out.length).toBeLessThan(2100);
  });

  it("terminates on an open-ended monthly rule over a long window", () => {
    const out = expandEvent(
      { startsAt: "2026-08-11T23:00:00.000Z", endsAt: "2026-08-12T00:30:00.000Z" },
      monthly(),
      [],
      WINDOW_FROM,
      new Date("2200-01-01T00:00:00.000Z"),
    );
    expect(out.length).toBeLessThanOrEqual(2000);
  });
});

describe("expandEvents", () => {
  it("interleaves occurrences from several events in chronological order", () => {
    const out = expandEvents(
      [
        {
          slug: "wednesday-adoration",
          startsAt: WED_7PM,
          endsAt: WED_830PM,
          recurrence: weekly(),
        },
        {
          slug: "second-tuesday-council",
          startsAt: "2026-08-11T23:00:00.000Z",
          endsAt: "2026-08-12T00:30:00.000Z",
          recurrence: monthly(),
        },
        {
          slug: "one-off-concert",
          startsAt: "2026-08-08T23:00:00.000Z",
          endsAt: "2026-08-09T01:00:00.000Z",
        },
      ],
      WINDOW_FROM,
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(out.map((o) => `${o.slug} ${iso(o.occurrenceStartsAt)}`)).toEqual([
      "wednesday-adoration 2026-08-05T23:00:00.000Z",
      "one-off-concert 2026-08-08T23:00:00.000Z",
      "second-tuesday-council 2026-08-11T23:00:00.000Z",
      "wednesday-adoration 2026-08-12T23:00:00.000Z",
      "wednesday-adoration 2026-08-19T23:00:00.000Z",
    ]);
  });

  it("carries every field of the source row onto each occurrence", () => {
    const [first] = expandEvents(
      [
        {
          slug: "adoration",
          title: "Eucharistic Adoration",
          category: "prayer",
          startsAt: WED_7PM,
          endsAt: WED_830PM,
          recurrence: weekly(),
        },
      ],
      WINDOW_FROM,
      new Date("2026-08-10T00:00:00.000Z"),
    );
    expect(first).toMatchObject({
      slug: "adoration",
      title: "Eucharistic Adoration",
      category: "prayer",
    });
    expect(first!.occurrenceEndsAt).toBeInstanceOf(Date);
  });

  it("tolerates null recurrence and null exceptionDates", () => {
    const out = expandEvents(
      [
        {
          startsAt: WED_7PM,
          endsAt: WED_830PM,
          recurrence: null,
          exceptionDates: null,
        },
      ],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(out).toHaveLength(1);
  });

  it("returns an empty list for an empty input", () => {
    expect(expandEvents([], WINDOW_FROM, WINDOW_TO)).toEqual([]);
  });
});

describe("summarizeRecurrence", () => {
  it("describes a one-off", () => {
    expect(summarizeRecurrence(null)).toBe("Does not repeat");
    expect(summarizeRecurrence(undefined)).toBe("Does not repeat");
  });

  it("describes weekly rules", () => {
    expect(summarizeRecurrence(weekly())).toBe("Every week on Wednesday");
    expect(summarizeRecurrence(weekly({ byday: ["TU", "TH"] }))).toBe(
      "Every week on Tuesday, Thursday",
    );
    expect(summarizeRecurrence(weekly({ interval: 2 }))).toBe(
      "Every other week on Wednesday",
    );
    expect(summarizeRecurrence(weekly({ interval: 3 }))).toBe(
      "Every 3 weeks on Wednesday",
    );
  });

  it("describes monthly rules", () => {
    expect(summarizeRecurrence(monthly())).toBe(
      "Every month on the second Tuesday",
    );
    expect(
      summarizeRecurrence(monthly({ nth: "last", weekday: "FR", interval: 2 })),
    ).toBe("Every other month on the last Friday");
  });

  it("appends the end condition", () => {
    expect(
      summarizeRecurrence(weekly({ ends: { kind: "count", count: 1 } })),
    ).toBe("Every week on Wednesday · 1 occurrence");
    expect(
      summarizeRecurrence(weekly({ ends: { kind: "count", count: 6 } })),
    ).toBe("Every week on Wednesday · 6 occurrences");
    expect(
      summarizeRecurrence(weekly({ ends: { kind: "until", until: "2026-12-25" } })),
    ).toBe("Every week on Wednesday · until 2026-12-25");
  });
});

describe("horizon constant", () => {
  it("is the six months every caller relies on", () => {
    expect(DEFAULT_HORIZON_MONTHS).toBe(6);
  });
});

/**
 * ---------------------------------------------------------------------
 * THE TIMEZONE FIXES
 *
 * These three were pinned as known gaps in Wave 19 and fixed in Wave 21.
 * The parish is in Westfield, New Jersey; Vercel runs UTC. Expansion now
 * works on the parish's own clock.
 * ---------------------------------------------------------------------
 */
describe("a 7pm event is at 7pm all year", () => {
  // 23:00Z in August is 7pm in Westfield.
  const base = { startsAt: WED_7PM, endsAt: WED_830PM };

  const parishHour = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false,
      }).format(d),
    ) % 24;

  it("keeps the hour across the autumn change", () => {
    const out = expandEvent(
      base,
      weekly(),
      [],
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-12-01T00:00:00.000Z"),
    );
    expect(out.length).toBeGreaterThan(4);
    for (const i of out) {
      expect(parishHour(i.startsAt), i.startsAt.toISOString()).toBe(19);
    }
    // The UTC instant moves by an hour, which is the point — the wall
    // clock is what stayed still.
    const october = out.find((i) => i.startsAt < new Date("2026-11-01"))!;
    const november = out.find((i) => i.startsAt > new Date("2026-11-02"))!;
    expect(october.startsAt.toISOString().slice(11, 16)).toBe("23:00");
    expect(november.startsAt.toISOString().slice(11, 16)).toBe("00:00");
  });

  it("keeps the hour across the spring change", () => {
    const marchBase = {
      startsAt: "2027-02-03T00:00:00.000Z", // 7pm Feb 2, EST
      endsAt: "2027-02-03T01:30:00.000Z",
    };
    const out = expandEvent(
      marchBase,
      weekly({ byday: ["TU"] }),
      [],
      new Date("2027-02-01T00:00:00.000Z"),
      new Date("2027-04-15T00:00:00.000Z"),
    );
    expect(out.length).toBeGreaterThan(6);
    for (const i of out) {
      expect(parishHour(i.startsAt), i.startsAt.toISOString()).toBe(19);
    }
  });

  it("preserves the duration across a change", () => {
    const out = expandEvent(
      base,
      weekly(),
      [],
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-12-01T00:00:00.000Z"),
    );
    const expected =
      new Date(WED_830PM).getTime() - new Date(WED_7PM).getTime();
    for (const i of out) {
      expect(i.endsAt.getTime() - i.startsAt.getTime()).toBe(expected);
    }
  });
});

describe("cancelling a week actually cancels it", () => {
  const base = { startsAt: WED_7PM, endsAt: WED_830PM };

  it("accepts a plain calendar date", () => {
    // What the date picker in the admin gives you.
    const out = expandEvent(
      base,
      weekly(),
      ["2026-08-12"],
      WINDOW_FROM,
      new Date("2026-08-27T00:00:00.000Z"),
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
      "2026-08-26T23:00:00.000Z",
    ]);
  });

  it("accepts a full timestamp written in any zone", () => {
    // The old version compared exact ISO strings, and the editor built
    // them from the browser's local hours while expansion used UTC. For
    // anyone outside UTC — which is everyone at this parish — the two
    // never matched and the cancelled week still appeared.
    // Note a UTC midnight timestamp is deliberately absent. 00:00Z on the
    // 12th is 8pm on the 11th in Westfield, so it genuinely means the 11th.
    // Reading it as the 12th would be guessing.
    for (const spelling of [
      "2026-08-12T23:00:00.000Z",
      "2026-08-12T19:00:00.000-04:00",
      "2026-08-12T12:00:00.000Z",
      "2026-08-12T14:30:00.000Z",
    ]) {
      const out = expandEvent(
        base,
        weekly(),
        [spelling],
        WINDOW_FROM,
        new Date("2026-08-20T00:00:00.000Z"),
      );
      expect(starts(out), spelling).toEqual([
        "2026-08-05T23:00:00.000Z",
        "2026-08-19T23:00:00.000Z",
      ]);
    }
  });

  it("does not consume a slot in a count rule", () => {
    // Cancelling one week should not quietly shorten the series. An
    // editor who cancels a date is not asking for one fewer meeting.
    const out = expandEvent(
      base,
      weekly({ ends: { kind: "count", count: 3 } }),
      ["2026-08-12"],
      WINDOW_FROM,
      WINDOW_TO,
    );
    // Three sessions were asked for, so three happen — the cancelled week
    // is skipped and the series runs a week longer.
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-19T23:00:00.000Z",
      "2026-08-26T23:00:00.000Z",
    ]);
  });
});

describe("a weekly until date is honoured to the day", () => {
  const base = { startsAt: WED_7PM, endsAt: WED_830PM };

  it("does not emit an occurrence past the end date", () => {
    // until = Monday Aug 3. The Wednesday in that same week used to fire
    // anyway, because the loop tested the Monday its week started on.
    const out = expandEvent(
      base,
      weekly({ ends: { kind: "until", until: "2026-08-03" } }),
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([]);
  });

  it("includes an occurrence falling exactly on the end date", () => {
    const out = expandEvent(
      base,
      weekly({ ends: { kind: "until", until: "2026-08-12" } }),
      [],
      WINDOW_FROM,
      WINDOW_TO,
    );
    expect(starts(out)).toEqual([
      "2026-08-05T23:00:00.000Z",
      "2026-08-12T23:00:00.000Z",
    ]);
  });
});
