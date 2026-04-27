import { z } from "zod";
import { InquiryConfigSchema } from "./inquiries";
import { SeoFields } from "./seo";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MINISTRY_CATEGORIES = [
  "worship",
  "formation",
  "fellowship",
  "service",
  "sacraments",
  "music",
] as const;

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1, "Name is required").max(200),
  tagline: z.string().max(120).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  audiences: z.array(z.string()).default([]),
  category: z.enum(MINISTRY_CATEGORIES).optional().nullable(),
  matchmakerTags: z.array(z.string()).default([]),
  meetingCadence: z.string().max(80).optional().nullable(),
  leadStaffId: z.uuid().optional().nullable().or(z.literal("")),
  photoBlobKey: z.string().max(500).optional().nullable(),
  contactEmail: z.email().optional().nullable().or(z.literal("")),
  isAcceptingNew: z.boolean().default(true),
  orderingPriority: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  inquiryConfig: InquiryConfigSchema.optional(),
  ...SeoFields,
};

export const MinistryCreateSchema = z.object(baseFields);
export const MinistryUpdateSchema = z.object(baseFields).partial();

export type MinistryCreateInput = z.infer<typeof MinistryCreateSchema>;
export type MinistryUpdateInput = z.infer<typeof MinistryUpdateSchema>;
