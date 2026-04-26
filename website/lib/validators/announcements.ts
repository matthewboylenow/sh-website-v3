import { z } from "zod";
import {
  ANNOUNCEMENT_ACCENTS,
  ANNOUNCEMENT_KINDS,
} from "@/db/schema";

const DateRowSchema = z.object({
  label: z.string().min(1).max(40),
  detail: z.string().min(1).max(120),
});

const baseFields = {
  kind: z.enum(ANNOUNCEMENT_KINDS),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  priority: z.coerce.number().int().min(-100).max(100).default(0),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),

  ribbon: z.string().max(80).optional().nullable(),
  title: z.string().min(1, "Title is required").max(120),
  body: z.string().max(4000).optional().nullable(),
  imageBlobKey: z.string().max(500).optional().nullable(),
  dateRows: z.array(DateRowSchema).max(10).default([]),
  ctaLabel: z.string().max(40).optional().nullable(),
  ctaHref: z.string().max(1000).optional().nullable(),

  showDelaySeconds: z.coerce.number().min(0).max(60).default(2.5),
  dismissDays: z.coerce.number().int().min(0).max(365).default(7),
  accent: z.enum(ANNOUNCEMENT_ACCENTS).default("navy"),
};

export const AnnouncementCreateSchema = z
  .object(baseFields)
  .refine(
    (v) => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt,
    { path: ["endsAt"], message: "End must be on or after start" },
  );

export const AnnouncementUpdateSchema = z.object(baseFields).partial();

export type AnnouncementCreateInput = z.infer<typeof AnnouncementCreateSchema>;
export type AnnouncementUpdateInput = z.infer<typeof AnnouncementUpdateSchema>;
