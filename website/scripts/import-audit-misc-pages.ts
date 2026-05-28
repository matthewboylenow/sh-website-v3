/**
 * Audit Phase 9 — Misc CMS pages (Pastoral Council, All In Report, etc.)
 *
 * Builds pages.table rows for content scraped from /tmp that doesn't
 * fit a dedicated route. Each lands at /p/<slug> with a permanent
 * redirect from the legacy URL.
 *
 * Sources:
 *   • content/<slug>/page.md (legacy site scrape, run through the same
 *     preprocessing pipeline as the standalone-intros)
 *
 * Strategy: each page row is published; htmlToBlocks segments the body
 * into heading + rich_text + auto-detected card_grids. Hero photos
 * come from the audit library where matching art exists.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  pages,
  pageSections,
  siteSettings,
  type PageSectionPayload,
  type Redirect,
} from "../db/schema";
import { htmlToBlocks } from "./_html-to-blocks";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";

type MiscPageSeed = {
  slug: string;
  legacySlug: string;
  title: string;
  summary: string;
  photoBlobKey?: string | null;
  introBlocks?: PageSectionPayload[];
  /** When true, redirect the legacy /<slug> URL to /p/<slug>. */
  addRedirect: boolean;
};

const SEEDS: MiscPageSeed[] = [
  {
    slug: "pastoral-council",
    legacySlug: "pastoral-council",
    title: "Pastoral Council",
    summary:
      "A broadly representative group of parish members presided over by the pastor, helping foster pastoral activity and our parish mission.",
    photoBlobKey: "audit/parish-hero-mass-congregation-sanctuary.jpg",
    introBlocks: [
      {
        kind: "callout_banner",
        tone: "navy",
        tag: "Get in touch",
        title: "Reach the Pastoral Council directly.",
        body: "Share a concern, suggestion, or question with the Pastoral Council — your voice helps shape the life of our parish.",
        ctaLabel: "Email the Council",
        ctaHref: "mailto:pastoralcouncil@sainthelen.org",
      },
    ],
    addRedirect: true,
  },
  {
    slug: "allin",
    legacySlug: "allin",
    title: "All In Community Report",
    summary:
      "Our parish-wide annual report — a snapshot of who we are, what we're doing, and where we're headed as a community of disciples.",
    photoBlobKey: "audit/allin-section-bg-children-worship-retreat.jpg",
    introBlocks: [
      {
        kind: "button_group",
        items: [
          {
            label: "Download the 2024–25 Report (PDF)",
            href: "https://sainthelen.org/wp-content/uploads/2025/11/All-In-Report-2025-1.pdf",
            variant: "primary",
          },
        ],
      },
    ],
    addRedirect: true,
  },
  {
    slug: "jubilee-2025",
    legacySlug: "jubilee-2025",
    title: "Jubilee 2025",
    summary:
      "Saint Helen is a designated Jubilee Pilgrimage Church in the Archdiocese of Newark — explore the indulgence, plan a visit, and walk this Holy Year with us.",
    photoBlobKey: "audit/jubilee-2025-hero-st-peters-basilica-statues.jpg",
    addRedirect: true,
  },
  {
    slug: "divinemercy",
    legacySlug: "divinemercy",
    title: "Divine Mercy",
    summary:
      "Celebrating Divine Mercy Sunday and the wider Divine Mercy devotion at Saint Helen.",
    photoBlobKey: "audit/divine-mercy-section-bg-jesus-image-shrine.jpg",
    addRedirect: true,
  },
  {
    slug: "hallow",
    legacySlug: "hallow",
    title: "Pray with Saint Helen on Hallow",
    summary:
      "Join the parish on the Hallow prayer app for Advent, Lent, and year-round Catholic prayer and reflection.",
    photoBlobKey: "audit/hallow-section-bg-pray-every-day-graphic.png",
    addRedirect: true,
  },
  {
    slug: "heritage",
    legacySlug: "heritage",
    title: "Saint Helen Heritage Fund",
    summary:
      "A restricted fund supporting parish needs, improvements, and programs — and the legacy gifts of parishioners who came before us.",
    photoBlobKey: "audit/heritage-section-bg-mass-congregation-sanctuary.jpg",
    introBlocks: [
      {
        kind: "button_group",
        items: [
          {
            label: "View Heritage Fund opportunities",
            href: "https://my.sainthelen.org/OnlineReg/3130",
            variant: "primary",
          },
        ],
      },
    ],
    addRedirect: true,
  },
  {
    slug: "parish-mission",
    legacySlug: "parish-mission",
    title: "Parish Mission",
    summary:
      "Annual mission events at Saint Helen — preaching, prayer, and renewed faith for the whole parish.",
    photoBlobKey: "audit/parish-mission-section-bg-mountaintop-arms-open.jpg",
    addRedirect: true,
  },
  {
    slug: "manresa",
    legacySlug: "manresa",
    title: "Manresa Retreat",
    summary:
      "Ignatian-rooted retreats and mornings of reflection hosted at Saint Helen.",
    photoBlobKey: null,
    addRedirect: true,
  },
  {
    slug: "become-catholic",
    legacySlug: "become-catholic",
    title: "Become Catholic — OCIA",
    summary:
      "The Order of Christian Initiation of Adults — a casual, conversational journey for anyone exploring the Catholic faith.",
    photoBlobKey: "audit/become-catholic-bg-woman-reading-proverbs.jpg",
    introBlocks: [
      {
        kind: "button_group",
        items: [
          {
            label: "Sign up for OCIA",
            href: "/p/ocia-form",
            variant: "primary",
          },
        ],
      },
    ],
    addRedirect: true,
  },
  {
    slug: "attend-in-person",
    legacySlug: "attend-in-person",
    title: "Attend in Person",
    summary:
      "Welcome to Saint Helen — whether it's your first time or your fortieth, here's what to expect when you walk through our doors.",
    photoBlobKey: "audit/attend-mass-section-bg-easter-sanctuary-baptismal-font.jpg",
    introBlocks: [
      {
        kind: "button_group",
        items: [
          { label: "Mass schedule", href: "/mass", variant: "primary" },
          { label: "I'm new", href: "/im-new", variant: "secondary" },
        ],
      },
    ],
    addRedirect: true,
  },
  {
    slug: "live",
    legacySlug: "live",
    title: "Attend Online",
    summary:
      "Join us for Mass from wherever you are — livestream details, archived Masses, and how to participate fully from home.",
    photoBlobKey: "audit/home-section-bg-livestream-control-booth.jpg",
    introBlocks: [
      {
        kind: "button_group",
        items: [
          { label: "This Sunday's livestream", href: "/mass", variant: "primary" },
        ],
      },
    ],
    addRedirect: true,
  },
  {
    slug: "app",
    legacySlug: "app",
    title: "Saint Helen Mobile App",
    summary:
      "Our parish app brings Mass readings, blogs, the calendar, livestreams, podcasts, and devotional content into one place.",
    photoBlobKey: null,
    addRedirect: true,
  },
  {
    slug: "prayers",
    legacySlug: "prayers",
    title: "Prayer Requests",
    summary:
      "Submit a prayer request, ask for our prayers, or pray with us — your intentions, lifted up by our community.",
    photoBlobKey: "audit/prayers-section-bg-hands-raised-worship.jpg",
    addRedirect: true,
  },
];

function preprocessMarkdown(md: string): string {
  let out = md;
  out = out.replace(/\[([^\]]+)\]\{\.[^}]+\}/g, "$1");
  out = out.replace(/\{\s*width=[^}]*\}/g, "");
  out = out.replace(/!\[[^\]]*\]\(media\/[^)]+\)/g, "");
  out = out.replace(/(\w)\\@/g, "$1@");
  out = out.replace(/\*{2,3}[A-Z]{3,}\*{1,3}[\s\S]*$/, "");
  // Strip the legacy "Back to Our Team" link at the top of pastoral-council.
  out = out.replace(/^\s*\[\s*Back to[^\]]+\]\([^)]+\)\s*\n+/im, "");
  out = out.replace(/^\s*#{1,6}\s+[^\n]+\n/, "");
  out = out.replace(/\n\*\s*908-232-1214[\s\S]*$/, "");
  // Drop the universal "Read Bio" anchor that ends every council member entry
  out = out.replace(/^Read Bio\s*$/gm, "");
  // Drop image references with WordPress URLs (we don't have those images here)
  out = out.replace(/!\[[^\]]*\]\(https:\/\/sainthelen\.org\/[^)]+\)/g, "");
  return out.trim();
}

function mdToSafeHtml(md: string): string {
  const cleaned = preprocessMarkdown(md);
  const raw = marked.parse(cleaned, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ["p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "h5", "h6", "hr", "code", "pre"],
    allowedAttributes: { a: ["href", "name", "target", "rel"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      h1: "h2",
    },
  });
}

async function fileExists(p: string) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  const queuedRedirects: Redirect[] = [];

  for (const seed of SEEDS) {
    const legacyPath = path.join(AUDIT_ROOT, `content/${seed.legacySlug}/page.md`);
    let blocks: PageSectionPayload[] = [];
    if (await fileExists(legacyPath)) {
      const parsed = matter(await readFile(legacyPath, "utf8"));
      const html = mdToSafeHtml(parsed.content);
      blocks = htmlToBlocks(html);
    }
    // Prepend any intro blocks the seed wants (e.g. a Download CTA above
    // the body for the All In report).
    if (seed.introBlocks) blocks = [...seed.introBlocks, ...blocks];

    const [row] = await db
      .insert(pages)
      .values({
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        photoBlobKey: seed.photoBlobKey ?? null,
        status: "published",
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          title: seed.title,
          summary: seed.summary,
          photoBlobKey: seed.photoBlobKey ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pages.id });
    if (!row) throw new Error(`pages insert returned no row for ${seed.slug}`);

    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, row.id)));
    if (blocks.length > 0) {
      await db.insert(pageSections).values(
        blocks.map((p, i) => ({
          parentKind: "page" as const,
          parentId: row.id,
          position: i,
          kind: p.kind,
          payload: p,
        })),
      );
    }

    if (seed.addRedirect) {
      queuedRedirects.push({
        from: `/${seed.legacySlug}`,
        to: `/p/${seed.slug}`,
        permanent: true,
      });
    }
    console.log(`  ✓ /p/${seed.slug.padEnd(20)} ${blocks.length} blocks`);
  }

  // Merge redirects
  const [settings] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (settings) {
    const byFrom = new Map<string, Redirect>((settings.redirects ?? []).map((r) => [r.from, r]));
    let added = 0;
    for (const r of queuedRedirects) {
      if (!byFrom.has(r.from)) added++;
      byFrom.set(r.from, r);
    }
    const merged = Array.from(byFrom.values()).sort((a, b) => a.from.localeCompare(b.from));
    await db.update(siteSettings).set({ redirects: merged }).where(eq(siteSettings.id, 1));
    console.log(`\nRedirects: +${added} new (${merged.length} total)`);
  }
  console.log(`\n✓ Imported ${SEEDS.length} misc pages.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
