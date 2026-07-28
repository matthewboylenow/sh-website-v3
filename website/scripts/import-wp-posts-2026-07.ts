/**
 * Wave 18.2 — WordPress blog import.
 *
 * The new site's posts table was EMPTY while WordPress holds 253 posts.
 * This imports every post in the pastor + stewardship categories
 * (135 From Our Pastor letters + 98 Stewardship Spotlights) into the
 * `posts` table, mirroring each featured image into Vercel Blob.
 *
 * Category mapping (WP term id → posts.category):
 *   43 from-our-pastor                          → "pastor"
 *   56/86/87 stewardship-spotlight/stories/resources,
 *   83 spotlight-homepage                       → "stewardship"
 *   Everything else (news, inquire, messages, uncategorized, staff-*) is
 *   SKIPPED and logged — those taxonomies aren't blog content.
 *
 * Fetches straight from the public WP REST API (no auth needed), so it
 * only works until the DNS flip. Idempotent: upserts on slug; a featured
 * image is only downloaded when the row doesn't already have one.
 *
 * Run:  pnpm tsx --env-file=.env.local scripts/import-wp-posts-2026-07.ts
 * Env:  DRY_RUN=1 to preview. SKIP_IMAGES=1 to import text only.
 *
 * ⚠️ Inline <img> tags inside post bodies still point at wp-content —
 * they render until the DNS flip and are part of the media-migration
 * pre-launch task (grep posts.body for "wp-content").
 */

import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { blobAssets, posts } from "../db/schema";
import { sanitizeHtml, htmlToPlainText } from "../lib/sanitize";

const DRY_RUN = process.env.DRY_RUN === "1";
const SKIP_IMAGES = process.env.SKIP_IMAGES === "1" || !process.env.BLOB_READ_WRITE_TOKEN;
const WP = "https://sainthelen.org/wp-json/wp/v2";

const PASTOR_TERMS = new Set([43]);
const STEWARDSHIP_TERMS = new Set([56, 83, 86, 87]);

type WpPost = {
  slug: string;
  status: string;
  date_gmt: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  categories: number[];
  featured_media: number;
};

function decodeEntities(s: string): string {
  return s
    .replaceAll("&#8211;", "–")
    .replaceAll("&#8212;", "—")
    .replaceAll("&#8216;", "‘")
    .replaceAll("&#8217;", "’")
    .replaceAll("&#8220;", "“")
    .replaceAll("&#8221;", "”")
    .replaceAll("&#8230;", "…")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ");
}

/** WP sits behind a WAF that intermittently 415/429s rapid requests. */
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await new Promise((res) => setTimeout(res, 2000 * 2 ** (attempt - 1)));
    }
    const r = await fetch(url, init);
    if (r.ok || r.status === 400 || r.status === 404) return r;
    last = r;
  }
  return last!;
}

async function fetchAllPosts(): Promise<WpPost[]> {
  const all: WpPost[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetchWithRetry(
      `${WP}/posts?per_page=100&page=${page}&_fields=slug,status,date_gmt,link,title,content,excerpt,categories,featured_media`,
    );
    if (r.status === 400) break; // past the last page
    if (!r.ok) throw new Error(`WP posts fetch failed: ${r.status}`);
    const batch = (await r.json()) as WpPost[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

async function fetchMediaUrls(ids: number[]): Promise<Map<number, { url: string; mime: string; alt: string }>> {
  const map = new Map<number, { url: string; mime: string; alt: string }>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const r = await fetchWithRetry(
      `${WP}/media?include=${chunk.join(",")}&per_page=100&_fields=id,source_url,mime_type,alt_text`,
    );
    if (!r.ok) continue;
    const items = (await r.json()) as Array<{
      id: number;
      source_url: string;
      mime_type: string;
      alt_text: string;
    }>;
    for (const m of items) {
      map.set(m.id, { url: m.source_url, mime: m.mime_type, alt: m.alt_text ?? "" });
    }
  }
  return map;
}

async function mirrorImage(
  slug: string,
  media: { url: string; mime: string; alt: string },
): Promise<string | null> {
  try {
    const r = await fetchWithRetry(media.url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = media.url.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
    const pathname = `wp-import/posts/${slug}.${ext}`;
    const blob = await put(pathname, buf, {
      access: "public",
      contentType: media.mime || "image/jpeg",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    await db
      .insert(blobAssets)
      .values({
        key: blob.pathname,
        blobUrl: blob.url,
        mimeType: media.mime || "image/jpeg",
        byteSize: buf.byteLength,
        alt: media.alt || null,
      })
      .onConflictDoNothing();
    return blob.pathname;
  } catch (e) {
    console.warn(`    ⚠ image mirror failed for ${slug}: ${String(e)}`);
    return null;
  }
}

async function main() {
  console.log(
    `Wave 18.2 — WP blog import${DRY_RUN ? " (DRY RUN)" : ""}${SKIP_IMAGES ? " (no images)" : ""}\n`,
  );
  const wpPosts = await fetchAllPosts();
  console.log(`Fetched ${wpPosts.length} WP posts.\n`);

  const skipped: string[] = [];
  const toImport: Array<{ post: WpPost; category: "pastor" | "stewardship" }> = [];
  for (const p of wpPosts) {
    if (p.status !== "publish") {
      skipped.push(`${p.slug} (status ${p.status})`);
      continue;
    }
    const cats = p.categories ?? [];
    const uncategorizedOnly = cats.length === 0 || cats.every((c) => c === 1);
    if (cats.some((c) => PASTOR_TERMS.has(c))) {
      toImport.push({ post: p, category: "pastor" });
    } else if (cats.some((c) => STEWARDSHIP_TERMS.has(c))) {
      toImport.push({ post: p, category: "stewardship" });
    } else if (uncategorizedOnly && /^(msgr-tom|from-our-pastor)/.test(p.slug)) {
      // A handful of pastor letters were left uncategorized on WP.
      toImport.push({ post: p, category: "pastor" });
    } else if (uncategorizedOnly && /stewardship/.test(p.slug)) {
      toImport.push({ post: p, category: "stewardship" });
    } else {
      skipped.push(`${p.slug} (cats ${cats.join(",")})`);
    }
  }
  console.log(`Importing ${toImport.length}, skipping ${skipped.length}.\n`);

  const mediaIds = [
    ...new Set(toImport.map((t) => t.post.featured_media).filter((n) => n > 0)),
  ];
  const mediaMap = SKIP_IMAGES ? new Map() : await fetchMediaUrls(mediaIds);
  console.log(`Resolved ${mediaMap.size}/${mediaIds.length} featured images.\n`);

  let created = 0;
  let updated = 0;
  let images = 0;
  for (const { post: p, category } of toImport) {
    const title = decodeEntities(htmlToPlainText(p.title.rendered, 300)).trim();
    const body = sanitizeHtml(p.content.rendered);
    const summary = decodeEntities(htmlToPlainText(p.excerpt.rendered, 400))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300) || null;
    const publishedAt = new Date(`${p.date_gmt}Z`);

    if (DRY_RUN) {
      console.log(`  [dry] ${category.padEnd(11)} ${p.slug}`);
      continue;
    }

    const [existing] = await db
      .select({ id: posts.id, photoBlobKey: posts.photoBlobKey })
      .from(posts)
      .where(eq(posts.slug, p.slug))
      .limit(1);

    let photoBlobKey = existing?.photoBlobKey ?? null;
    if (!photoBlobKey && !SKIP_IMAGES && p.featured_media > 0) {
      const media = mediaMap.get(p.featured_media);
      if (media) {
        photoBlobKey = await mirrorImage(p.slug, media);
        if (photoBlobKey) images++;
      }
    }

    if (existing) {
      await db
        .update(posts)
        .set({ title, body, summary, category, photoBlobKey, publishedAt, status: "published", updatedAt: new Date() })
        .where(eq(posts.id, existing.id));
      updated++;
    } else {
      await db.insert(posts).values({
        slug: p.slug,
        title,
        body,
        summary,
        category,
        photoBlobKey,
        publishedAt,
        status: "published",
        authorName: category === "pastor" ? "Msgr. Tom Nydegger" : null,
      });
      created++;
    }
    if ((created + updated) % 25 === 0) console.log(`  … ${created + updated}/${toImport.length}`);
  }

  console.log(`\n✓ ${created} created, ${updated} updated, ${images} images mirrored.`);
  if (skipped.length) {
    console.log(`\nSkipped (${skipped.length}):`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
