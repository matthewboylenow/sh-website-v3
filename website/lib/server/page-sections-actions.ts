import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { pageSections, type PageSectionParent } from "@/db/schema";
import {
  MinistrySectionsManifestSchema,
  type MinistrySectionsManifestInput,
} from "@/lib/validators/page-sections";

/**
 * Shared replace-set save for page_sections. Authorization happens in
 * the caller — ministry leads only edit their own ministries' sections,
 * etc.
 *
 * Implementation note: Neon's HTTP driver doesn't support transactions,
 * so we run delete + insert sequentially. If the insert fails after the
 * delete succeeds, the page renders empty and the admin retries the
 * save (their unsaved form state is still in memory). Acceptable
 * trade-off for keeping Edge-compatible HTTP transport.
 */

export type SaveSectionsResult = { ok: true } | { ok: false; error: string };

export async function saveSectionsForParent(
  parentKind: PageSectionParent,
  parentId: string,
  manifest: MinistrySectionsManifestInput,
): Promise<SaveSectionsResult> {
  const parsed = MinistrySectionsManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "section";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  try {
    await db
      .delete(pageSections)
      .where(
        and(
          eq(pageSections.parentKind, parentKind),
          eq(pageSections.parentId, parentId),
        ),
      );
    if (parsed.data.sections.length > 0) {
      await db.insert(pageSections).values(
        parsed.data.sections.map((s, i) => ({
          parentKind,
          parentId,
          position: i,
          kind: s.payload.kind,
          payload: s.payload,
        })),
      );
    }
    revalidateTag("ministries");
    revalidateTag("formation");
    revalidateTag("page-sections");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}
