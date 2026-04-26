import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  DEFAULT_HOMEPAGE_HERO,
  ministries,
  pageSections,
  staff,
  type PageSectionPayload,
} from "@/db/schema";
import { resolveKeys } from "@/lib/blob";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { SectionEditor } from "@/app/(admin)/admin/ministries/[id]/sections/SectionEditor";
import { HeroEditor } from "./HeroEditor";
import { saveHomepageSectionsAction } from "./_actions";
import { HOMEPAGE_PARENT_ID } from "./constants";

export const metadata = { title: "Homepage · Admin" };

export default async function AdminHomepagePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/homepage");
  if (session.user.role === "ministry_lead") redirect("/admin");

  const [settings, rows, ministryOptions, eventCategoryTax] = await Promise.all([
    getSiteSettings(),
    db
      .select({
        id: pageSections.id,
        position: pageSections.position,
        kind: pageSections.kind,
        payload: pageSections.payload,
      })
      .from(pageSections)
      .where(
        and(
          eq(pageSections.parentKind, "homepage"),
          eq(pageSections.parentId, HOMEPAGE_PARENT_ID),
        ),
      )
      .orderBy(asc(pageSections.position)),
    db
      .select({ id: ministries.id, name: ministries.name })
      .from(ministries)
      .orderBy(asc(ministries.name)),
    getSiteSettings().then((s) => s?.taxonomies?.eventCategories ?? []),
  ]);

  const staffOptions = await db
    .select({ id: staff.id, name: staff.name, role: staff.role })
    .from(staff)
    .orderBy(asc(staff.orderingPriority), asc(staff.name));

  // Pre-resolve every blob URL referenced in the payloads (same walk as
  // ministry/formation pages do).
  const blobKeys = new Set<string>();
  function walk(payload: PageSectionPayload) {
    if (payload.kind === "image" || payload.kind === "image_text") blobKeys.add(payload.blobKey);
    if (payload.kind === "image_gallery") payload.images.forEach((i) => blobKeys.add(i.blobKey));
    if (payload.kind === "video" && payload.posterBlobKey) blobKeys.add(payload.posterBlobKey);
    if (payload.kind === "card_grid")
      payload.cards.forEach((c) => c.imageBlobKey && blobKeys.add(c.imageBlobKey));
    if (payload.kind === "callout_banner" && payload.imageBlobKey)
      blobKeys.add(payload.imageBlobKey);
    if (payload.kind === "columns") payload.columns.forEach((c) => c.blocks.forEach(walk));
  }
  for (const r of rows) walk(r.payload as PageSectionPayload);
  if (staffOptions.length > 0) {
    const photos = await db
      .select({ photoBlobKey: staff.photoBlobKey })
      .from(staff)
      .where(inArray(staff.id, staffOptions.map((s) => s.id)));
    for (const p of photos) {
      if (p.photoBlobKey) blobKeys.add(p.photoBlobKey);
    }
  }
  const urlMap = await resolveKeys([...blobKeys]);
  const initialImageUrls: Record<string, string> = {};
  urlMap.forEach((v, k) => (initialImageUrls[k] = v));

  const heroInitial = settings?.homepageHero ?? DEFAULT_HOMEPAGE_HERO;

  return (
    <div className="space-y-10">
      <header>
        <span className="sh-eyebrow">Content</span>
        <h1 className="mt-2 text-3xl">Homepage</h1>
        <p className="sh-lede mt-2 text-[15px]">
          Edit the hero stage at the top + the section blocks below it.
          Changes go live after save.{" "}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-rust-dark hover:text-rust"
          >
            View on site →
          </Link>
        </p>
      </header>

      <HeroEditor initial={heroInitial} />

      <div>
        <header className="mb-4">
          <h2 className="font-serif text-2xl font-bold text-navy">Sections</h2>
          <p className="mt-1 text-sm text-ink-2">
            Everything below the hero. Add Featured ministries, Featured events,
            a podcast embed, callout banners, image+text blocks — same 13-block
            menu as ministry pages.
          </p>
        </header>
        <SectionEditor
          pathPrefix="homepage/sections"
          onSave={saveHomepageSectionsAction}
          initial={rows.map((r) => ({
            id: r.id,
            payload: r.payload as PageSectionPayload,
          }))}
          initialImageUrls={initialImageUrls}
          staffOptions={staffOptions}
          ministryOptions={ministryOptions}
          eventCategoryOptions={eventCategoryTax}
        />
      </div>
    </div>
  );
}
