import { z } from "zod";
import { WEEKDAYS } from "@/db/schema";

/**
 * Authoritative event validator. Used by the admin Server Actions
 * (Step 4) and will also back the public API in Step 6.
 */

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RecurrenceEndSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("never") }),
  z.object({ kind: z.literal("count"), count: z.coerce.number().int().min(1).max(520) }),
  z.object({
    kind: z.literal("until"),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  }),
]);

export const RecurrenceSchema = z.discriminatedUnion("freq", [
  z.object({
    freq: z.literal("weekly"),
    interval: z.coerce.number().int().min(1).max(52),
    byday: z.array(z.enum(WEEKDAYS)).min(1, "Pick at least one weekday"),
    ends: RecurrenceEndSchema,
  }),
  z.object({
    freq: z.literal("monthly_nth"),
    interval: z.coerce.number().int().min(1).max(24),
    nth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal("last")]),
    weekday: z.enum(WEEKDAYS),
    ends: RecurrenceEndSchema,
  }),
]);

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
  registerCtaLabel: z.string().max(40).optional().nullable(),
  photoBlobKey: z.string().max(500).optional().nullable(),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  recurrence: RecurrenceSchema.optional().nullable(),
  exceptionDates: z
    .array(z.string().datetime({ offset: true }))
    .max(200)
    .default([]),
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
