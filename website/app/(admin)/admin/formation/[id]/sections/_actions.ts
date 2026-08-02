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
import { FORBIDDEN, canWriteContent } from "@/lib/authz";

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
  if (!canWriteContent(session.user.role)) {
    return { ok: false, error: FORBIDDEN };
  }

  const [p] = await db
    .select({ id: formationPages.id })
    .from(formationPages)
    .where(eq(formationPages.id, pageId))
    .limit(1);
  if (!p) return { ok: false, error: "Formation page not found" };

  return saveSectionsForParent("formation", pageId, manifest);
}
