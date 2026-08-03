import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  clientIp,
  parishDay,
  sessionHash,
  signFeedbackToken,
  verifyFeedbackToken,
} from "@/lib/answers/session";

/**
 * Visitor identity. Two things are being protected here: no address ever
 * reaches the database, and one visitor cannot overwrite another's words.
 */

const originalSecret = process.env.AUTH_SECRET;

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-the-answer-engine";
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});

describe("parishDay", () => {
  it("uses Westfield's day, not UTC", () => {
    // 00:30 UTC on 3 August is still 8:30pm on 2 August in New Jersey.
    // The WordPress version rotated at UTC midnight, so a visitor who left
    // a "no" at 7:59pm and typed their sentence at 8:01pm had it silently
    // dropped with a thank-you shown anyway.
    expect(parishDay(new Date("2026-08-03T00:30:00Z"))).toBe("2026-08-02");
  });

  it("rolls over at parish midnight", () => {
    expect(parishDay(new Date("2026-08-03T03:59:00Z"))).toBe("2026-08-02");
    expect(parishDay(new Date("2026-08-03T04:01:00Z"))).toBe("2026-08-03");
  });

  it("handles standard time as well as daylight time", () => {
    // January: Eastern is UTC-5, so midnight parish time is 05:00 UTC.
    expect(parishDay(new Date("2027-01-15T04:59:00Z"))).toBe("2027-01-14");
    expect(parishDay(new Date("2027-01-15T05:01:00Z"))).toBe("2027-01-15");
  });
});

describe("sessionHash", () => {
  const ua = "Mozilla/5.0 (iPhone)";
  const now = new Date("2026-08-02T15:00:00Z");

  it("is stable for the same visitor on the same day", () => {
    expect(sessionHash("1.2.3.4", ua, now)).toBe(sessionHash("1.2.3.4", ua, now));
  });

  it("differs by address and by agent", () => {
    expect(sessionHash("1.2.3.4", ua, now)).not.toBe(
      sessionHash("5.6.7.8", ua, now),
    );
    expect(sessionHash("1.2.3.4", ua, now)).not.toBe(
      sessionHash("1.2.3.4", "Firefox", now),
    );
  });

  it("rotates daily", () => {
    const tomorrow = new Date("2026-08-03T15:00:00Z");
    expect(sessionHash("1.2.3.4", ua, now)).not.toBe(
      sessionHash("1.2.3.4", ua, tomorrow),
    );
  });

  it("does not rotate across UTC midnight when the parish day has not changed", () => {
    const before = new Date("2026-08-03T00:30:00Z"); // 8:30pm on the 2nd
    const after = new Date("2026-08-03T02:30:00Z"); // 10:30pm on the 2nd
    expect(sessionHash("1.2.3.4", ua, before)).toBe(
      sessionHash("1.2.3.4", ua, after),
    );
  });

  it("never contains the address it was made from", () => {
    const h = sessionHash("192.168.44.7", ua, now);
    expect(h).not.toContain("192");
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it("copes with a missing address or agent", () => {
    expect(sessionHash(null, null, now)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("clientIp", () => {
  it("takes the first hop from x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.9, 70.41.3.18" });
    expect(clientIp(h)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("returns null when neither header is present", () => {
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe("the feedback follow-up token", () => {
  const id = "3f9a1c22-7b41-4b8e-9c0d-2ab7e6f10001";
  const now = new Date("2026-08-02T15:00:00Z");

  it("round-trips", () => {
    expect(verifyFeedbackToken(signFeedbackToken(id, now), now)).toBe(id);
  });

  it("survives parish midnight, unlike a re-derived hash", () => {
    const issued = new Date("2026-08-03T03:55:00Z"); // 11:55pm on the 2nd
    const used = new Date("2026-08-03T04:05:00Z"); // 12:05am on the 3rd
    expect(verifyFeedbackToken(signFeedbackToken(id, issued), used)).toBe(id);
  });

  it("expires after thirty minutes", () => {
    const token = signFeedbackToken(id, now);
    const later = new Date(now.getTime() + 31 * 60 * 1000);
    expect(verifyFeedbackToken(token, later)).toBeNull();
  });

  it("is still good just inside the window", () => {
    const token = signFeedbackToken(id, now);
    const later = new Date(now.getTime() + 29 * 60 * 1000);
    expect(verifyFeedbackToken(token, later)).toBe(id);
  });

  it("rejects a tampered id", () => {
    const token = signFeedbackToken(id, now);
    const other = "11111111-1111-4111-8111-111111111111";
    const forged = token.replace(id, other);
    expect(verifyFeedbackToken(forged, now)).toBeNull();
  });

  it("rejects a tampered expiry", () => {
    const [fid, , mac] = signFeedbackToken(id, now).split(".");
    const stretched = `${fid}.${now.getTime() + 10 ** 9}.${mac}`;
    expect(verifyFeedbackToken(stretched, now)).toBeNull();
  });

  it("rejects junk", () => {
    for (const t of [null, undefined, "", "abc", "a.b", "a.b.c.d", 42]) {
      expect(verifyFeedbackToken(t, now)).toBeNull();
    }
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on a length mismatch, so the guard has to come
    // before it. An unhandled 500 here would be a free oracle.
    const [fid, exp] = signFeedbackToken(id, now).split(".");
    expect(verifyFeedbackToken(`${fid}.${exp}.short`, now)).toBeNull();
  });
});
