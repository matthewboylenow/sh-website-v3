import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  formationPages,
  pageSections,
  staff,
  type PageSectionPayload,
} from "@/db/schema";
import { resolveKeys } from "@/lib/blob";
import { SectionEditor } from "@/app/(admin)/admin/ministries/[id]/sections/SectionEditor";
import { saveFormationSectionsAction } from "./_actions";

export const metadata = { title: "Sections · Admin" };

export default async function FormationSectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/admin/formation/${id}/sections`);
  if (session.user.role === "ministry_lead") redirect("/admin");

  const [p] = await db
    .select({ id: formationPages.id, name: formationPages.name, slug: formationPages.slug })
    .from(formationPages)
    .where(eq(formationPages.id, id))
    .limit(1);
  if (!p) notFound();

  const [rows, staffOptions] = await Promise.all([
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
          eq(pageSections.parentKind, "formation"),
          eq(pageSections.parentId, id),
        ),
      )
      .orderBy(asc(pageSections.position)),
    db
      .select({ id: staff.id, name: staff.name, role: staff.role })
      .from(staff)
      .orderBy(asc(staff.orderingPriority), asc(staff.name)),
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
    if (payload.kind === "columns") payload.columns.forEach((c) => c.blocks.forEach(walk));
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

  return (
    <div>
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/formation" className="hover:text-rust-dark">Formation</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href={`/admin/formation/${p.id}`} className="hover:text-rust-dark">
          {p.name}
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Sections</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl">{p.name} · Sections</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Block-based content rendered below the description on{" "}
            <Link
              href={`/formation/${p.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rust-dark hover:text-rust"
            >
              /formation/{p.slug}
            </Link>
            .
          </p>
        </div>
        <Link
          href={`/admin/formation/${p.id}`}
          className="text-sm font-semibold text-rust-dark hover:text-rust"
        >
          ← Edit core fields
        </Link>
      </div>

      <div className="mt-8">
        <SectionEditor
          pathPrefix={`formation/${p.id}/sections`}
          onSave={saveFormationSectionsAction.bind(null, p.id)}
          initial={rows.map((r) => ({
            id: r.id,
            payload: r.payload as PageSectionPayload,
          }))}
          initialImageUrls={initialImageUrls}
          staffOptions={staffOptions}
        />
      </div>
    </div>
  );
}
