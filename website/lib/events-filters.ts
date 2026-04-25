/**
 * Events filter option lists — used by both the server-rendered
 * Events page (for the active-filter summary + filtering) and the
 * client-only filter sidebar. Kept in a plain module so both sides
 * import the same source-of-truth values.
 */

export const AUDIENCES = [
  { key: "all", label: "All audiences" },
  { key: "families", label: "Families" },
  { key: "teens", label: "Youth" },
  { key: "adults", label: "Adults" },
  { key: "women", label: "Women" },
  { key: "men", label: "Men" },
  { key: "all-parish", label: "All-parish" },
  { key: "newcomers", label: "Newcomers" },
] as const;

export const CATEGORIES = [
  { key: "worship", label: "Worship" },
  { key: "formation", label: "Faith formation" },
  { key: "fellowship", label: "Fellowship" },
  { key: "service", label: "Service & outreach" },
  { key: "sacraments", label: "Sacraments" },
  { key: "music", label: "Music" },
] as const;
