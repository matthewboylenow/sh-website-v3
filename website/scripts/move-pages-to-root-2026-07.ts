/**
 * Wave 18.1 — CMS pages move from /p/<slug> to root /<slug>
 * (Matthew, 2026-07-28: "I don't want the /p").
 *
 * The route change ships in code (app/(site)/[slug] + /p/* permanent
 * redirect). This script rewrites everything STORED in the database that
 * still points at /p/…:
 *
 *   1. siteSettings.redirects —
 *      a. DELETE any redirect whose `from` matches a published page's root
 *         URL (it would shadow the new route and loop through /p).
 *      b. Rewrite remaining targets "/p/<slug>" → "/<slug>".
 *   2. siteSettings.nav — mega-menu/link hrefs "/p/…" → "/…".
 *   3. siteSettings.bottomBarHtml + footerCopy — same rewrite.
 *   4. siteSettings.homepageHero CTAs — same rewrite.
 *   5. page_sections.payload (all parent kinds) — button/link/card hrefs and
 *      rich-text anchors.
 *   6. ministries.description + inquiryConfig, posts.body, events.body,
 *      staff.bio, announcements.ctaUrl — stray /p/ links in content.
 *   7. pages.canonicalUrl — "/p/<slug>" → "/<slug>" (sacraments rows keep
 *      their /sacraments/<name> canonical).
 *
 * "/p/" only ever appears in our own URLs (verified: no external URL in
 * content contains the substring "/p/"), so a global replace inside each
 * JSON/text value is safe. Idempotent — second run reports 0 changes.
 *
 * Run:  pnpm tsx --env-file=.env.local scripts/move-pages-to-root-2026-07.ts
 * Add DRY_RUN=1 to preview without writing.
 */

import { eq, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  announcements,
  events,
  ministries,
  pages,
  pageSections,
  posts,
  siteSettings,
  staff,
  type Redirect,
} from "../db/schema";

const DRY_RUN = process.env.DRY_RUN === "1";

/** Replace /p/<x> with /<x> inside any string. */
function stripP(s: string): string {
  return s.replaceAll("/p/", "/");
}

function jsonStripP<T>(value: T): { next: T; changed: boolean } {
  const raw = JSON.stringify(value);
  const next = raw.replaceAll("/p/", "/");
  return { next: JSON.parse(next) as T, changed: next !== raw };
}

async function fixRedirects(publishedSlugs: Set<string>) {
  const [s] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!s) throw new Error("site_settings singleton missing");

  const before = s.redirects ?? [];
  let dropped = 0;
  let rewritten = 0;
  const next: Redirect[] = [];
  for (const r of before) {
    // A redirect FROM a published page's root URL would shadow the page.
    const fromSlug = r.from.replace(/^\//, "");
    if (publishedSlugs.has(fromSlug)) {
      dropped++;
      continue;
    }
    if (r.to.includes("/p/")) {
      next.push({ ...r, to: stripP(r.to) });
      rewritten++;
    } else {
      next.push(r);
    }
  }

  console.log(
    `  redirects: -${dropped} shadowing, ${rewritten} retargeted (${before.length} → ${next.length})`,
  );
  if (!DRY_RUN && (dropped > 0 || rewritten > 0)) {
    await db
      .update(siteSettings)
      .set({ redirects: next })
      .where(eq(siteSettings.id, 1));
  }
}

async function fixSiteSettingsBlobs() {
  const [s] = await db
    .select({
      nav: siteSettings.nav,
      bottomBarHtml: siteSettings.bottomBarHtml,
      footerCopy: siteSettings.footerCopy,
      homepageHero: siteSettings.homepageHero,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!s) return;

  const set: Record<string, unknown> = {};
  if (s.nav) {
    const { next, changed } = jsonStripP(s.nav);
    if (changed) set.nav = next;
  }
  if (s.homepageHero) {
    const { next, changed } = jsonStripP(s.homepageHero);
    if (changed) set.homepageHero = next;
  }
  if (s.bottomBarHtml?.includes("/p/")) set.bottomBarHtml = stripP(s.bottomBarHtml);
  if (s.footerCopy?.includes("/p/")) set.footerCopy = stripP(s.footerCopy);

  const keys = Object.keys(set);
  console.log(
    keys.length
      ? `  site settings: rewrote ${keys.join(", ")}`
      : "  site settings: nav/hero/footer clean",
  );
  if (!DRY_RUN && keys.length > 0) {
    await db.update(siteSettings).set(set).where(eq(siteSettings.id, 1));
  }
}

async function fixPageSections() {
  const rows = await db
    .select({ id: pageSections.id, payload: pageSections.payload })
    .from(pageSections)
    .where(sql`${pageSections.payload}::text LIKE '%/p/%'`);
  let changed = 0;
  for (const row of rows) {
    const { next, changed: didChange } = jsonStripP(row.payload);
    if (!didChange) continue;
    changed++;
    if (!DRY_RUN) {
      await db
        .update(pageSections)
        .set({ payload: next })
        .where(eq(pageSections.id, row.id));
    }
  }
  console.log(`  page_sections: ${changed} payloads rewritten (${rows.length} candidates)`);
}

async function fixContentColumns() {
  // ministries: description text + inquiryConfig jsonb
  const ministryRows = await db
    .select({
      id: ministries.id,
      description: ministries.description,
      inquiryConfig: ministries.inquiryConfig,
    })
    .from(ministries)
    .where(
      or(
        like(ministries.description, "%/p/%"),
        sql`${ministries.inquiryConfig}::text LIKE '%/p/%'`,
      ),
    );
  for (const m of ministryRows) {
    const set: Record<string, unknown> = {};
    if (m.description?.includes("/p/")) set.description = stripP(m.description);
    if (m.inquiryConfig) {
      const { next, changed } = jsonStripP(m.inquiryConfig);
      if (changed) set.inquiryConfig = next;
    }
    if (!DRY_RUN && Object.keys(set).length > 0) {
      await db.update(ministries).set(set).where(eq(ministries.id, m.id));
    }
  }
  console.log(`  ministries: ${ministryRows.length} rows rewritten`);

  const postRows = await db
    .select({ id: posts.id, body: posts.body })
    .from(posts)
    .where(like(posts.body, "%/p/%"));
  for (const r of postRows) {
    if (!DRY_RUN) {
      await db.update(posts).set({ body: stripP(r.body ?? "") }).where(eq(posts.id, r.id));
    }
  }
  console.log(`  posts.body: ${postRows.length} rows rewritten`);

  const eventRows = await db
    .select({ id: events.id, body: events.body })
    .from(events)
    .where(like(events.body, "%/p/%"));
  for (const r of eventRows) {
    if (!DRY_RUN) {
      await db.update(events).set({ body: stripP(r.body ?? "") }).where(eq(events.id, r.id));
    }
  }
  console.log(`  events.body: ${eventRows.length} rows rewritten`);

  const staffRows = await db
    .select({ id: staff.id, bio: staff.bio })
    .from(staff)
    .where(like(staff.bio, "%/p/%"));
  for (const r of staffRows) {
    if (!DRY_RUN) {
      await db.update(staff).set({ bio: stripP(r.bio ?? "") }).where(eq(staff.id, r.id));
    }
  }
  console.log(`  staff.bio: ${staffRows.length} rows rewritten`);

  const annRows = await db
    .select({ id: announcements.id, ctaHref: announcements.ctaHref })
    .from(announcements)
    .where(like(announcements.ctaHref, "%/p/%"));
  for (const r of annRows) {
    if (!DRY_RUN) {
      await db
        .update(announcements)
        .set({ ctaHref: stripP(r.ctaHref ?? "") })
        .where(eq(announcements.id, r.id));
    }
  }
  console.log(`  announcements.ctaHref: ${annRows.length} rows rewritten`);
}

async function fixCanonicals() {
  const rows = await db
    .select({ id: pages.id, slug: pages.slug, canonicalUrl: pages.canonicalUrl })
    .from(pages)
    .where(like(pages.canonicalUrl, "%/p/%"));
  for (const r of rows) {
    if (!DRY_RUN) {
      await db
        .update(pages)
        .set({ canonicalUrl: stripP(r.canonicalUrl ?? "") })
        .where(eq(pages.id, r.id));
    }
  }
  console.log(`  pages.canonicalUrl: ${rows.length} rows rewritten`);
}

async function main() {
  console.log(`Wave 18.1 — move CMS pages to root${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  const published = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.status, "published"));
  const publishedSlugs = new Set(
    published.map((p) => p.slug).filter((s) => !s.startsWith("sacraments-")),
  );
  console.log(`${publishedSlugs.size} published root-serving pages\n`);

  await fixRedirects(publishedSlugs);
  await fixSiteSettingsBlobs();
  await fixPageSections();
  await fixContentColumns();
  await fixCanonicals();
  console.log("\n✓ Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
