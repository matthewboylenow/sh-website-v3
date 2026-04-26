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

/**
 * Pages wrapper for the polymorphic section saver. Admin + editor only.
 */
export async function savePageSectionsAction(
  pageId: string,
  manifest: MinistrySectionsManifestInput,
): Promise<SaveSectionsResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (session.user.role === "ministry_lead") {
    return { ok: false, error: "Forbidden" };
  }

  const [p] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);
  if (!p) return { ok: false, error: "Page not found" };

  return saveSectionsForParent("page", pageId, manifest);
}
