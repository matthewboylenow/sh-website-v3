import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_PDF_TYPES = ["application/pdf"] as const;

export const ALLOWED_UPLOAD_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_PDF_TYPES,
] as const;

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB — bulletins

/**
 * Confirm payload sent by the client AFTER `upload()` resolves.
 * Server validates, runs auth, and writes the blob_assets row.
 *
 * The client provides dimensions client-side (cheap — image is already
 * decoded in the browser) so the server doesn't need to refetch the
 * bytes just to read width/height.
 */
export const UploadCompleteSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1).max(500),
  contentType: z.string().min(1).max(100),
  byteSize: z.number().int().min(1).max(MAX_PDF_BYTES),
  width: z.number().int().min(1).max(20000).optional().nullable(),
  height: z.number().int().min(1).max(20000).optional().nullable(),
  alt: z.string().max(500).optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  credit: z.string().max(200).optional().nullable(),
});

export type UploadCompleteInput = z.infer<typeof UploadCompleteSchema>;
