import { z } from "zod";

const baseFields = {
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(500).optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaUrl: z.string().url().optional().nullable().or(z.literal("")),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true),
};

export const SeasonalBannerCreateSchema = z
  .object(baseFields)
  .refine((v) => v.endsAt >= v.startsAt, {
    path: ["endsAt"],
    message: "End must be on or after start",
  });

export const SeasonalBannerUpdateSchema = z
  .object(baseFields)
  .partial()
  .refine(
    (v) => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt,
    { path: ["endsAt"], message: "End must be on or after start" },
  );

export type SeasonalBannerCreateInput = z.infer<typeof SeasonalBannerCreateSchema>;
export type SeasonalBannerUpdateInput = z.infer<typeof SeasonalBannerUpdateSchema>;
