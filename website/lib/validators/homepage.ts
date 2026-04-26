import { z } from "zod";

const CtaSchema = z.object({
  label: z.string().min(1, "CTA label is required").max(40),
  href: z.string().min(1).max(1000),
  variant: z.enum(["primary", "secondary"]).optional(),
});

export const HomepageHeroSchema = z.object({
  videoUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  posterUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  eyebrow: z.string().max(120).optional().nullable(),
  title: z.string().min(1, "Title is required").max(200),
  lede: z.string().max(500).optional().nullable(),
  ctas: z.array(CtaSchema).max(6),
  massPeek: z.object({
    enabled: z.boolean(),
    eyebrow: z.string().max(60).optional().nullable(),
    linkLabel: z.string().max(60).optional().nullable(),
    linkHref: z.string().max(500).optional().nullable(),
  }),
});

export type HomepageHeroInput = z.infer<typeof HomepageHeroSchema>;
