/**
 * Wave 18.4 — Our Team page rebuilt on staff_card blocks.
 *
 * The June import left /our-team as ~42 scraped heading/rich_text blocks —
 * editable, but disconnected from the staff table, so removing or editing
 * a team member meant changing two places. This replaces the page's
 * sections with staff_card blocks that REFERENCE staff rows: from now on,
 * /admin/staff is the single source of truth (add/edit/deactivate a person
 * there and the page follows), and the section editor still works for
 * intro copy or reordering.
 *
 * The previous prose sections are backed up to
 * scripts/data/our-team-sections-backup-2026-07-28.json before replacement
 * (backup is written once — never overwritten on re-run).
 *
 * Idempotent: sections are derived from the staff table on each run.
 * Run:  pnpm tsx --env-file=.env.local scripts/rebuild-our-team-2026-07.ts
 * DRY_RUN=1 to preview.
 */

import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  pages,
  pageSections,
  staff,
  type PageSectionPayload,
} from "../db/schema";

const DRY_RUN = process.env.DRY_RUN === "1";
const BACKUP = path.join(__dirname, "data/our-team-sections-backup-2026-07-28.json");

async function fileExists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Wave 18.4 — Our Team rebuild${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.slug, "our-team"))
    .limit(1);
  if (!page) throw new Error("our-team page not found");

  const existing = await db
    .select()
    .from(pageSections)
    .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, page.id)))
    .orderBy(asc(pageSections.position));

  // One-time backup of whatever is there before the first rebuild.
  if (!(await fileExists(BACKUP)) && existing.length > 0 && !DRY_RUN) {
    await mkdir(path.dirname(BACKUP), { recursive: true });
    await writeFile(BACKUP, JSON.stringify(existing, null, 2));
    console.log(`  backed up ${existing.length} sections → ${path.relative(process.cwd(), BACKUP)}`);
  }

  const people = await db
    .select({ id: staff.id, name: staff.name, role: staff.role })
    .from(staff)
    .where(eq(staff.isActive, true))
    .orderBy(asc(staff.orderingPriority), asc(staff.name));
  if (people.length === 0) throw new Error("no active staff rows — refusing to build an empty page");

  // Clergy are identified by title prefix on the NAME (Rev./Fr./Msgr./
  // Deacon) — role text is unreliable ("Pastoral Associate" and
  // "Assistant to the Pastor" are lay staff).
  const isClergy = (name: string) =>
    /^(rev\.?|fr\.?|msgr\.?|deacon)\s/i.test(name.trim());
  const clergy = people.filter((p) => isClergy(p.name));
  const lay = people.filter((p) => !isClergy(p.name));

  const sections: PageSectionPayload[] = [
    ...(clergy.length
      ? ([
          {
            kind: "heading",
            header: { eyebrow: "Our Team", heading: "Clergy" },
          },
          ...clergy.map((p) => ({ kind: "staff_card", staffId: p.id })),
        ] as PageSectionPayload[])
      : []),
    ...(lay.length
      ? ([
          {
            kind: "heading",
            header: { eyebrow: "Our Team", heading: "Parish Staff" },
          },
          ...lay.map((p) => ({ kind: "staff_card", staffId: p.id })),
        ] as PageSectionPayload[])
      : []),
  ];

  console.log(
    `  ${clergy.length} clergy + ${lay.length} staff → ${sections.length} sections`,
  );
  if (DRY_RUN) {
    for (const p of people) console.log("   ·", p.name, "—", p.role);
    return;
  }

  await db
    .delete(pageSections)
    .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, page.id)));
  await db.insert(pageSections).values(
    sections.map((payload, i) => ({
      parentKind: "page" as const,
      parentId: page.id,
      position: i,
      kind: payload.kind,
      payload,
    })),
  );
  console.log("  ✓ /our-team now renders from the staff table");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
