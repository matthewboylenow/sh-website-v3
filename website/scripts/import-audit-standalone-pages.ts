/**
 * Phase 4 of the May 2026 pre-launch audit import.
 *
 * Creates 12 rows in the `pages` table for the standalone-intro pages
 * — adoration, basketball, called, christlife, grow, lifelines, music,
 * pre-cana, vbs, wwp, young-adult-ministry, youth-ministry — using the
 * legacy scraped content under content/<slug>/page.md as the source of
 * truth. Each page lands at /p/<slug> in draft status; the matching
 * ministry detail page is updated to link there.
 *
 * Side effects:
 *   1. INSERT/UPDATE pages row keyed on slug.
 *   2. REPLACE page_sections (parentKind='page', parentId=pages.id) with
 *      heuristic-converted blocks from the legacy scrape.
 *   3. UPDATE the corresponding ministry row's button_group section
 *      (parentKind='ministry') so the CTA points at /p/<slug>.
 *   4. ADD redirects for the WordPress URL shape: /<slug> → /p/<slug>.
 *
 * Run: pnpm exec tsx --env-file=.env.local scripts/import-audit-standalone-pages.ts
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ministries,
  pageSections,
  pages,
  siteSettings,
  type PageSectionPayload,
  type Redirect,
} from "../db/schema";
import { htmlToBlocks } from "./_html-to-blocks";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";

const STANDALONE_SLUGS = [
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
] as const;

async function fileExists(p: string) {
  try { await stat(p); return true; } catch { return false; }
}

/**
 * Same preprocessing pipeline used for ministries — strip pandoc syntax,
 * editor instructions, breadcrumb chrome, and the related-ministries
 * widget that the scraper consistently appends.
 */
function preprocessMarkdown(md: string): string {
  let out = md;
  out = out.replace(/\[([^\]]+)\]\{\.[^}]+\}/g, "$1");
  out = out.replace(/\{\s*width=[^}]*\}/g, "");
  out = out.replace(/!\[[^\]]*\]\(media\/[^)]+\)/g, "");
  out = out.replace(/(\w)\\@/g, "$1@");
  out = out.replace(/\*{2,3}[A-Z]{3,}\*{1,3}[\s\S]*$/, "");
  out = out.replace(/^#{1,6}\s+(Intro paragraph|Audit guidance|Brief introductory)[^\n]*\n/gim, "");
  out = out.replace(/^_\([^)]+\)_\s*$/gm, "");
  out = out.replace(/^\s*#{1,6}\s+[^\n]+\n/, "");
  out = out.replace(/^\*[^*\n]{3,40}:\*\s*$/gm, "");
  out = out.replace(/^\s*\[\s*All Ministries\s*\]\([^)]+\)\s*\n+/i, "");
  out = out.replace(/^(Support\s*&\s*Outreach|Worshipping God|Making Disciples)\s*\n+/im, "");
  out = out.replace(/\n#{1,6}\s+You Might Also Be Interested In[\s\S]*$/i, "");
  // The legacy scraper appends a global footer (address, mass schedule,
  // social links) to every page. The hook is a phone-number bullet line.
  out = out.replace(/\n\*\s*908-232-1214[\s\S]*$/, "");
  return out.trim();
}

function mdToSafeHtml(md: string): string {
  const cleaned = preprocessMarkdown(md);
  const raw = marked.parse(cleaned, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "blockquote",
      "h2", "h3", "h4", "h5", "h6", "hr", "code", "pre",
    ],
    allowedAttributes: { a: ["href", "name", "target", "rel"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      h1: "h2",
    },
  });
}

type PageInput = {
  slug: string;
  title: string;
  summary: string | null;
  photoBlobKey: string | null;
};

async function findHeroForSlug(slug: string): Promise<string | null> {
  // 1. Direct match — audit/<slug>-hero.*
  const direct = ["png", "jpg", "jpeg"]
    .map((ext) => `${slug}-hero.${ext}`);
  for (const f of direct) {
    if (await fileExists(path.join(AUDIT_ROOT, "public-ready/images-renamed", f))) {
      return `audit/${f}`;
    }
  }
  // 2. Any file in public-ready/images-renamed/ that starts with the slug
  try {
    const files = await readdir(path.join(AUDIT_ROOT, "public-ready/images-renamed"));
    const cand = files.find((f) => f.startsWith(`${slug}-`));
    if (cand) return `audit/${cand}`;
  } catch { /* ignore */ }
  return null;
}

async function loadAuditIntroSummary(slug: string): Promise<string | null> {
  const introPath = path.join(AUDIT_ROOT, `updates/standalone-intros/${slug}.md`);
  if (!(await fileExists(introPath))) return null;
  const parsed = matter(await readFile(introPath, "utf8"));
  // Strip frontmatter audit headings and grab the first meaningful prose
  // sentence. The intro paragraph lives under "## Intro paragraph for…".
  const body = preprocessMarkdown(parsed.content);
  const html = sanitizeHtml(marked.parse(body, { async: false }) as string, {
    allowedTags: [], allowedAttributes: {},
  });
  const text = html.replace(/\s+/g, " ").trim();
  if (!text) return null;
  // "Approved as is." is an audit marker meaning the legacy page is fine
  // without rewrites — it's editorial signal, not user-facing summary.
  if (/^\s*Approved as is\.?\s*$/i.test(text)) return null;
  return text.length > 250 ? `${text.slice(0, 247)}…` : text;
}

async function main() {
  let pagesUpserted = 0;
  let sectionsInserted = 0;
  let ministriesUpdated = 0;
  const newRedirects: Redirect[] = [];

  for (const slug of STANDALONE_SLUGS) {
    // ---- Resolve title from pages.json index ------------------- //
    const legacyPath = path.join(AUDIT_ROOT, `content/${slug}/page.md`);
    const legacyExists = await fileExists(legacyPath);

    // Title comes from updates/standalone-intros/<slug>.md frontmatter,
    // falling back to the legacy page H1.
    const introPath = path.join(AUDIT_ROOT, `updates/standalone-intros/${slug}.md`);
    let title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (await fileExists(introPath)) {
      const introParsed = matter(await readFile(introPath, "utf8"));
      if (typeof introParsed.data.name === "string") title = introParsed.data.name;
    }

    const summary = await loadAuditIntroSummary(slug);
    const photoBlobKey = await findHeroForSlug(slug);

    // ---- Build body blocks from the legacy scrape -------------- //
    let blocks: PageSectionPayload[] = [];
    if (legacyExists) {
      const legacy = matter(await readFile(legacyPath, "utf8"));
      const html = mdToSafeHtml(legacy.content);
      blocks = htmlToBlocks(html);
    }
    // Fallback: render the audit's intro markdown if no legacy body.
    if (blocks.length === 0 && (await fileExists(introPath))) {
      const introParsed = matter(await readFile(introPath, "utf8"));
      const html = mdToSafeHtml(introParsed.content);
      blocks = htmlToBlocks(html);
    }

    const input: PageInput = {
      slug,
      title,
      summary,
      photoBlobKey,
    };

    // ---- Upsert pages row -------------------------------------- //
    const [pageRow] = await db
      .insert(pages)
      .values({
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        photoBlobKey: input.photoBlobKey,
        status: "draft",
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          title: input.title,
          summary: input.summary,
          photoBlobKey: input.photoBlobKey,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pages.id });
    if (!pageRow) throw new Error(`pages insert returned no row for ${slug}`);
    pagesUpserted++;

    // ---- Replace page_sections --------------------------------- //
    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, pageRow.id)));
    if (blocks.length > 0) {
      await db.insert(pageSections).values(
        blocks.map((p, i) => ({
          parentKind: "page" as const,
          parentId: pageRow.id,
          position: i,
          kind: p.kind,
          payload: p,
        })),
      );
      sectionsInserted += blocks.length;
    }

    // ---- Re-point the matching ministry's button_group ---------- //
    const [ministry] = await db
      .select({ id: ministries.id })
      .from(ministries)
      .where(eq(ministries.slug, slug))
      .limit(1);
    if (ministry) {
      const localHref = `/p/${slug}`;
      const ministrySections = await db
        .select()
        .from(pageSections)
        .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, ministry.id)));
      for (const s of ministrySections) {
        if (s.kind !== "button_group") continue;
        const payload = s.payload as Extract<PageSectionPayload, { kind: "button_group" }>;
        const updated = {
          ...payload,
          items: payload.items.map((it) => ({ ...it, href: localHref })),
        };
        await db
          .update(pageSections)
          .set({ payload: updated as PageSectionPayload, updatedAt: new Date() })
          .where(eq(pageSections.id, s.id));
        ministriesUpdated++;
      }
    }

    // ---- Queue redirect ---------------------------------------- //
    newRedirects.push({ from: `/${slug}`, to: `/p/${slug}`, permanent: true });

    console.log(`  ✓ ${slug.padEnd(22)} blocks=${blocks.length}, photo=${photoBlobKey ? "yes" : "no"}, ministry=${ministry ? "linked" : "n/a"}`);
  }

  // ---- Merge new redirects into siteSettings ------------------- //
  const [settings] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (settings) {
    const existing = settings.redirects ?? [];
    const byFrom = new Map<string, Redirect>();
    for (const r of existing) byFrom.set(r.from, r);
    let added = 0;
    for (const r of newRedirects) {
      if (!byFrom.has(r.from)) added++;
      byFrom.set(r.from, r);
    }
    const merged = Array.from(byFrom.values()).sort((a, b) => a.from.localeCompare(b.from));
    await db
      .update(siteSettings)
      .set({ redirects: merged })
      .where(eq(siteSettings.id, 1));
    console.log(`\nRedirects: +${added} new (${newRedirects.length} queued, ${merged.length} total)`);
  }

  console.log(`\n✓ pages upserted        : ${pagesUpserted}`);
  console.log(`  page_sections inserted: ${sectionsInserted}`);
  console.log(`  ministry buttons fixed: ${ministriesUpdated}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
