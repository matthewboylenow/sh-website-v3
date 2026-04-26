import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().max(500).optional().nullable(),
  photoBlobKey: z.string().max(500).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
};

export const PageCreateSchema = z.object(baseFields);
export const PageUpdateSchema = z.object({
  ...baseFields,
  slug: baseFields.slug.optional(),
  title: baseFields.title.optional(),
});

export type PageCreateInput = z.infer<typeof PageCreateSchema>;
export type PageUpdateInput = z.infer<typeof PageUpdateSchema>;
