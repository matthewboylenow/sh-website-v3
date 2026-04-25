import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { blobAssets, type BlobAsset } from "@/db/schema";

/**
 * Translate a `blob_assets.key` into a public asset URL fit for
 * `next/image src`. We persist the full Blob URL on upload and read
 * it back here — that keeps the indirection abstract enough to swap
 * the underlying store later (S3, Cloudflare R2, etc.) without
 * touching every consumer.
 *
 * If BLOB_STORE_HOST is set, we route through the /cdn/:path* rewrite
 * configured in next.config.ts so the user-facing URL is on our
 * domain. Otherwise we return the raw Blob URL and rely on
 * `images.remotePatterns` to whitelist the host.
 */
export async function assetUrl(
  key: string | null | undefined,
): Promise<string | null> {
  if (!key) return null;
  const [row] = await db
    .select({ blobUrl: blobAssets.blobUrl })
    .from(blobAssets)
    .where(eq(blobAssets.key, key))
    .limit(1);
  if (!row) return null;
  return resolveAssetUrl(row.blobUrl);
}

/** Synchronous variant — caller has already loaded the row (e.g. via a join). */
export function resolveAssetUrl(blobUrl: string): string {
  const cdnHost = process.env.BLOB_STORE_HOST;
  if (!cdnHost) return blobUrl;
  try {
    const url = new URL(blobUrl);
    if (url.host !== cdnHost) return blobUrl;
    return `/cdn${url.pathname}`;
  } catch {
    return blobUrl;
  }
}

/**
 * Batch-resolve keys → URLs in a single query. Server Components
 * call this when rendering grids (events list, ministry cards, etc.)
 * so we avoid one DB hit per card.
 */
export async function resolveKeys(
  keys: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const filtered = [...new Set(keys.filter(Boolean) as string[])];
  if (filtered.length === 0) return new Map();
  const rows = await db
    .select({ key: blobAssets.key, blobUrl: blobAssets.blobUrl })
    .from(blobAssets)
    .where(inArray(blobAssets.key, filtered));
  const out = new Map<string, string>();
  for (const r of rows) {
    out.set(r.key, resolveAssetUrl(r.blobUrl));
  }
  return out;
}

/** Stripped-down asset shape suitable for sending to client components. */
export type PublicAsset = Pick<BlobAsset, "key" | "alt" | "caption" | "width" | "height">;
