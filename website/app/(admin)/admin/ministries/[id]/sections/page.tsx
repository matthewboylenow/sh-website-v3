import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  ministries,
  ministrySections,
  staff,
  type MinistrySectionPayload,
} from "@/db/schema";
import { resolveKeys } from "@/lib/blob";
import { SectionEditor } from "./SectionEditor";

export const metadata = { title: "Sections · Admin" };

export default async function MinistrySectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/admin/ministries/${id}/sections`);

  const role = session.user.role;
  if (role === "ministry_lead") {
    const myIds = session.user.ministryIds ?? [];
    if (!myIds.includes(id)) redirect("/admin");
  }

  const [m] = await db
    .select({ id: ministries.id, name: ministries.name, slug: ministries.slug })
    .from(ministries)
    .where(eq(ministries.id, id))
    .limit(1);
  if (!m) notFound();

  const [rows, staffOptions] = await Promise.all([
    db
      .select({
        id: ministrySections.id,
        position: ministrySections.position,
        kind: ministrySections.kind,
        payload: ministrySections.payload,
      })
      .from(ministrySections)
      .where(eq(ministrySections.ministryId, id))
      .orderBy(asc(ministrySections.position)),
    db
      .select({ id: staff.id, name: staff.name, role: staff.role })
      .from(staff)
      .orderBy(asc(staff.orderingPriority), asc(staff.name)),
  ]);

  // Pre-resolve every blob URL referenced in the payloads so the
  // editor renders in-place previews without a round-trip per row.
  const blobKeys = new Set<string>();
  function walk(p: MinistrySectionPayload) {
    if (p.kind === "image" || p.kind === "image_text") blobKeys.add(p.blobKey);
    if (p.kind === "image_gallery") p.images.forEach((i) => blobKeys.add(i.blobKey));
    if (p.kind === "video" && p.posterBlobKey) blobKeys.add(p.posterBlobKey);
    if (p.kind === "card_grid")
      p.cards.forEach((c) => c.imageBlobKey && blobKeys.add(c.imageBlobKey));
    if (p.kind === "callout_banner" && p.imageBlobKey) blobKeys.add(p.imageBlobKey);
    if (p.kind === "columns") p.columns.forEach((c) => c.blocks.forEach(walk));
  }
  for (const r of rows) walk(r.payload as MinistrySectionPayload);

  // Also include staff photos so the staff_card editor can preview.
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
        <Link href="/admin/ministries" className="hover:text-rust-dark">Ministries</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href={`/admin/ministries/${m.id}`} className="hover:text-rust-dark">
          {m.name}
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Sections</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl">{m.name} · Sections</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Block-based content rendered below the description on{" "}
            <Link
              href={`/ministries/${m.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rust-dark hover:text-rust"
            >
              /ministries/{m.slug}
            </Link>
            . Drag-free reordering with arrows.
          </p>
        </div>
        <Link
          href={`/admin/ministries/${m.id}`}
          className="text-sm font-semibold text-rust-dark hover:text-rust"
        >
          ← Edit core fields
        </Link>
      </div>

      <div className="mt-8">
        <SectionEditor
          ministryId={m.id}
          initial={rows.map((r) => ({
            id: r.id,
            payload: r.payload as MinistrySectionPayload,
          }))}
          initialImageUrls={initialImageUrls}
          staffOptions={staffOptions}
        />
      </div>
    </div>
  );
}
