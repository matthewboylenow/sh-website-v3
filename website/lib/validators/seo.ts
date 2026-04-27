import { z } from "zod";

/**
 * SEO override fields shared by every public content type. Spread into
 * each table's create/update validator to keep parsing consistent.
 */
export const SeoFields = {
  metaTitle: z.string().max(120).optional().nullable(),
  metaDescription: z.string().max(300).optional().nullable(),
  ogImageBlobKey: z.string().max(500).optional().nullable(),
  noindex: z.boolean().default(false),
  canonicalUrl: z
    .string()
    .url()
    .max(1000)
    .optional()
    .nullable()
    .or(z.literal("")),
};

/** FormData parser helper — call inside parseEventForm / parseMinistryForm /
 *  etc. and spread the result into your row object. */
export function parseSeoFromForm(formData: FormData): {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageBlobKey: string | null;
  noindex: boolean;
  canonicalUrl: string | null;
} {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    metaTitle: get("metaTitle") || null,
    metaDescription: get("metaDescription") || null,
    ogImageBlobKey: get("ogImageBlobKey") || null,
    noindex: formData.get("noindex") === "on",
    canonicalUrl: get("canonicalUrl") || null,
  };
}
