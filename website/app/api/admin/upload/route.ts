import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ALLOWED_IMAGE_TYPES } from "@/lib/validators/blob";

/**
 * Issues a Vercel Blob client-upload token. The browser uses
 * @vercel/blob/client.upload() against this endpoint, then PUTs the
 * file directly to Blob storage. After the upload resolves on the
 * client, the client calls /api/admin/upload/complete to record the
 * blob_assets row.
 *
 * Auth: any signed-in user can upload (admin / editor / ministry_lead).
 * Per-route role checks happen at form-write time, not here.
 */

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // pathname comes from the client and looks like:
        //   "events/<eventId>/<filename>"
        //   "ministries/<ministryId>/<filename>"
        // We don't enforce shape strictly, but we do enforce file type.
        const isPdf = pathname.endsWith(".pdf");
        return {
          allowedContentTypes: isPdf
            ? ["application/pdf"]
            : [...ALLOWED_IMAGE_TYPES],
          addRandomSuffix: true,
          // Round-trip the client's intended context (e.g. "event:abc-id")
          // back through the webhook payload — handy if we ever wire it.
          tokenPayload: clientPayload ?? "",
          // Every public blob caches at the CDN for 30 days by default;
          // we explicitly mirror that so it's visible at upload time.
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        };
      },
      // No-op webhook — we use a separate /complete endpoint for the
      // blob_assets row to keep the flow synchronous from the client's
      // perspective (no race between upload and form-submit).
      onUploadCompleted: async () => {
        /* intentionally empty */
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload error" },
      { status: 400 },
    );
  }
}

