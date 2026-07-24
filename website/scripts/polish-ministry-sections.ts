/**
 * Phase 8 — Heuristic v2 polish for the 49 audit-imported ministries
 * that haven't been hand-templated.
 *
 * Two automated upgrades over the existing block sequence:
 *
 *   1. **Image_text lede.** For every ministry that has at least one
 *      non-hero secondary image in the audit library (24 of 57), the
 *      first rich_text block on the page is upgraded to an image_text
 *      pairing — the prose stays, paired with the secondary image on
 *      the right (page heroes are typically full-width so right-side
 *      contrast reads cleaner). Ministries with only a hero photo are
 *      left as-is; using the hero twice on the same page is awkward.
 *
 *   2. **Tagline cleanup.** If a tagline is empty AND the first rich_text
 *      block contains a clean opening sentence, derive a sharp tagline
 *      from it (max 160 chars, prefers prose over Bible quotes).
 *
 * Skipped:
 *   - wedding-ministry and mental-health-ministry (hand-templated; their
 *     blocks are bespoke).
 *   - the 12 standalone-intro ministries (their content lives at /p/<slug>;
 *     the ministry detail page is just a short button to the full page).
 *   - ministries with no rich_text blocks (action=edit ones).
 */

import { and, asc, eq, like, sql } from "drizzle-orm";
import { db } from "../db";
import {
  ministries,
  pageSections,
  blobAssets,
  type PageSectionPayload,
} from "../db/schema";

const HAND_TEMPLATED = new Set(["wedding-ministry", "mental-health-ministry"]);

const STANDALONE_SLUGS = new Set([
  "adoration",
  "basketball",
  "called",
  "christlife",
  "grow",
  "lifelines",
  "music",
  "pre-cana",
  "vbs",
  "wwp",
  "young-adult-ministry",
  "youth-ministry",
]);

/** Strip HTML tags and collapse whitespace. */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function deriveTagline(html: string): string | null {
  const text = decodeEntities(stripTags(html));
  if (!text) return null;
  const protect = (s: string) =>
    s
      .replace(/\b(St|Fr|Mr|Mrs|Ms|Dr|vs|Sr|Jr|Rev)\./g, "$1∎")
      .replace(/\.(org|com|net|edu)\b/g, "∎$1");
  const restore = (s: string) => s.replace(/∎/g, ".");
  const sentences = protect(text).split(/(?<=[.!?])\s+/);
  const candidate =
    sentences.find((s) => !s.trim().startsWith('"') && s.replace(/∎/g, "").length > 20) ??
    sentences[0] ??
    "";
  const final = restore(candidate);
  return final.length > 160 ? `${final.slice(0, 157)}…` : final;
}

async function findSecondaryImage(slug: string): Promise<{ key: string; alt: string | null } | null> {
  // Pull every audit image whose key starts with the slug — prefer non-hero
  // variants. Many ministries have one `<slug>-hero` + one `<slug>-section-bg`
  // or similar.
  const rows = await db
    .select({ key: blobAssets.key, alt: blobAssets.alt })
    .from(blobAssets)
    .where(
      and(
        like(blobAssets.key, `audit/${slug}-%`),
        // exclude hero (we don't want to reuse the page-level hero in a block)
        sql`${blobAssets.key} NOT LIKE ${"audit/" + slug + "-hero%"}`,
      ),
    );
  if (rows.length === 0) return null;
  // Prefer a `-section-bg-` variant if available, otherwise the first row.
  const sectionBg = rows.find((r) => r.key.includes("-section-bg-"));
  return sectionBg ?? rows[0]!;
}

async function main() {
  const list = await db
    .select({
      id: ministries.id,
      slug: ministries.slug,
      tagline: ministries.tagline,
      name: ministries.name,
    })
    .from(ministries);

  let upgraded = 0;
  let taglinesSet = 0;
  let skipped = 0;
  const skippedReasons: Record<string, number> = {};

  for (const m of list) {
    if (HAND_TEMPLATED.has(m.slug)) {
      skipped++;
      skippedReasons["hand-templated"] = (skippedReasons["hand-templated"] ?? 0) + 1;
      continue;
    }
    if (STANDALONE_SLUGS.has(m.slug)) {
      skipped++;
      skippedReasons["standalone-intro"] = (skippedReasons["standalone-intro"] ?? 0) + 1;
      continue;
    }

    const secs = await db
      .select()
      .from(pageSections)
      .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, m.id)))
      .orderBy(asc(pageSections.position));

    if (secs.length === 0) {
      skipped++;
      skippedReasons["no-blocks"] = (skippedReasons["no-blocks"] ?? 0) + 1;
      continue;
    }

    // Find the first rich_text block. If the first block is a heading,
    // look at the one after it.
    const firstRichTextIdx = secs.findIndex((s) => s.kind === "rich_text");
    if (firstRichTextIdx === -1) {
      skipped++;
      skippedReasons["no-rich-text"] = (skippedReasons["no-rich-text"] ?? 0) + 1;
      continue;
    }
    const firstRichText = secs[firstRichTextIdx]!;
    const firstHtml = (firstRichText.payload as { html: string }).html;

    // Try to derive a tagline if missing.
    if (!m.tagline || /\.{3}$|…$/.test(m.tagline) || m.tagline.length < 25) {
      const tagline = deriveTagline(firstHtml);
      if (tagline) {
        await db
          .update(ministries)
          .set({ tagline, updatedAt: new Date() })
          .where(eq(ministries.id, m.id));
        taglinesSet++;
      }
    }

    // Try to upgrade the first rich_text to an image_text.
    const img = await findSecondaryImage(m.slug);
    if (!img) {
      skipped++;
      skippedReasons["no-secondary-image"] = (skippedReasons["no-secondary-image"] ?? 0) + 1;
      continue;
    }

    const newPayload: PageSectionPayload = {
      kind: "image_text",
      blobKey: img.key,
      alt: img.alt ?? m.name,
      imageSide: "right",
      html: firstHtml,
    };
    await db
      .update(pageSections)
      .set({ kind: "image_text", payload: newPayload, updatedAt: new Date() })
      .where(eq(pageSections.id, firstRichText.id));
    upgraded++;
    console.log(`  ✓ ${m.slug.padEnd(40)} → image_text + ${img.key.replace("audit/", "")}`);
  }

  console.log(`\n✓ upgraded to image_text : ${upgraded}`);
  console.log(`  taglines refreshed     : ${taglinesSet}`);
  console.log(`  skipped                : ${skipped}`);
  for (const [reason, n] of Object.entries(skippedReasons)) {
    console.log(`    ${reason.padEnd(20)} ${n}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
