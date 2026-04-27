import { z } from "zod";
import { FORMATION_CATEGORIES } from "@/db/schema";
import { SeoFields } from "./seo";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1, "Name is required").max(200),
  summary: z.string().max(500).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  category: z.enum(FORMATION_CATEGORIES),
  audiences: z.array(z.string()).default([]),
  photoBlobKey: z.string().max(500).optional().nullable(),
  contactEmail: z.email().optional().nullable().or(z.literal("")),
  leadStaffId: z.uuid().optional().nullable().or(z.literal("")),
  orderingPriority: z.coerce.number().int().min(0).max(9999).default(100),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  ...SeoFields,
};

export const FormationCreateSchema = z.object(baseFields);
export const FormationUpdateSchema = z.object(baseFields).partial();

export type FormationCreateInput = z.infer<typeof FormationCreateSchema>;
export type FormationUpdateInput = z.infer<typeof FormationUpdateSchema>;
