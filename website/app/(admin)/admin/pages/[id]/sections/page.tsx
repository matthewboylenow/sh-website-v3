import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  ministries,
  pages,
  pageSections,
  staff,
  type PageSectionPayload,
} from "@/db/schema";
import { resolveKeys } from "@/lib/blob";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { SectionEditor } from "@/app/(admin)/admin/ministries/[id]/sections/SectionEditor";
import { savePageSectionsAction } from "./_actions";

export const metadata = { title: "Sections · Admin" };

export default async function PageSectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user)
    redirect(`/sign-in?callbackUrl=/admin/pages/${id}/sections`);
  if (session.user.role === "ministry_lead") redirect("/admin");

  const [p] = await db
    .select({ id: pages.id, title: pages.title, slug: pages.slug })
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);
  if (!p) notFound();

  const [rows, staffOptions, ministryOptions, settings] = await Promise.all([
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
          eq(pageSections.parentKind, "page"),
          eq(pageSections.parentId, id),
        ),
      )
      .orderBy(asc(pageSections.position)),
    db
      .select({ id: staff.id, name: staff.name, role: staff.role })
      .from(staff)
      .orderBy(asc(staff.orderingPriority), asc(staff.name)),
    db
      .select({ id: ministries.id, name: ministries.name })
      .from(ministries)
      .orderBy(asc(ministries.name)),
    getSiteSettings(),
  ]);

  const blobKeys = new Set<string>();
  function walk(payload: PageSectionPayload) {
    if (payload.kind === "image" || payload.kind === "image_text")
      blobKeys.add(payload.blobKey);
    if (payload.kind === "image_gallery")
      payload.images.forEach((i) => blobKeys.add(i.blobKey));
    if (payload.kind === "video" && payload.posterBlobKey)
      blobKeys.add(payload.posterBlobKey);
    if (payload.kind === "card_grid")
      payload.cards.forEach((c) => c.imageBlobKey && blobKeys.add(c.imageBlobKey));
    if (payload.kind === "callout_banner" && payload.imageBlobKey)
      blobKeys.add(payload.imageBlobKey);
    if (payload.kind === "pastor_welcome" && payload.photoBlobKey)
      blobKeys.add(payload.photoBlobKey);
    if (payload.kind === "columns")
      payload.columns.forEach((c) => c.blocks.forEach(walk));
  }
  for (const r of rows) walk(r.payload as PageSectionPayload);

  const staffPhotoRows =
    staffOptions.length > 0
      ? await db
          .select({ photoBlobKey: staff.photoBlobKey })
          .from(staff)
          .where(inArray(staff.id, staffOptions.map((s) => s.id)))
      : [];
  for (const s of staffPhotoRows) {
    if (s.photoBlobKey) blobKeys.add(s.photoBlobKey);
  }

  const urlMap = await resolveKeys([...blobKeys]);
  const initialImageUrls: Record<string, string> = {};
  urlMap.forEach((v, k) => (initialImageUrls[k] = v));

  const tax = settings?.taxonomies ?? {
    eventCategories: [],
    eventAudiences: [],
    ministryAudiences: [],
  };

  return (
    <div>
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/pages" className="hover:text-rust-dark">
          Pages
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href={`/admin/pages/${p.id}`} className="hover:text-rust-dark">
          {p.title}
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Sections</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl">{p.title} · Sections</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Block-based content for{" "}
            <Link
              href={`/${p.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rust-dark hover:text-rust"
            >
              /p/{p.slug}
            </Link>
            .
          </p>
        </div>
        <Link
          href={`/admin/pages/${p.id}`}
          className="text-sm font-semibold text-rust-dark hover:text-rust"
        >
          ← Edit core fields
        </Link>
      </div>

      <div className="mt-8">
        <SectionEditor
          pathPrefix={`pages/${p.id}/sections`}
          onSave={savePageSectionsAction.bind(null, p.id)}
          initial={rows.map((r) => ({
            id: r.id,
            payload: r.payload as PageSectionPayload,
          }))}
          initialImageUrls={initialImageUrls}
          staffOptions={staffOptions}
          ministryOptions={ministryOptions}
          eventCategoryOptions={tax.eventCategories}
        />
      </div>
    </div>
  );
}
