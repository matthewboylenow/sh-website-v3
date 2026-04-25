import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { blobAssets } from "@/db/schema";
import { UploadCompleteSchema } from "@/lib/validators/blob";

/**
 * Records the blob_assets row after a successful client-side upload.
 * Called by the client immediately after `upload()` resolves so the
 * row exists before the editor's form is submitted (which has a FK
 * pointing here).
 */

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UploadCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // We use `pathname` as the stable key in blob_assets. Vercel adds a
  // random suffix when `addRandomSuffix: true` is set, so collisions
  // are vanishingly rare. If one slipped in, the unique key constraint
  // catches it and we return an error.
  try {
    const [row] = await db
      .insert(blobAssets)
      .values({
        key: parsed.data.pathname,
        blobUrl: parsed.data.url,
        mimeType: parsed.data.contentType,
        byteSize: parsed.data.byteSize,
        width: parsed.data.width ?? null,
        height: parsed.data.height ?? null,
        alt: parsed.data.alt ?? null,
        caption: parsed.data.caption ?? null,
        credit: parsed.data.credit ?? null,
        uploadedBy: session.user.id,
      })
      .returning({ key: blobAssets.key, blobUrl: blobAssets.blobUrl });

    if (!row) {
      return NextResponse.json({ error: "Insert returned no row" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, key: row.key, blobUrl: row.blobUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
