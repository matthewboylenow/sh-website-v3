"use server";

import { and, desc, ilike, lt, or, type SQL } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { blobAssets } from "@/db/schema";
import { resolveAssetUrl } from "@/lib/blob";

export type MediaListItem = {
  key: string;
  url: string;
  alt: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: number;
  uploadedAt: string;
};

const PAGE_SIZE = 36;

/**
 * Paginated media-library list for the picker modal. Cursor is the
 * uploadedAt ISO of the last item from the previous page — keeps
 * keyset pagination stable as new uploads land.
 *
 * Filter: optional substring match against key + alt + caption.
 * Auth: any signed-in admin/editor (ministry leads need pictures too
 * for their /admin/my-ministries form).
 */
export async function listMediaAssets(opts: {
  q?: string;
  cursor?: string | null;
}): Promise<{ items: MediaListItem[]; nextCursor: string | null }> {
  const session = await auth();
  if (!session?.user) {
    return { items: [], nextCursor: null };
  }

  const filters: SQL<unknown>[] = [];
  if (opts.q && opts.q.trim().length > 0) {
    const term = `%${opts.q.trim()}%`;
    const search = or(
      ilike(blobAssets.key, term),
      ilike(blobAssets.alt, term),
      ilike(blobAssets.caption, term),
    );
    if (search) filters.push(search);
  }
  if (opts.cursor) {
    const cursorDate = new Date(opts.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      filters.push(lt(blobAssets.uploadedAt, cursorDate));
    }
  }

  const where =
    filters.length === 0
      ? undefined
      : filters.length === 1
        ? filters[0]
        : and(...filters);

  const baseQuery = db
    .select({
      key: blobAssets.key,
      blobUrl: blobAssets.blobUrl,
      alt: blobAssets.alt,
      mimeType: blobAssets.mimeType,
      width: blobAssets.width,
      height: blobAssets.height,
      byteSize: blobAssets.byteSize,
      uploadedAt: blobAssets.uploadedAt,
    })
    .from(blobAssets);
  const rows = await (where ? baseQuery.where(where) : baseQuery)
    .orderBy(desc(blobAssets.uploadedAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const sliced = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const items: MediaListItem[] = sliced.map((r) => ({
    key: r.key,
    url: resolveAssetUrl(r.blobUrl),
    alt: r.alt,
    mimeType: r.mimeType,
    width: r.width,
    height: r.height,
    byteSize: r.byteSize,
    uploadedAt: r.uploadedAt.toISOString(),
  }));
  const nextCursor =
    hasMore && sliced.length > 0
      ? sliced[sliced.length - 1]!.uploadedAt.toISOString()
      : null;

  return { items, nextCursor };
}
