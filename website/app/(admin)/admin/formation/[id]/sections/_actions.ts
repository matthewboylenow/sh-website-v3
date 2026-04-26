"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { formationPages } from "@/db/schema";
import {
  saveSectionsForParent,
  type SaveSectionsResult,
} from "@/lib/server/page-sections-actions";
import type { MinistrySectionsManifestInput } from "@/lib/validators/page-sections";

/**
 * Formation-side wrapper for the polymorphic section saver. Admins +
 * editors only — formation pages aren't in the ministry-lead surface.
 */
export async function saveFormationSectionsAction(
  pageId: string,
  manifest: MinistrySectionsManifestInput,
): Promise<SaveSectionsResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (session.user.role === "ministry_lead") {
    return { ok: false, error: "Forbidden" };
  }

  const [p] = await db
    .select({ id: formationPages.id })
    .from(formationPages)
    .where(eq(formationPages.id, pageId))
    .limit(1);
  if (!p) return { ok: false, error: "Formation page not found" };

  return saveSectionsForParent("formation", pageId, manifest);
}
