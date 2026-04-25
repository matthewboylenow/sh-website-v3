/**
 * Feature-flag helpers. Public flags are read on the client; server-only
 * flags stay in process.env. Defaults match backend.html §16 / §10.
 */

const truthy = (v: string | undefined) => v === undefined || v === "true";

/** All default true — flip via env to disable. */
export const ENABLE_GIVE_FAB = truthy(process.env.NEXT_PUBLIC_ENABLE_GIVE_FAB);
export const ENABLE_LIVESTREAM = truthy(
  process.env.NEXT_PUBLIC_ENABLE_LIVESTREAM,
);
export const ENABLE_A11Y_WIDGET = truthy(
  process.env.NEXT_PUBLIC_ENABLE_A11Y_WIDGET,
);

/** Default false — flip to true after launch. */
export const ENABLE_MINISTRY_SELF_SERVICE =
  process.env.ENABLE_MINISTRY_SELF_SERVICE === "true";
