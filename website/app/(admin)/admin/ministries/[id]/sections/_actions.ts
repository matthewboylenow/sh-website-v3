"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, ministrySections } from "@/db/schema";
import {
  MinistrySectionsManifestSchema,
  type MinistrySectionsManifestInput,
} from "@/lib/validators/ministry-sections";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Replace-set semantics: the editor sends the full ordered array each
 * save. We delete the existing rows and insert the new set, all in a
 * transaction. Cleaner than diffing — the section count is small.
 */
export async function saveMinistrySectionsAction(
  ministryId: string,
  manifest: MinistrySectionsManifestInput,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };

  const role = session.user.role;
  if (role === "ministry_lead") {
    const myIds = session.user.ministryIds ?? [];
    if (!myIds.includes(ministryId)) {
      return { ok: false, error: "You don't lead that ministry" };
    }
  }

  const parsed = MinistrySectionsManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "section";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  // Confirm the ministry exists before clearing the table.
  const [m] = await db
    .select({ id: ministries.id })
    .from(ministries)
    .where(eq(ministries.id, ministryId))
    .limit(1);
  if (!m) return { ok: false, error: "Ministry not found" };

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(ministrySections)
        .where(eq(ministrySections.ministryId, ministryId));
      if (parsed.data.sections.length > 0) {
        await tx.insert(ministrySections).values(
          parsed.data.sections.map((s, i) => ({
            ministryId,
            position: i,
            kind: s.payload.kind,
            payload: s.payload,
          })),
        );
      }
    });
    revalidateTag("ministries");
    revalidateTag("ministry-sections");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}
