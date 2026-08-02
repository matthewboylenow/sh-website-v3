import type { Role } from "@/auth.config";

/**
 * Role predicates — the single source of truth for who may do what.
 *
 * Before this file, the same role check was copy-pasted into roughly two
 * dozen server-action files, and the copies had quietly drifted: some tested
 * `role === "ministry_lead"` (deny-list), some tested
 * `role !== "admin" && role !== "editor"` (allow-list), one was named
 * `requireWriter` but was admin-only, and one was named `requireAdmin` but
 * was actually the writer check. With three roles those spellings happen to
 * agree; the moment a fourth role is added they stop agreeing, silently, in
 * whichever files nobody thought to update.
 *
 * These functions are pure and take the role directly, so `await auth()`
 * stays at the call site and every rule here is unit testable.
 *
 * The matrix, as shipped:
 *
 *   surface                          admin  editor  ministry_lead
 *   ------------------------------------------------------------
 *   events, ministries, formation,     y      y          n
 *   posts, bulletins, mass times,
 *   seasonal banners, pages,
 *   page sections, homepage,
 *   form submissions
 *
 *   staff, users, site settings,       y      n          n
 *   announcements, navigation,
 *   redirects, taxonomies,
 *   matchmaker, approvals, media
 *
 *   own ministry's sections and        y      y      only their own
 *   inquiries
 */

/** Content surfaces: admins and editors write, ministry leads do not. */
export function canWriteContent(role: Role | undefined | null): boolean {
  return role === "admin" || role === "editor";
}

/**
 * Configuration surfaces: settings, users, staff, navigation, redirects,
 * taxonomies, matchmaker, approvals, the media library. Admins only.
 */
export function canAdminister(role: Role | undefined | null): boolean {
  return role === "admin";
}

/**
 * Ministry-scoped surfaces. Admins and editors reach every ministry; a
 * ministry lead reaches only the ones they are assigned to.
 *
 * `ministryIds` comes off the session, where it is cached in the JWT for the
 * session's lifetime — a newly assigned lead has to sign in again before
 * this returns true for their new ministry.
 */
export function canAccessMinistry(
  role: Role | undefined | null,
  ministryIds: readonly string[] | undefined | null,
  targetMinistryId: string,
): boolean {
  if (canWriteContent(role)) return true;
  if (role !== "ministry_lead") return false;
  return (ministryIds ?? []).includes(targetMinistryId);
}

/** What a signed-in user may see on the inquiries dashboard. */
export type InquiryScope =
  | { kind: "all" }
  | { kind: "scope"; ministryIds: string[] }
  | { kind: "none" };

export function inquiryScopeFor(
  role: Role | undefined | null,
  ministryIds: readonly string[] | undefined | null,
): InquiryScope {
  if (canWriteContent(role)) return { kind: "all" };
  // Anything that is not a recognised ministry lead gets nothing. Falling
  // through to the id list here would hand scoped access to a session whose
  // role failed to hydrate.
  if (role !== "ministry_lead") return { kind: "none" };
  const ids = [...(ministryIds ?? [])];
  if (ids.length === 0) return { kind: "none" };
  return { kind: "scope", ministryIds: ids };
}

/** Standard denial messages, so the admin UI reads consistently. */
export const NOT_SIGNED_IN = "Not signed in";
export const FORBIDDEN = "Forbidden";
export const FORBIDDEN_ADMIN_ONLY = "Forbidden — admins only";
