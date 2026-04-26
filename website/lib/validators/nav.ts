import { z } from "zod";

const labelTrim = (max = 60) =>
  z.string().min(1, "Label is required").max(max);

const hrefTrim = z
  .string()
  .min(1, "Link is required")
  .max(500)
  .refine(
    (s) =>
      s.startsWith("/") ||
      s.startsWith("http://") ||
      s.startsWith("https://") ||
      s.startsWith("mailto:") ||
      s.startsWith("tel:") ||
      s.startsWith("#"),
    "Use a path like /events, a full URL, or mailto:/tel:/#anchor",
  );

export const NavLinkSchema = z.object({
  label: labelTrim(60),
  href: hrefTrim,
});

export const NavMegaSectionSchema = z.object({
  heading: labelTrim(60),
  links: z.array(NavLinkSchema).min(1).max(12),
});

export const NavMegaFeatureSchema = z.object({
  tag: z.string().max(40).optional(),
  title: labelTrim(80),
  body: z.string().max(240).optional(),
  ctaLabel: labelTrim(40),
  ctaHref: hrefTrim,
});

export const NavMegaSchema = z.object({
  sections: z.array(NavMegaSectionSchema).min(1).max(4),
  feature: NavMegaFeatureSchema.optional(),
});

export const NavItemSchema = z.object({
  label: labelTrim(40),
  href: hrefTrim,
  mega: NavMegaSchema.optional(),
});

export const NavManifestSchema = z.object({
  items: z.array(NavItemSchema).min(1).max(8),
});

export type NavManifestInput = z.infer<typeof NavManifestSchema>;
