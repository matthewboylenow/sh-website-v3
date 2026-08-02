import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pages, pageSections } from "@/db/schema";
import {
  STARTER_LAYOUTS,
  sectionsForStarterLayout,
} from "@/lib/page-starter-layouts";

/**
 * The one part of the starter-layout change that TypeScript cannot check:
 * whether the rows we build actually go into Postgres and come back the
 * same shape. Column names, the jsonb round-trip, the parent_kind enum,
 * and position ordering are all runtime concerns.
 *
 * Runs only when TEST_DATABASE_URL points at a throwaway database with the
 * migrations applied. CI has no Postgres, so this suite skips there rather
 * than failing — see tests/README.md for how to run it locally.
 */

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("seeding a starter layout into Postgres", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  const createdPageIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString: url });
    db = drizzle(pool);
  });

  afterAll(async () => {
    for (const id of createdPageIds) {
      await db
        .delete(pageSections)
        .where(
          and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, id)),
        );
      await db.delete(pages).where(eq(pages.id, id));
    }
    await pool.end();
  });

  /** Mirrors exactly what createPageAction does. */
  async function createWithLayout(layoutId: string, slug: string) {
    const [row] = await db
      .insert(pages)
      .values({ slug, title: `Test ${layoutId}`, status: "draft" })
      .returning({ id: pages.id });
    if (!row) throw new Error("page insert returned no row");
    createdPageIds.push(row.id);

    const sections = sectionsForStarterLayout(layoutId);
    if (sections.length > 0) {
      await db.insert(pageSections).values(
        sections.map((payload, position) => ({
          parentKind: "page" as const,
          parentId: row.id,
          position,
          kind: payload.kind,
          payload,
        })),
      );
    }
    return row.id;
  }

  const readBack = (pageId: string) =>
    db
      .select()
      .from(pageSections)
      .where(
        and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, pageId)),
      )
      .orderBy(asc(pageSections.position));

  for (const layout of STARTER_LAYOUTS) {
    it(`stores and reads back the ${layout.id} layout unchanged`, async () => {
      const expected = layout.build();
      const pageId = await createWithLayout(
        layout.id,
        `starter-test-${layout.id}-${expected.length}`,
      );
      const rows = await readBack(pageId);

      expect(rows).toHaveLength(expected.length);
      rows.forEach((row, i) => {
        expect(row.position).toBe(i);
        expect(row.kind).toBe(expected[i]!.kind);
        // The jsonb payload must survive the round trip byte for byte,
        // otherwise the section editor opens on something the editor did
        // not choose.
        expect(row.payload).toEqual(expected[i]);
        expect(row.parentKind).toBe("page");
        expect(row.createdAt).toBeInstanceOf(Date);
      });
    });
  }

  it("puts sections in the order the layout declares them", async () => {
    const pageId = await createWithLayout("event", "starter-test-order");
    const rows = await readBack(pageId);
    expect(rows.map((r) => r.kind)).toEqual([
      "callout_banner",
      "rich_text",
      "card_grid",
      "link_list",
      "button_group",
    ]);
  });

  it("leaves a blank page with no sections at all", async () => {
    const pageId = await createWithLayout("blank", "starter-test-blank-page");
    expect(await readBack(pageId)).toHaveLength(0);
  });

  it("scopes sections to their own page", async () => {
    const a = await createWithLayout("simple", "starter-test-scope-a");
    const b = await createWithLayout("event", "starter-test-scope-b");
    expect(await readBack(a)).toHaveLength(3);
    expect(await readBack(b)).toHaveLength(5);
  });
});
