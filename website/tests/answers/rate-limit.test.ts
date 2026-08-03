import { describe, expect, it } from "vitest";
import {
  RATE_MAX_EVENTS,
  RATE_WINDOW_SECONDS,
} from "@/lib/answers/limits";

/**
 * The limiter itself needs Postgres, so its behaviour is exercised in
 * tests/integration/answers-api.db.test.ts. These are the numbers the rest
 * of the system assumes, pinned so a change is deliberate.
 */

describe("rate limit constants", () => {
  it("allows thirty events a minute per visitor", () => {
    expect(RATE_MAX_EVENTS).toBe(30);
    expect(RATE_WINDOW_SECONDS).toBe(60);
  });

  it("leaves room for a realistic session", () => {
    // A visitor who searches four times, clicks twice, votes once and
    // types a sentence spends eight. The cap is meant to stop a script,
    // not a person who cannot find the bulletin.
    const realisticSession = 4 + 2 + 1 + 1;
    expect(realisticSession).toBeLessThan(RATE_MAX_EVENTS / 2);
  });
});
