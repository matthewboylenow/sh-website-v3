/**
 * Reconciliation import — post-launch audit fixes for the Next.js ministries.
 *
 * WHERE THIS GOES:  copy into  website/scripts/import-reconciliation.ts
 *   (so the relative imports ../db and ./_html-to-blocks resolve)
 *
 * RUN (from website/):
 *   pnpm tsx --env-file=.env.local scripts/import-reconciliation.ts --dry-run   # preview
 *   pnpm tsx --env-file=.env.local scripts/import-reconciliation.ts             # apply
 *
 * Point AUDIT_ROOT at your revamp folder if it isn't the default, e.g.:
 *   AUDIT_ROOT="/Volumes/Downloads Documents/sainthelen-revamp" \
 *     pnpm tsx --env-file=.env.local scripts/import-reconciliation.ts --dry-run
 *
 * WHAT IT DOES:
 *   Reads clean markdown from AUDIT_ROOT/reconcile-content/<slug>.md. For each
 *   file it updates ONLY that ministry — refreshes the tagline (if the
 *   frontmatter sets one) and rebuilds its page_sections from the markdown body
 *   using the same marked → sanitize-html → htmlToBlocks pipeline as
 *   import-audit-ministries.ts.
 *
 *   Targeted + non-destructive: only slugs that have a reconcile-content file
 *   are touched. status, category, photoBlobKey, contactEmail, leads, and
 *   inquiryConfig are left exactly as they are. HAND_TEMPLATED ministries are
 *   skipped (they're hand-built in admin).
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { ministries, pageSections, type PageSectionPayload } from "../db/schema";
import { htmlToBlocks } from "./_html-to-blocks";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";

const RECONCILE_DIR = path.join(AUDIT_ROOT, "reconcile-content");

// Hand-built layouts in admin — never overwrite from an import.
const HAND_TEMPLATED = new Set(["wedding-ministry", "mental-health-ministry"]);

const DRY_RUN = process.argv.includes("--dry-run");

/** Same sanitize contract as import-audit-ministries.ts mdToSafeHtml(). */
function mdToSafeHtml(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "a", "ul", "ol", "li",
      "blockquote", "h2", "h3", "h4", "h5", "h6", "hr", "code", "pre",
    ],
    allowedAttributes: { a: ["href", "name", "target", "rel"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      h1: "h2",
    },
  });
}

async function main() {
  let files: string[];
  try {
    files = (await readdir(RECONCILE_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    throw new Error(
      `reconcile-content not found at ${RECONCILE_DIR}. Set AUDIT_ROOT to your revamp folder.`,
    );
  }
  files.sort();
  console.log(
    `Reconciling ${files.length} ministr${files.length === 1 ? "y" : "ies"} from ${RECONCILE_DIR}` +
      (DRY_RUN ? "  (DRY RUN — no writes)" : "") +
      "\n",
  );

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  let sectionCount = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");

    if (HAND_TEMPLATED.has(slug)) {
      console.log(`  ~ skip (hand-templated): ${slug}`);
      skipped++;
      continue;
    }

    const parsed = matter(await readFile(path.join(RECONCILE_DIR, file), "utf8"));
    const tagline = typeof parsed.data.tagline === "string" ? parsed.data.tagline : null;
    const bodyHtml = mdToSafeHtml(parsed.content.trim());
    const blocks = htmlToBlocks(bodyHtml);

    const [row] = await db
      .select({ id: ministries.id, name: ministries.name })
      .from(ministries)
      .where(eq(ministries.slug, slug))
      .limit(1);

    if (!row) {
      console.log(`  x not found on site: ${slug}`);
      missing++;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  DRY ${slug.padEnd(34)} ${blocks.length} block(s)${tagline ? "  +tagline" : ""}`,
      );
      continue;
    }

    await db
      .update(ministries)
      .set(tagline ? { tagline, updatedAt: new Date() } : { updatedAt: new Date() })
      .where(eq(ministries.id, row.id));

    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, row.id)));

    if (blocks.length > 0) {
      await db.insert(pageSections).values(
        blocks.map((block, i) => ({
          parentKind: "ministry" as const,
          parentId: row.id,
          position: i,
          kind: block.kind,
          payload: block as PageSectionPayload,
        })),
      );
      sectionCount += blocks.length;
    }

    console.log(`  ok ${slug.padEnd(34)} ${blocks.length} block(s)${tagline ? "  +tagline" : ""}`);
    updated++;
  }

  console.log(
    `\n${DRY_RUN ? "Would update" : "Updated"}: ${updated}  |  sections: ${sectionCount}  |  skipped: ${skipped}  |  not-found: ${missing}`,
  );
  if (!DRY_RUN) {
    console.log("\nRemember to revalidate: the ministries query caches for 1h (tag 'ministries').");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
