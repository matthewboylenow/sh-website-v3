import { describe, expect, it } from "vitest";
import type { Role } from "@/auth.config";
import {
  canAccessMinistry,
  canAdminister,
  canWriteContent,
  inquiryScopeFor,
} from "@/lib/authz";
import { ROLES } from "@/lib/validators/users";

/**
 * The admin is where a parish's real data lives: staff emails, inquiry
 * messages, form submissions from people asking about a funeral. Role
 * gating is the only thing between a ministry lead and all of it.
 *
 * Every row of the matrix in lib/authz.ts is asserted here, including the
 * denials. A predicate that is only tested for what it allows is a
 * predicate that has not been tested.
 */

const ALL: Role[] = ["admin", "editor", "ministry_lead"];

describe("the role list has not drifted", () => {
  it("still has exactly three roles", () => {
    expect([...ROLES].sort()).toEqual(["admin", "editor", "ministry_lead"]);
  });

  it("every role gets a definite answer from every predicate", () => {
    for (const role of ALL) {
      expect(typeof canWriteContent(role)).toBe("boolean");
      expect(typeof canAdminister(role)).toBe("boolean");
    }
  });

  it("a new role added to the union must be classified here too", () => {
    // If this fails, someone added a role. Decide deliberately what it can
    // do, add it to the matrix in lib/authz.ts, then update this test.
    expect(ROLES).toHaveLength(3);
  });
});

describe("canWriteContent", () => {
  it("allows admins and editors", () => {
    expect(canWriteContent("admin")).toBe(true);
    expect(canWriteContent("editor")).toBe(true);
  });

  it("denies ministry leads", () => {
    expect(canWriteContent("ministry_lead")).toBe(false);
  });

  it("denies a missing role rather than defaulting open", () => {
    expect(canWriteContent(undefined)).toBe(false);
    expect(canWriteContent(null)).toBe(false);
  });

  it("denies a role string that is not in the union", () => {
    expect(canWriteContent("superuser" as Role)).toBe(false);
    expect(canWriteContent("" as Role)).toBe(false);
  });
});

describe("canAdminister", () => {
  it("allows only admins", () => {
    expect(canAdminister("admin")).toBe(true);
    expect(canAdminister("editor")).toBe(false);
    expect(canAdminister("ministry_lead")).toBe(false);
  });

  it("denies a missing role", () => {
    expect(canAdminister(undefined)).toBe(false);
    expect(canAdminister(null)).toBe(false);
  });

  it("is strictly narrower than canWriteContent", () => {
    for (const role of ALL) {
      if (canAdminister(role)) expect(canWriteContent(role)).toBe(true);
    }
  });
});

describe("canAccessMinistry", () => {
  const A = "a1b2c3d4-1111-4111-8111-aaaaaaaaaaaa";
  const B = "b9c8d7e6-2222-4222-8222-bbbbbbbbbbbb";

  it("lets admins and editors reach any ministry", () => {
    expect(canAccessMinistry("admin", [], A)).toBe(true);
    expect(canAccessMinistry("editor", [], A)).toBe(true);
    expect(canAccessMinistry("editor", null, B)).toBe(true);
  });

  it("lets a ministry lead reach a ministry they are assigned to", () => {
    expect(canAccessMinistry("ministry_lead", [A, B], A)).toBe(true);
  });

  it("stops a ministry lead reaching one they are not assigned to", () => {
    expect(canAccessMinistry("ministry_lead", [A], B)).toBe(false);
  });

  it("stops a ministry lead with no assignments at all", () => {
    expect(canAccessMinistry("ministry_lead", [], A)).toBe(false);
    expect(canAccessMinistry("ministry_lead", undefined, A)).toBe(false);
    expect(canAccessMinistry("ministry_lead", null, A)).toBe(false);
  });

  it("denies an unknown or missing role even with a matching id", () => {
    expect(canAccessMinistry(undefined, [A], A)).toBe(false);
    expect(canAccessMinistry("visitor" as Role, [A], A)).toBe(false);
  });

  it("matches ids exactly, not by prefix or case", () => {
    expect(canAccessMinistry("ministry_lead", [A], A.slice(0, 8))).toBe(false);
    expect(canAccessMinistry("ministry_lead", [A], A.toUpperCase())).toBe(false);
  });
});

describe("inquiryScopeFor", () => {
  const A = "a1b2c3d4-1111-4111-8111-aaaaaaaaaaaa";

  it("gives admins and editors everything", () => {
    expect(inquiryScopeFor("admin", [])).toEqual({ kind: "all" });
    expect(inquiryScopeFor("editor", [A])).toEqual({ kind: "all" });
  });

  it("scopes a ministry lead to their own ministries", () => {
    expect(inquiryScopeFor("ministry_lead", [A])).toEqual({
      kind: "scope",
      ministryIds: [A],
    });
  });

  it("gives an unassigned ministry lead nothing", () => {
    expect(inquiryScopeFor("ministry_lead", [])).toEqual({ kind: "none" });
    expect(inquiryScopeFor("ministry_lead", undefined)).toEqual({
      kind: "none",
    });
  });

  it("gives a missing role nothing", () => {
    expect(inquiryScopeFor(undefined, [A])).toEqual({ kind: "none" });
  });

  it("copies the id list rather than aliasing the session array", () => {
    const ids = [A];
    const scope = inquiryScopeFor("ministry_lead", ids);
    if (scope.kind !== "scope") throw new Error("expected a scoped result");
    scope.ministryIds.push("intruder");
    expect(ids).toEqual([A]);
  });
});
