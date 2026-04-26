import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  staff,
  type MinistryLeafBlock,
  type MinistrySectionPayload,
} from "@/db/schema";
import { resolveKeys } from "@/lib/blob";
import type {
  RenderContext,
  StaffRendered,
} from "@/components/site/ministry-sections/SectionRenderer";

/**
 * Walk a list of ministry-section payloads (recursively through Columns)
 * and collect every blob key + staff id referenced. One DB roundtrip
 * each, returned as Maps the renderer reads.
 */

function walkLeaf(p: MinistryLeafBlock, blobKeys: Set<string>, staffIds: Set<string>) {
  switch (p.kind) {
    case "image":
    case "image_text":
      blobKeys.add(p.blobKey);
      break;
    case "image_gallery":
      p.images.forEach((i) => blobKeys.add(i.blobKey));
      break;
    case "video":
      if (p.posterBlobKey) blobKeys.add(p.posterBlobKey);
      break;
    case "card_grid":
      p.cards.forEach((c) => {
        if (c.imageBlobKey) blobKeys.add(c.imageBlobKey);
      });
      break;
    case "staff_card":
      staffIds.add(p.staffId);
      break;
    case "callout_banner":
      if (p.imageBlobKey) blobKeys.add(p.imageBlobKey);
      break;
    default:
      break;
  }
}

function walk(
  payload: MinistrySectionPayload,
  blobKeys: Set<string>,
  staffIds: Set<string>,
): void {
  if (payload.kind === "columns") {
    payload.columns.forEach((c) =>
      c.blocks.forEach((b) => walkLeaf(b, blobKeys, staffIds)),
    );
    return;
  }
  walkLeaf(payload, blobKeys, staffIds);
}

export async function buildSectionContext(
  payloads: MinistrySectionPayload[],
): Promise<RenderContext> {
  const blobKeys = new Set<string>();
  const staffIds = new Set<string>();
  for (const p of payloads) walk(p, blobKeys, staffIds);

  // Pull staff rows. Photos on staff are also blob keys — fold them in.
  const staffRows =
    staffIds.size > 0
      ? await db
          .select({
            id: staff.id,
            slug: staff.slug,
            name: staff.name,
            role: staff.role,
            email: staff.email,
            photoBlobKey: staff.photoBlobKey,
            bio: staff.bio,
          })
          .from(staff)
          .where(inArray(staff.id, [...staffIds]))
      : [];
  for (const s of staffRows) {
    if (s.photoBlobKey) blobKeys.add(s.photoBlobKey);
  }

  const images = await resolveKeys([...blobKeys]);

  const staffMap = new Map<string, StaffRendered>();
  for (const s of staffRows) {
    staffMap.set(s.id, {
      slug: s.slug,
      name: s.name,
      role: s.role,
      email: s.email,
      photoBlobKey: s.photoBlobKey,
      bio: s.bio,
    });
  }

  return { images, staff: staffMap };
}
