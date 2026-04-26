"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries } from "@/db/schema";
import {
  saveSectionsForParent,
  type SaveSectionsResult,
} from "@/lib/server/page-sections-actions";
import type { MinistrySectionsManifestInput } from "@/lib/validators/page-sections";

/**
 * Ministry-side wrapper for the polymorphic section saver. Authorization:
 * admins/editors save freely; ministry leads only their own ministries.
 */
export async function saveMinistrySectionsAction(
  ministryId: string,
  manifest: MinistrySectionsManifestInput,
): Promise<SaveSectionsResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };

  const role = session.user.role;
  if (role === "ministry_lead") {
    const myIds = session.user.ministryIds ?? [];
    if (!myIds.includes(ministryId)) {
      return { ok: false, error: "You don't lead that ministry" };
    }
  }

  // Confirm the parent exists before writing.
  const [m] = await db
    .select({ id: ministries.id })
    .from(ministries)
    .where(eq(ministries.id, ministryId))
    .limit(1);
  if (!m) return { ok: false, error: "Ministry not found" };

  return saveSectionsForParent("ministry", ministryId, manifest);
}
