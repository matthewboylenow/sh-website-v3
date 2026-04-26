import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  staff,
  type Event as EventRow,
  type Ministry as MinistryRow,
  type PageLeafBlock,
  type PageSectionPayload,
} from "@/db/schema";
import { resolveKeys } from "@/lib/blob";
import {
  getPublishedMinistries,
} from "@/lib/queries/ministries.query";
import { getUpcomingEvents } from "@/lib/queries/events.query";
import { DEFAULT_HORIZON_MONTHS, expandEvents } from "@/lib/recurrence";
import type {
  FeaturedEventsData,
  FeaturedMinistriesData,
  RenderContext,
  StaffRendered,
} from "@/components/site/page-sections/SectionRenderer";

/**
 * Walk a list of section payloads (recursively through Columns) and
 * collect every blob key + staff id + flag whether featured_ministries
 * or featured_events blocks exist anywhere. One DB roundtrip per kind,
 * returned as Maps the renderer reads.
 */

type WalkAcc = {
  blobKeys: Set<string>;
  staffIds: Set<string>;
  needsMinistries: boolean;
  needsEvents: boolean;
};

function walkLeaf(p: PageLeafBlock, acc: WalkAcc) {
  switch (p.kind) {
    case "image":
    case "image_text":
      acc.blobKeys.add(p.blobKey);
      break;
    case "image_gallery":
      p.images.forEach((i) => acc.blobKeys.add(i.blobKey));
      break;
    case "video":
      if (p.posterBlobKey) acc.blobKeys.add(p.posterBlobKey);
      break;
    case "card_grid":
      p.cards.forEach((c) => {
        if (c.imageBlobKey) acc.blobKeys.add(c.imageBlobKey);
      });
      break;
    case "staff_card":
      acc.staffIds.add(p.staffId);
      break;
    case "callout_banner":
      if (p.imageBlobKey) acc.blobKeys.add(p.imageBlobKey);
      break;
    case "featured_ministries":
      acc.needsMinistries = true;
      break;
    case "featured_events":
      acc.needsEvents = true;
      break;
    default:
      break;
  }
}

function walk(payload: PageSectionPayload, acc: WalkAcc): void {
  if (payload.kind === "columns") {
    payload.columns.forEach((c) => c.blocks.forEach((b) => walkLeaf(b, acc)));
    return;
  }
  walkLeaf(payload, acc);
}

export async function buildSectionContext(
  payloads: PageSectionPayload[],
): Promise<RenderContext> {
  const acc: WalkAcc = {
    blobKeys: new Set<string>(),
    staffIds: new Set<string>(),
    needsMinistries: false,
    needsEvents: false,
  };
  for (const p of payloads) walk(p, acc);

  // Staff rows + their photos.
  const staffRows =
    acc.staffIds.size > 0
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
          .where(inArray(staff.id, [...acc.staffIds]))
      : [];
  for (const s of staffRows) {
    if (s.photoBlobKey) acc.blobKeys.add(s.photoBlobKey);
  }

  // Featured ministries — full row payload so we can render the same
  // MinistryCard the static homepage uses.
  let featuredMinistries: FeaturedMinistriesData | undefined;
  if (acc.needsMinistries) {
    const all = await getPublishedMinistries();
    const byId = new Map<string, MinistryRow>();
    all.forEach((m) => byId.set(m.id, m));
    featuredMinistries = { spotlight: all, byId };
    for (const m of all) {
      if (m.photoBlobKey) acc.blobKeys.add(m.photoBlobKey);
    }
  }

  // Featured events — expand instances over the standard horizon so
  // recurring events surface here too. Filtering by category happens at
  // the renderer.
  let featuredEvents: FeaturedEventsData | undefined;
  if (acc.needsEvents) {
    const upcoming = await getUpcomingEvents(200);
    const now = new Date();
    const horizon = new Date(now);
    horizon.setMonth(horizon.getMonth() + DEFAULT_HORIZON_MONTHS);
    const instances = expandEvents(upcoming, now, horizon);
    featuredEvents = { instances };
    for (const e of instances as EventRow[]) {
      if (e.photoBlobKey) acc.blobKeys.add(e.photoBlobKey);
    }
  }

  const images = await resolveKeys([...acc.blobKeys]);

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

  return {
    images,
    staff: staffMap,
    featuredMinistries,
    featuredEvents,
  };
}
