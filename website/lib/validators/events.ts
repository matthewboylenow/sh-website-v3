import { z } from "zod";

/**
 * Authoritative event validator. Used by the admin Server Actions
 * (Step 4) and will also back the public API in Step 6.
 */

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required").max(200),
  lede: z.string().max(500).optional().nullable(),
  body: z.string().max(20000).optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  location: z.string().max(200).optional().nullable(),
  audiences: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  registerUrl: z.string().url().optional().nullable().or(z.literal("")),
  photoBlobKey: z.string().max(500).optional().nullable(),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
};

export const EventCreateSchema = z
  .object(baseFields)
  .refine((v) => v.endsAt >= v.startsAt, {
    path: ["endsAt"],
    message: "End must be on or after start",
  });

export const EventUpdateSchema = z
  .object({
    ...baseFields,
    slug: baseFields.slug.optional(),
    title: baseFields.title.optional(),
    startsAt: baseFields.startsAt.optional(),
    endsAt: baseFields.endsAt.optional(),
  })
  .refine(
    (v) => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt,
    {
      path: ["endsAt"],
      message: "End must be on or after start",
    },
  );

export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;
