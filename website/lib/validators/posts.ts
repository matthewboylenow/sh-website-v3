import { z } from "zod";
import { POST_CATEGORIES } from "@/db/schema";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().max(500).optional().nullable(),
  body: z.string().max(40000).optional().nullable(),
  category: z.enum(POST_CATEGORIES),
  photoBlobKey: z.string().max(500).optional().nullable(),
  authorName: z.string().max(120).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedAt: z.coerce.date().optional().nullable(),
};

export const PostCreateSchema = z.object(baseFields);
export const PostUpdateSchema = z.object(baseFields).partial();

export type PostCreateInput = z.infer<typeof PostCreateSchema>;
export type PostUpdateInput = z.infer<typeof PostUpdateSchema>;
