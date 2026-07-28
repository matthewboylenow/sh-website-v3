/**
 * Wave 18.4 — wp-content media migration.
 *
 * Every asset still referenced from content as
 * https://sainthelen.org/wp-content/... (PDFs, DOCX, inline images) dies
 * at the DNS flip. This script:
 *
 *   1. Scans all content stores for wp-content URLs:
 *      page_sections.payload (all parent kinds), posts.body, events.body,
 *      staff.bio, ministries.description + inquiryConfig, announcements,
 *      siteSettings (nav, footerCopy, bottomBarHtml, homepageHero,
 *      redirects — several short links target wp-content PDFs directly).
 *   2. Downloads each unique asset from the live WP host and mirrors it
 *      into Vercel Blob under wp-import/files/, inserting a blob_assets
 *      row whose `caption` records the original wp-content URL.
 *   3. Rewrites every reference to the Blob URL.
 *
 * Idempotent: already-mirrored URLs are found via the blob_assets caption
 * lookup (no re-download); after a clean run, no wp-content references
 * remain so a re-run is a no-op. Failed downloads (404 on WP) are left
 * untouched and listed for manual review.
 *
 * Run:  pnpm tsx --env-file=.env.local scripts/migrate-wp-media-2026-07.ts
 * DRY_RUN=1 to preview (lists URLs, downloads nothing).
 */

import { put } from "@vercel/blob";
import { eq, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  announcements,
  blobAssets,
  events,
  ministries,
  pages,
  pageSections,
  posts,
  siteSettings,
  staff,
} from "../db/schema";

const DRY_RUN = process.env.DRY_RUN === "1";
// Covers the live WP host and the sainthelen.adventii.dev dev mirror
// (a few Respect Life links point there). External hosts' wp-content
// (rcan.org, olastrafford.org, …) are other organizations' files and are
// deliberately NOT mirrored.
const WP_URL_RE =
  /https?:\/\/(?:www\.)?(?:sainthelen\.org|sainthelen\.adventii\.dev)\/wp-content\/[^\s"'<>()\\]+/g;

function extractUrls(text: string): string[] {
  return [...new Set(text.match(WP_URL_RE) ?? [])].map((u) =>
    // JSON-escaped forward slashes sneak through as \/ — normalize.
    u.replaceAll("\\/", "/"),
  );
}

async function fetchWithRetry(url: string): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
    const r = await fetch(url);
    if (r.ok || r.status === 404 || r.status === 403) return r;
    last = r;
  }
  return last!;
}

/** Mirror one wp-content URL to Blob; returns the Blob URL or null. */
async function mirror(url: string): Promise<string | null> {
  // Already mirrored on a previous run?
  const [existing] = await db
    .select({ blobUrl: blobAssets.blobUrl })
    .from(blobAssets)
    .where(eq(blobAssets.caption, url))
    .limit(1);
  if (existing) return existing.blobUrl;

  // The adventii.dev mirror is offline — the same uploads exist on the
  // live WP host at the identical path.
  const sourceUrl = url.replace("sainthelen.adventii.dev", "sainthelen.org");
  let r: Response;
  try {
    r = await fetchWithRetry(sourceUrl);
  } catch (e) {
    console.warn(`    ⚠ fetch failed — ${sourceUrl}: ${String(e)}`);
    return null;
  }
  if (!r.ok) {
    console.warn(`    ⚠ ${r.status} — ${sourceUrl}`);
    return null;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = r.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const basename = decodeURIComponent(url.split("/").pop() ?? "file").slice(-120);
  const blob = await put(`wp-import/files/${basename}`, buf, {
    access: "public",
    contentType: mime,
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  });
  await db
    .insert(blobAssets)
    .values({
      key: blob.pathname,
      blobUrl: blob.url,
      mimeType: mime,
      byteSize: buf.byteLength,
      caption: url, // provenance + idempotency lookup
    })
    .onConflictDoNothing();
  return blob.url;
}

type Store = {
  label: string;
  /** rows as [id, text] pairs */
  load: () => Promise<Array<{ id: string | number; text: string }>>;
  save: (id: string | number, text: string) => Promise<void>;
  /** true when the text is JSON (parse after replace) */
  json?: boolean;
};

async function main() {
  console.log(`Wave 18.4 — wp-content media migration${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  const stores: Store[] = [
    {
      label: "page_sections.payload",
      json: true,
      load: async () =>
        (
          await db
            .select({ id: pageSections.id, payload: pageSections.payload })
            .from(pageSections)
            .where(sql`${pageSections.payload}::text LIKE '%wp-content%'`)
        ).map((r) => ({ id: r.id, text: JSON.stringify(r.payload) })),
      save: async (id, text) => {
        await db
          .update(pageSections)
          .set({ payload: JSON.parse(text) })
          .where(eq(pageSections.id, id as string));
      },
    },
    {
      label: "posts.body",
      load: async () =>
        (
          await db
            .select({ id: posts.id, body: posts.body })
            .from(posts)
            .where(like(posts.body, "%wp-content%"))
        ).map((r) => ({ id: r.id, text: r.body ?? "" })),
      save: async (id, text) => {
        await db.update(posts).set({ body: text }).where(eq(posts.id, id as string));
      },
    },
    {
      label: "events.body",
      load: async () =>
        (
          await db
            .select({ id: events.id, body: events.body })
            .from(events)
            .where(like(events.body, "%wp-content%"))
        ).map((r) => ({ id: r.id, text: r.body ?? "" })),
      save: async (id, text) => {
        await db.update(events).set({ body: text }).where(eq(events.id, id as string));
      },
    },
    {
      label: "staff.bio",
      load: async () =>
        (
          await db
            .select({ id: staff.id, bio: staff.bio })
            .from(staff)
            .where(like(staff.bio, "%wp-content%"))
        ).map((r) => ({ id: r.id, text: r.bio ?? "" })),
      save: async (id, text) => {
        await db.update(staff).set({ bio: text }).where(eq(staff.id, id as string));
      },
    },
    {
      label: "ministries.description",
      load: async () =>
        (
          await db
            .select({ id: ministries.id, description: ministries.description })
            .from(ministries)
            .where(like(ministries.description, "%wp-content%"))
        ).map((r) => ({ id: r.id, text: r.description ?? "" })),
      save: async (id, text) => {
        await db
          .update(ministries)
          .set({ description: text })
          .where(eq(ministries.id, id as string));
      },
    },
    {
      label: "ministries.inquiryConfig",
      json: true,
      load: async () =>
        (
          await db
            .select({ id: ministries.id, cfg: ministries.inquiryConfig })
            .from(ministries)
            .where(sql`${ministries.inquiryConfig}::text LIKE '%wp-content%'`)
        ).map((r) => ({ id: r.id, text: JSON.stringify(r.cfg) })),
      save: async (id, text) => {
        await db
          .update(ministries)
          .set({ inquiryConfig: JSON.parse(text) })
          .where(eq(ministries.id, id as string));
      },
    },
    {
      label: "announcements",
      load: async () =>
        (
          await db
            .select({ id: announcements.id, body: announcements.body, ctaHref: announcements.ctaHref })
            .from(announcements)
            .where(
              or(
                like(announcements.body, "%wp-content%"),
                like(announcements.ctaHref, "%wp-content%"),
              ),
            )
        ).map((r) => ({ id: r.id, text: JSON.stringify({ body: r.body, ctaHref: r.ctaHref }) })),
      json: true,
      save: async (id, text) => {
        const v = JSON.parse(text) as { body: string | null; ctaHref: string | null };
        await db
          .update(announcements)
          .set({ body: v.body, ctaHref: v.ctaHref })
          .where(eq(announcements.id, id as string));
      },
    },
    {
      label: "pages.summary",
      load: async () =>
        (
          await db
            .select({ id: pages.id, summary: pages.summary })
            .from(pages)
            .where(like(pages.summary, "%wp-content%"))
        ).map((r) => ({ id: r.id, text: r.summary ?? "" })),
      save: async (id, text) => {
        await db.update(pages).set({ summary: text }).where(eq(pages.id, id as string));
      },
    },
    {
      label: "site_settings blobs",
      json: true,
      load: async () => {
        const [s] = await db
          .select({
            nav: siteSettings.nav,
            footerCopy: siteSettings.footerCopy,
            bottomBarHtml: siteSettings.bottomBarHtml,
            homepageHero: siteSettings.homepageHero,
            redirects: siteSettings.redirects,
          })
          .from(siteSettings)
          .where(eq(siteSettings.id, 1))
          .limit(1);
        if (!s) return [];
        const text = JSON.stringify(s);
        return text.includes("wp-content") ? [{ id: 1, text }] : [];
      },
      save: async (_id, text) => {
        const v = JSON.parse(text);
        await db.update(siteSettings).set(v).where(eq(siteSettings.id, 1));
      },
    },
  ];

  // Pass 1 — collect every unique URL.
  const allUrls = new Set<string>();
  const loaded: Array<{ store: Store; rows: Array<{ id: string | number; text: string }> }> = [];
  for (const store of stores) {
    const rows = await store.load();
    loaded.push({ store, rows });
    for (const row of rows) for (const u of extractUrls(row.text)) allUrls.add(u);
    if (rows.length) console.log(`  ${store.label}: ${rows.length} rows reference wp-content`);
  }
  console.log(`\n${allUrls.size} unique wp-content URLs referenced.\n`);
  if (DRY_RUN) {
    for (const u of [...allUrls].sort()) console.log("  ", u);
    return;
  }

  // Pass 2 — mirror each.
  const urlMap = new Map<string, string>();
  const failed: string[] = [];
  let n = 0;
  for (const url of allUrls) {
    const blobUrl = await mirror(url);
    if (blobUrl) urlMap.set(url, blobUrl);
    else failed.push(url);
    n++;
    if (n % 10 === 0) console.log(`  … ${n}/${allUrls.size} mirrored`);
  }
  console.log(`\nMirrored ${urlMap.size}/${allUrls.size} assets.`);

  // Pass 3 — rewrite references.
  let rewritten = 0;
  for (const { store, rows } of loaded) {
    for (const row of rows) {
      let next = row.text;
      for (const [from, to] of urlMap) {
        next = next.replaceAll(from, to).replaceAll(from.replaceAll("/", "\\/"), to);
      }
      if (next !== row.text) {
        await store.save(row.id, next);
        rewritten++;
      }
    }
  }
  console.log(`Rewrote ${rewritten} rows.`);

  if (failed.length) {
    console.log(`\n⚠ ${failed.length} URLs could not be mirrored (left as-is):`);
    for (const u of failed) console.log("  ", u);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
