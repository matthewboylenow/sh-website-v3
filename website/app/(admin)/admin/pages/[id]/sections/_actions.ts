"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { pages } from "@/db/schema";
import {
  saveSectionsForParent,
  type SaveSectionsResult,
} from "@/lib/server/page-sections-actions";
import type { MinistrySectionsManifestInput } from "@/lib/validators/page-sections";
import { FORBIDDEN, canWriteContent } from "@/lib/authz";

/**
 * Pages wrapper for the polymorphic section saver. Admin + editor only.
 */
export async function savePageSectionsAction(
  pageId: string,
  manifest: MinistrySectionsManifestInput,
): Promise<SaveSectionsResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (!canWriteContent(session.user.role)) {
    return { ok: false, error: FORBIDDEN };
  }

  const [p] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);
  if (!p) return { ok: false, error: "Page not found" };

  return saveSectionsForParent("page", pageId, manifest);
}
