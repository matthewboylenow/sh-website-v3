/**
 * One-shot importer for the 9 evergreen pages provided by the
 * June 2026 reconciliation bundle (our-team, pastoral-council, become-catholic,
 * mass-intentions, prayers, podcast, spiritual-direction, privacy-policy,
 * from-our-pastor). Each file is YAML frontmatter (title + tagline) plus a
 * markdown body. We upsert into the `pages` table (status=published) and
 * rebuild the page's block layout from the markdown.
 *
 *   pnpm tsx --env-file=.env.local scripts/import-reconciliation-pages.ts --dry-run
 *   pnpm tsx --env-file=.env.local scripts/import-reconciliation-pages.ts
 *
 * Point AUDIT_ROOT at the reconciliation bundle root, e.g.
 *   AUDIT_ROOT="/workspaces/sh-website-v3/sh-nextjs-reconciliation/sh-nextjs-reconciliation" \
 *     pnpm tsx --env-file=.env.local scripts/import-reconciliation-pages.ts
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { pages, pageSections, type PageSectionPayload } from "../db/schema";
import { htmlToBlocks } from "./_html-to-blocks";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/sh-nextjs-reconciliation/sh-nextjs-reconciliation";

const PAGES_DIR = path.join(AUDIT_ROOT, "pages-content");
const DRY_RUN = process.argv.includes("--dry-run");

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

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
    files = (await readdir(PAGES_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    throw new Error(
      `pages-content not found at ${PAGES_DIR}. Set AUDIT_ROOT to your bundle root.`,
    );
  }
  files.sort();
  console.log(
    `Importing ${files.length} page${files.length === 1 ? "" : "s"} from ${PAGES_DIR}` +
      (DRY_RUN ? "  (DRY RUN — no writes)" : "") +
      "\n",
  );

  let inserted = 0;
  let updated = 0;
  let sectionCount = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const parsed = matter(await readFile(path.join(PAGES_DIR, file), "utf8"));
    const title =
      typeof parsed.data.title === "string" && parsed.data.title.trim()
        ? parsed.data.title.trim()
        : slugToTitle(slug);
    const tagline = typeof parsed.data.tagline === "string" ? parsed.data.tagline.trim() : null;
    const bodyHtml = mdToSafeHtml(parsed.content.trim());
    const blocks = htmlToBlocks(bodyHtml);

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (DRY_RUN) {
      const verb = existing ? "DRY upd" : "DRY ins";
      console.log(
        `  ${verb} ${slug.padEnd(24)} title="${title}"  blocks=${blocks.length}${tagline ? "  +tagline" : ""}`,
      );
      continue;
    }

    let pageId: string;
    if (existing) {
      await db
        .update(pages)
        .set({
          title,
          summary: tagline,
          status: "published",
          updatedAt: new Date(),
        })
        .where(eq(pages.id, existing.id));
      pageId = existing.id;
      updated++;
    } else {
      const [inserted_] = await db
        .insert(pages)
        .values({
          slug,
          title,
          summary: tagline,
          status: "published",
        })
        .returning({ id: pages.id });
      pageId = inserted_.id;
      inserted++;
    }

    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, pageId)));

    if (blocks.length > 0) {
      await db.insert(pageSections).values(
        blocks.map((block, i) => ({
          parentKind: "page" as const,
          parentId: pageId,
          position: i,
          kind: block.kind,
          payload: block as PageSectionPayload,
        })),
      );
      sectionCount += blocks.length;
    }

    console.log(
      `  ok ${slug.padEnd(24)} title="${title}"  blocks=${blocks.length}${tagline ? "  +tagline" : ""}`,
    );
  }

  console.log(
    `\n${DRY_RUN ? "Would" : "Did"}: inserted=${inserted}  updated=${updated}  sections=${sectionCount}`,
  );
  if (!DRY_RUN) {
    console.log(
      "\nRemember to revalidate: the pages query caches for 600s (tags 'pages' + 'page-sections').",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
