"use server";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { blobAssets } from "@/db/schema";
import { FORBIDDEN_ADMIN_ONLY, canAdminister } from "@/lib/authz";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Delete a blob_assets row + its underlying Blob storage object.
 *
 * Other tables (events, ministries, staff, seasonal_banners, bulletins)
 * have FK references to blob_assets.key. Postgres will reject the
 * delete if any of those still point at this asset, which is what we
 * want — editors should clear photo slots first. Bubble that back as
 * a friendly error.
 */
export async function deleteBlobAssetAction(
  key: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (!canAdminister(session.user.role))
    return { ok: false, error: FORBIDDEN_ADMIN_ONLY };

  const [row] = await db
    .select({ blobUrl: blobAssets.blobUrl })
    .from(blobAssets)
    .where(eq(blobAssets.key, key))
    .limit(1);
  if (!row) return { ok: false, error: "Asset not found" };

  try {
    await db.delete(blobAssets).where(eq(blobAssets.key, key));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("foreign key") || msg.toLowerCase().includes("constraint")) {
      return {
        ok: false,
        error:
          "This asset is still in use. Clear it from any event / ministry / staff / banner / bulletin first, then try again.",
      };
    }
    return { ok: false, error: msg };
  }

  // Best-effort: remove from Blob storage too. If this fails the row
  // is already gone — log and move on; the orphan is harmless.
  try {
    await del(row.blobUrl);
  } catch {
    /* swallow */
  }

  revalidateTag("blob-assets");
  return { ok: true };
}
