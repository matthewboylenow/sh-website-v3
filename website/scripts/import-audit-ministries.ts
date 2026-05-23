/**
 * Phase 2 of the May 2026 pre-launch audit import.
 *
 * Upserts 51 ministries from the pastoral council audit. For each row:
 *
 *  - Base shape comes from scripts/_audit-ministries-seed.ts (validator-
 *    shaped MinistryCreateInput rows with audit provenance comments).
 *  - Hero photo: looked up in /tmp/revamp-extract/.../manifests/images.csv
 *    by matching the ministry slug to a row with role="hero". Uploaded
 *    in Phase 1 as `audit/<filename>`; we set that as photoBlobKey.
 *  - Body content: depends on the per-slug update action:
 *      • content-new/ministries__<slug>/page.md  → fresh copy, becomes
 *        a rich_text page_section
 *      • updates/standalone-intros/<slug>.md     → short intro paragraph
 *        + button_group section linking to the external URL
 *      • updates/edits/<slug>.md (action=approved-as-is) → use legacy
 *        scraped body from content/ministries__<slug>/page.md as a
 *        starting point
 *      • updates/edits/<slug>.md (action=edit)    → audit guidance only;
 *        skip body sections (admins fill in)
 *
 * Per user direction: UPSERT ALL (overwrite mode). Existing ministry rows
 * with matching slugs get every field replaced. Existing page_sections
 * (parentKind='ministry') get deleted for any slug we're touching, then
 * recreated from the audit copy.
 *
 * Run: pnpm run scripts:import-audit-ministries
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { ministries, pageSections, type MinistryInquiryConfig } from "../db/schema";
import { auditMinistries } from "./_audit-ministries-seed";
import type { PageSectionPayload } from "../db/schema";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";

type CsvRow = {
  alt: string;
  new_filename: string;
  role: string;
  page_path: string;
  page_url: string;
  what_i_see: string;
  confidence: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    return row as unknown as CsvRow;
  });
}

/** Find the best hero image for a given ministry slug. */
async function findHeroOnDisk(slug: string): Promise<string | null> {
  const dir = path.join(AUDIT_ROOT, `content-new/ministries__${slug}/images`);
  try {
    const files = await readdir(dir);
    const hero = files.find((f) => /-hero\.(png|jpg|jpeg)$/i.test(f)) ?? files[0];
    return hero ?? null;
  } catch {
    return null;
  }
}

function findHero(slug: string, csv: CsvRow[]): string | null {
  // Match strategies in order:
  //   1. CSV page_url ends with /ministries/<slug>/ AND role=hero
  //   2. CSV page_path contains content-new/ministries__<slug>
  //   3. New filename starts with <slug>-hero
  //   4. New filename starts with <slug>- (any prefix match)
  const urlPattern = new RegExp(`/ministries/${slug}/?$`);
  const newPathPattern = new RegExp(`content-new/ministries__${slug}(/|$)`);

  const candidates = csv.filter(
    (r) =>
      r.new_filename &&
      (urlPattern.test(r.page_url) ||
        newPathPattern.test(r.page_path) ||
        r.new_filename.startsWith(`${slug}-hero`) ||
        r.new_filename === `${slug}.jpg` ||
        r.new_filename === `${slug}.png`),
  );

  const hero = candidates.find((r) => r.role === "hero");
  if (hero) return hero.new_filename;
  if (candidates[0]) return candidates[0].new_filename;
  return null;
}

/**
 * Clean up pandoc-flavoured markdown that the audit team's Word-doc
 * export produced. Strips pandoc-specific span syntax, internal-only
 * editor instructions, and broken Word-doc media references that point
 * at files we never received.
 */
function preprocessMarkdown(md: string): string {
  let out = md;
  // Strip pandoc inline spans: [text]{.underline} → text
  out = out.replace(/\[([^\]]+)\]\{\.[^}]+\}/g, "$1");
  // Strip pandoc image attribute blocks: {width="..." height="..."}
  out = out.replace(/\{\s*width=[^}]*\}/g, "");
  // Strip Word-doc media references: ![](media/imageN.png)
  out = out.replace(/!\[[^\]]*\]\(media\/[^)]+\)/g, "");
  // Strip escape backslashes in email addresses: foo\@bar → foo@bar
  out = out.replace(/(\w)\\@/g, "$1@");
  // Cut everything from the first editor-instruction marker onward.
  // Convention: `***MATT*` / `***MATT**` opens a block of form/UI
  // specs aimed at the developer, not page content. Everything that
  // follows (subcommittee lists, form field specs, mailto routes) is
  // editor-only.
  out = out.replace(/\*{2,3}[A-Z]{3,}\*{1,3}[\s\S]*$/, "");
  // Drop internal audit headings + their parenthetical labels:
  //   "## Intro paragraph for /ministries/ index page"
  //   "## Audit guidance from pastoral council"
  //   "_(Goes on the main ministries page…)_"
  out = out.replace(/^#{1,6}\s+(Intro paragraph|Audit guidance|Brief introductory)[^\n]*\n/gim, "");
  out = out.replace(/^_\([^)]+\)_\s*$/gm, "");
  // Drop the first top-level heading entirely — it duplicates the
  // ministry name, which is already rendered as the page title.
  out = out.replace(/^\s*#{1,6}\s+[^\n]+\n/, "");
  // Trim italicized intro labels left over from Word formatting:
  //   "*Brief introductory paragraph:*"
  out = out.replace(/^\*[^*\n]{3,40}:\*\s*$/gm, "");
  // Strip leading breadcrumb links + category labels that survived
  // the scraper's nav-strip pass. Examples seen in mental-health,
  // helping-hands: a single-link paragraph followed by a category
  // line, before the real body kicks in with "## About This Ministry".
  out = out.replace(/^\s*\[\s*All Ministries\s*\]\([^)]+\)\s*\n+/i, "");
  out = out.replace(/^(Support\s*&\s*Outreach|Worshipping God|Making Disciples)\s*\n+/im, "");
  return out.trim();
}

/** Decode the common HTML entities we'll see in scraped/rendered text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function mdToSafeHtml(md: string): string {
  const cleaned = preprocessMarkdown(md);
  const raw = marked.parse(cleaned, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      // marked emits h1 from `# Title`; we don't want page-level h1
      // inside a section block (the ministry name already renders one).
      h1: "h2",
    },
  });
}

type AuditAction = "create-new" | "edit" | "approved-as-is" | "standalone-intro";

type LoadedContent = {
  action: AuditAction;
  bodyMd?: string;
  standaloneUrl?: string;
  legacyUrl?: string;
  auditNote?: string;
};

async function loadContent(slug: string): Promise<LoadedContent | null> {
  const contentNew = path.join(AUDIT_ROOT, `content-new/ministries__${slug}/page.md`);
  const editsFile = path.join(AUDIT_ROOT, `updates/edits/ministries__${slug}.md`);
  const introFile = path.join(AUDIT_ROOT, `updates/standalone-intros/${slug}.md`);
  const legacy = path.join(AUDIT_ROOT, `content/ministries__${slug}/page.md`);

  if (await fileExists(contentNew)) {
    const parsed = matter(await readFile(contentNew, "utf8"));
    return {
      action: "create-new",
      bodyMd: parsed.content,
      auditNote: (parsed.data.audit_note as string) || undefined,
    };
  }
  if (await fileExists(introFile)) {
    const parsed = matter(await readFile(introFile, "utf8"));
    return {
      action: "standalone-intro",
      bodyMd: parsed.content,
      standaloneUrl: (parsed.data.standalone_url as string) || undefined,
      auditNote: (parsed.data.audit_note as string) || undefined,
    };
  }
  if (await fileExists(editsFile)) {
    const parsed = matter(await readFile(editsFile, "utf8"));
    const action = (parsed.data.action as AuditAction) ?? "edit";
    const out: LoadedContent = {
      action,
      auditNote: (parsed.data.audit_note as string) || undefined,
      legacyUrl: (parsed.data.url as string) || undefined,
    };
    if (action === "approved-as-is" && (await fileExists(legacy))) {
      const legacyParsed = matter(await readFile(legacy, "utf8"));
      out.bodyMd = legacyParsed.content;
    } else {
      // For action=edit we still want guidance to land somewhere
      // human-visible. Stash the audit guidance prose so we can render
      // it as an admin-only nudge in the description.
      out.bodyMd = parsed.content;
    }
    return out;
  }
  return null;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Extract a short tagline candidate from a markdown body (first sentence). */
function deriveTagline(html: string): string | null {
  // Strip h2/h3/h4 headings before flattening — they're section labels
  // ("About This Ministry", "Our Mission Statement") that join awkwardly
  // with the first prose sentence.
  const withoutHeadings = html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
  const text = decodeEntities(
    sanitizeHtml(withoutHeadings, { allowedTags: [], allowedAttributes: {} }),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  // Protect common abbreviations from the sentence splitter — "St.",
  // "Fr.", "Mr.", "Mrs.", "Dr.", "vs.", and ".org" / ".com" inside URLs.
  const protect = (s: string) => s
    .replace(/\b(St|Fr|Mr|Mrs|Ms|Dr|vs|Sr|Jr|Rev)\./g, "$1∎")
    .replace(/\.(org|com|net|edu)\b/g, "∎$1");
  const restore = (s: string) => s.replace(/∎/g, ".");
  const sentences = protect(text).split(/(?<=[.!?])\s+/);
  const candidate =
    sentences.find((s) => !s.trim().startsWith('"') && s.replace(/∎/g, "").length > 20) ??
    sentences[0] ??
    "";
  const final = restore(candidate);
  return final.length > 120 ? `${final.slice(0, 117)}…` : final;
}

async function main() {
  console.log(`Loading images.csv …`);
  const csv = parseCsv(await readFile(path.join(AUDIT_ROOT, "manifests/images.csv"), "utf8"));
  console.log(`Importing ${auditMinistries.length} ministries …\n`);

  let upserted = 0;
  let sectionsInserted = 0;
  let heroAssigned = 0;
  const noHero: string[] = [];

  for (const seed of auditMinistries) {
    const slug = seed.slug;
    const content = await loadContent(slug);

    // ---- 1. Hero photo ---------------------------------------- //
    const heroFile = findHero(slug, csv) ?? (await findHeroOnDisk(slug));
    const photoBlobKey = heroFile ? `audit/${heroFile}` : null;
    if (photoBlobKey) heroAssigned++;
    else noHero.push(slug);

    // ---- 2. Body HTML (markdown → sanitized HTML) ------------- //
    let bodyHtml: string | null = null;
    // For action=edit the body file contains only the audit team's
    // guidance (e.g. "Adrian will update with Matt"), which is staff-
    // facing, not page content. Description already captures it.
    const skipBody = content?.action === "edit";
    if (content?.bodyMd && !skipBody) {
      bodyHtml = mdToSafeHtml(content.bodyMd);
      const plain = bodyHtml.replace(/<[^>]+>/g, "").trim();
      // Drop empty result (e.g. an edits file with no body), and drop
      // approval-only marker bodies like "Approved as is." that some
      // standalone-intro entries use to signal "no copy changes needed".
      if (!plain || /^\s*Approved as is\.?\s*$/i.test(plain)) bodyHtml = null;
    }

    // ---- 3. Description + tagline ----------------------------- //
    const auditNote = content?.auditNote?.trim();
    const description =
      content?.action === "edit"
        ? auditNote
          ? `**Audit guidance:** ${auditNote}`
          : null
        : null;
    const tagline = seed.tagline ?? (bodyHtml ? deriveTagline(bodyHtml) : null);

    // ---- 4. Upsert ministry row ------------------------------- //
    const inquiryConfig: MinistryInquiryConfig = (seed.inquiryConfig ?? {
      enabled: true,
      buttons: [{ kind: "inquire", label: "Inquire about this ministry", enabled: true }],
    }) as MinistryInquiryConfig;

    const [row] = await db
      .insert(ministries)
      .values({
        slug: seed.slug,
        name: seed.name,
        tagline,
        description,
        audiences: seed.audiences ?? [],
        category: seed.category ?? null,
        matchmakerTags: seed.matchmakerTags ?? [],
        meetingCadence: seed.meetingCadence ?? null,
        leadStaffId: null,
        photoBlobKey,
        contactEmail: seed.contactEmail ?? null,
        isAcceptingNew: seed.isAcceptingNew ?? true,
        orderingPriority: seed.orderingPriority ?? 0,
        status: "draft",
        inquiryConfig,
      })
      .onConflictDoUpdate({
        target: ministries.slug,
        set: {
          name: seed.name,
          tagline,
          description,
          audiences: seed.audiences ?? [],
          category: seed.category ?? null,
          matchmakerTags: seed.matchmakerTags ?? [],
          meetingCadence: seed.meetingCadence ?? null,
          photoBlobKey,
          contactEmail: seed.contactEmail ?? null,
          isAcceptingNew: seed.isAcceptingNew ?? true,
          orderingPriority: seed.orderingPriority ?? 0,
          inquiryConfig,
          updatedAt: new Date(),
        },
      })
      .returning({ id: ministries.id });
    if (!row) throw new Error(`Insert returned no row for ${slug}`);
    upserted++;

    // ---- 5. Replace page_sections ----------------------------- //
    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, row.id)));

    const sectionRows: { kind: string; payload: PageSectionPayload; position: number }[] = [];
    let position = 0;

    if (bodyHtml) {
      sectionRows.push({
        kind: "rich_text",
        position: position++,
        payload: { kind: "rich_text", html: bodyHtml } as PageSectionPayload,
      });
    }

    if (content?.action === "standalone-intro" && content.standaloneUrl) {
      sectionRows.push({
        kind: "button_group",
        position: position++,
        payload: {
          kind: "button_group",
          items: [
            {
              label: "Learn more on the full page",
              href: content.standaloneUrl,
              variant: "primary",
            },
          ],
        } as PageSectionPayload,
      });
    }

    if (sectionRows.length > 0) {
      await db.insert(pageSections).values(
        sectionRows.map((s) => ({
          parentKind: "ministry" as const,
          parentId: row.id,
          position: s.position,
          kind: s.kind,
          payload: s.payload,
        })),
      );
      sectionsInserted += sectionRows.length;
    }

    const tag = content?.action ?? "no-content";
    const photoTag = photoBlobKey ? "📷" : "  ";
    console.log(`  ${photoTag} ${tag.padEnd(18)} ${slug}`);
  }

  console.log(`\n✓ ministries upserted : ${upserted}`);
  console.log(`  page_sections rows  : ${sectionsInserted}`);
  console.log(`  hero photos assigned: ${heroAssigned}`);
  if (noHero.length) {
    console.log(`  no hero (${noHero.length}): ${noHero.join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
