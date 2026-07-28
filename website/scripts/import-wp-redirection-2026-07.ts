/**
 * Wave 18.2 — WordPress Redirection-plugin port.
 *
 * WordPress runs the "Redirection" plugin with ~310 rules — the parish's
 * operational short links (/pilgrimage, /volunteers, /jubilee, /scroll …)
 * used in bulletins, QR codes, and announcements. None of these appear in
 * the sitemap, so the earlier audits never saw them. This ports them into
 * siteSettings.redirects.
 *
 * Rules:
 *   - Trailing slashes are normalized away (Next handles /x/ → /x itself);
 *     first occurrence of a normalized `from` wins (plugin position order).
 *   - Targets on sainthelen.org are converted to relative paths so they
 *     keep working after the DNS flip. External targets stay verbatim.
 *   - A rule whose `from` collides with a real route or published page is
 *     skipped (it would shadow the page).
 *   - Existing manifest entries win on conflict — they were placed
 *     deliberately by the earlier reconciliation waves.
 *   - Blog-post permalinks: adds wildcard rules
 *     /stewardship-spotlight/* → /blog/*, /from-our-pastor/* → /blog/*,
 *     /spotlight-homepage/* → /blog/* (middleware substitutes the suffix).
 *     The exact /stewardship-spotlight → /blog?category=stewardship entry
 *     stays (Matthew's call).
 *
 * Also fills siteSettings.funeral/baptism_form_recipients from the live
 * FluentForms notification settings (fill-only-if-empty).
 *
 * Needs WP admin credentials (Application Password):
 *   WP_APP_USER=... WP_APP_PASS=... pnpm tsx scripts/import-wp-redirection-2026-07.ts
 * DRY_RUN=1 to preview. Works only until the DNS flip.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { pages, siteSettings, type Redirect } from "../db/schema";

const DRY_RUN = process.env.DRY_RUN === "1";
const WP_USER = process.env.WP_APP_USER;
const WP_PASS = process.env.WP_APP_PASS;

/** From-paths that must never be imported (real routes / reserved). */
const ROUTE_PATHS = new Set([
  "/", "/admin", "/api", "/sign-in", "/design-system", "/p",
  "/baptism", "/blog", "/bulletin", "/contact", "/events", "/formation",
  "/funerals", "/give", "/im-new", "/inquiries", "/mass", "/ministries",
  "/ocia-form", "/prayers", "/sacraments",
  "/adoration", "/basketball", "/called", "/christlife", "/grow",
  "/lifelines", "/music", "/pre-cana", "/vbs", "/wwp",
  "/young-adult-ministry", "/youth-ministry",
]);

/** WP-internal targets that no longer exist anywhere; remapped by hand. */
const TARGET_FIXUPS: Record<string, string> = {
  "/lent-2025": "/lent",
  // Ancient /index.php-era targets — the WP pages they point at were
  // deleted years ago (they 404 on WP today too). Nearest live section:
  "/Sunday-messages": "/current-series",
  "/Sunday-ministries": "/ministries",
  "/outreach-programs": "/ministries",
  "/volunteer-opportunities": "/ministries",
  "/support-groups": "/ministries",
  "/sacred-relics-of-the-saints-treasures-of-the-church": "/events",
};

const WILDCARD_BLOG_RULES: Redirect[] = [
  { from: "/stewardship-spotlight/*", to: "/blog/*", permanent: true },
  { from: "/from-our-pastor/*", to: "/blog/*", permanent: true },
  { from: "/spotlight-homepage/*", to: "/blog/*", permanent: true },
];

type WpRule = {
  url: string;
  enabled: boolean;
  regex: boolean;
  action_type: string;
  action_data: { url?: string } | null;
};

function normalizeFrom(url: string): string {
  let s = url.trim();
  if (!s.startsWith("/")) s = `/${s}`;
  // Middleware matches pathname only — a query string in the source rule
  // (tracking params pasted into the plugin) would never match. Strip it.
  s = s.split("?")[0]!;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

function normalizeTarget(to: string): string {
  let s = to.trim();
  const m = s.match(/^https?:\/\/(www\.)?sainthelen\.org(\/.*)?$/);
  if (m) {
    s = m[2] || "/";
    // wp-content assets must keep pointing at the live WP host until the
    // media migration — leave them absolute.
    if (s.startsWith("/wp-content/")) return `https://sainthelen.org${s}`;
  }
  if (s.startsWith("/")) {
    const [path, query] = s.split("?");
    let pth = path!;
    if (pth.length > 1 && pth.endsWith("/")) pth = pth.slice(0, -1);
    s = query ? `${pth}?${query}` : pth;
    return TARGET_FIXUPS[pth] ?? s;
  }
  return s;
}

async function fetchWpRules(): Promise<WpRule[]> {
  if (!WP_USER || !WP_PASS) {
    throw new Error("Set WP_APP_USER and WP_APP_PASS (WordPress Application Password).");
  }
  const auth = Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");
  const all: WpRule[] = [];
  for (let page = 0; page < 10; page++) {
    // WP sits behind a WAF that intermittently 415/429s rapid requests.
    let r: Response | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt > 0) {
        await new Promise((res) => setTimeout(res, 3000 * 2 ** (attempt - 1)));
      }
      r = await fetch(
        `https://sainthelen.org/wp-json/redirection/v1/redirect?per_page=200&page=${page}`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (r.ok) break;
    }
    if (!r?.ok) throw new Error(`Redirection API failed: ${r?.status}`);
    const data = (await r.json()) as { items: WpRule[]; total: number };
    all.push(...data.items);
    if (all.length >= data.total) break;
  }
  return all;
}

async function main() {
  console.log(`Wave 18.2 — WP Redirection port${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  const wpRules = await fetchWpRules();
  console.log(`Fetched ${wpRules.length} WP redirect rules.`);

  const published = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.status, "published"));
  const pagePaths = new Set(
    published
      .filter((p) => !p.slug.startsWith("sacraments-"))
      .map((p) => `/${p.slug}`),
  );

  // Normalize + dedupe (first occurrence wins, matching plugin position order).
  const candidates = new Map<string, Redirect>();
  let skippedShadow = 0;
  let skippedJunk = 0;
  for (const r of wpRules) {
    if (!r.enabled || r.regex) continue;
    const from = normalizeFrom(r.url);
    const rawTo = r.action_data?.url;
    if (!rawTo || r.action_type !== "url") {
      skippedJunk++;
      continue;
    }
    if (candidates.has(from)) continue;
    if (ROUTE_PATHS.has(from) || pagePaths.has(from)) {
      skippedShadow++;
      continue;
    }
    const to = normalizeTarget(rawTo);
    if (to === from) continue;
    candidates.set(from, { from, to, permanent: true });
  }
  console.log(
    `Normalized to ${candidates.size} unique rules (${skippedShadow} shadowing skipped, ${skippedJunk} non-URL skipped).`,
  );

  // Merge into manifest — existing entries win.
  const [settings] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!settings) throw new Error("site_settings singleton missing");
  const byFrom = new Map<string, Redirect>(
    (settings.redirects ?? []).map((r) => [r.from, r]),
  );

  let added = 0;
  let kept = 0;
  for (const [from, rule] of candidates) {
    if (byFrom.has(from)) {
      kept++;
      continue;
    }
    byFrom.set(from, rule);
    added++;
  }
  for (const w of WILDCARD_BLOG_RULES) {
    const existing = byFrom.get(w.from);
    if (!existing || existing.to !== w.to) byFrom.set(w.from, w);
  }

  const merged = Array.from(byFrom.values()).sort((a, b) =>
    a.from.localeCompare(b.from),
  );
  console.log(
    `Manifest: +${added} from WP, ${kept} already present, ${merged.length} total.`,
  );

  // Flag internal targets that resolve nowhere obvious (best-effort report).
  const unresolved = merged.filter(
    (r) =>
      r.to.startsWith("/") &&
      !r.to.includes("*") &&
      !ROUTE_PATHS.has(r.to.split("?")[0]!) &&
      !pagePaths.has(r.to.split("?")[0]!) &&
      !/^\/(ministries|formation|events|blog|sacraments|p)\//.test(r.to),
  );
  if (unresolved.length) {
    console.log(`\n⚠ ${unresolved.length} internal targets to eyeball in /admin/settings/redirects:`);
    for (const r of unresolved) console.log(`  ${r.from} → ${r.to}`);
  }

  if (!DRY_RUN) {
    await db
      .update(siteSettings)
      .set({ redirects: merged })
      .where(eq(siteSettings.id, 1));
    console.log("\n✓ redirects saved.");
  }

  // Intake recipients from FluentForms (fill-only-if-empty).
  const [s2] = await db
    .select({
      funeral: siteSettings.funeralFormRecipients,
      baptism: siteSettings.baptismFormRecipients,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  const set: Record<string, unknown> = {};
  if (!s2?.funeral?.length) {
    set.funeralFormRecipients = [
      "tnydegger@sainthelen.org",
      "mbrown@sainthelen.org",
      "asoltys@sainthelen.org",
      "mboyle@sainthelen.org",
    ];
  }
  if (!s2?.baptism?.length) {
    set.baptismFormRecipients = ["tsowa@sainthelen.org"];
  }
  if (Object.keys(set).length && !DRY_RUN) {
    await db.update(siteSettings).set(set).where(eq(siteSettings.id, 1));
  }
  console.log(
    Object.keys(set).length
      ? `✓ intake recipients filled: ${Object.keys(set).join(", ")}`
      : "✓ intake recipients already set — untouched",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
