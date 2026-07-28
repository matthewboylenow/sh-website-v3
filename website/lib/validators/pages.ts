import { z } from "zod";
import { SeoFields } from "./seo";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * CMS pages serve at the site root (/<slug>), so a page slug must never
 * collide with a real route. Keep in sync with app/(site)/* top-level
 * segments (plus app-level reserved paths). A colliding page would be
 * unreachable — the static route always wins.
 */
export const RESERVED_PAGE_SLUGS = new Set([
  // app-level
  "admin", "api", "sign-in", "design-system", "p",
  // (site) static routes
  "baptism", "blog", "bulletin", "contact", "events", "formation",
  "funerals", "give", "im-new", "inquiries", "mass", "ministries",
  "sacraments",
  // standalone ministry root routes
  "adoration", "basketball", "called", "christlife", "grow", "lifelines",
  "music", "pre-cana", "vbs", "wwp", "young-adult-ministry",
  "youth-ministry",
]);

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only")
    .refine(
      (s) => !RESERVED_PAGE_SLUGS.has(s),
      "This slug is reserved by an existing site route",
    ),
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().max(500).optional().nullable(),
  photoBlobKey: z.string().max(500).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  ...SeoFields,
};

export const PageCreateSchema = z.object(baseFields);
export const PageUpdateSchema = z.object({
  ...baseFields,
  slug: baseFields.slug.optional(),
  title: baseFields.title.optional(),
});

export type PageCreateInput = z.infer<typeof PageCreateSchema>;
export type PageUpdateInput = z.infer<typeof PageUpdateSchema>;
