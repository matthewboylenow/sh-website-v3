import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The dev SMS code must never work in production.
 *
 * Without the environment guard, a missing or misspelled Twilio variable on
 * Vercel turns "123456" into a valid sign-in code for any staff phone number
 * on file. Nothing about that looks wrong from the outside — the sign-in
 * screen behaves exactly as designed — so it would not be found until
 * somebody used it.
 */

const TWILIO_VARS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of [...TWILIO_VARS, "NODE_ENV"]) {
    original[k] = process.env[k];
    delete process.env[k];
  }
  vi.resetModules();
});

afterEach(() => {
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  vi.restoreAllMocks();
});

const loadSms = async () => import("@/lib/sms");

describe("with Twilio unconfigured", () => {
  it("accepts the dev code outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { checkSmsCode } = await loadSms();
    expect(await checkSmsCode("+19085551234", "123456")).toBe(true);
  });

  it("rejects the dev code in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkSmsCode } = await loadSms();
    expect(await checkSmsCode("+19085551234", "123456")).toBe(false);
  });

  it("rejects every other code in production too", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkSmsCode } = await loadSms();
    for (const code of ["000000", "", "999999"]) {
      expect(await checkSmsCode("+19085551234", code)).toBe(false);
    }
  });

  it("says so out loud in the server log rather than failing silently", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkSmsCode } = await loadSms();
    await checkSmsCode("+19085551234", "123456");
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0]?.[0])).toContain("not configured in production");
  });

  it("refuses to send a code in production instead of pretending it sent", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { sendSmsCode } = await loadSms();
    const result = await sendSmsCode("+19085551299");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("email link");
  });

  it("still logs a dev code locally", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendSmsCode } = await loadSms();
    expect((await sendSmsCode("+19085551288")).ok).toBe(true);
    expect(String(spy.mock.calls[0]?.[0])).toContain("123456");
  });
});

describe("normalizePhone", () => {
  it("coerces the shapes parishioners actually type", async () => {
    const { normalizePhone } = await loadSms();
    expect(normalizePhone("9085551234")).toBe("+19085551234");
    expect(normalizePhone("(908) 555-1234")).toBe("+19085551234");
    expect(normalizePhone("908-555-1234")).toBe("+19085551234");
    expect(normalizePhone("19085551234")).toBe("+19085551234");
    expect(normalizePhone("+19085551234")).toBe("+19085551234");
    expect(normalizePhone("  9085551234  ")).toBe("+19085551234");
  });

  it("refuses what it cannot place", async () => {
    const { normalizePhone } = await loadSms();
    expect(normalizePhone("555")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
    expect(normalizePhone("12345678901234")).toBeNull();
  });
});
