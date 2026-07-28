import { z } from "zod";

const Address = z.object({
  street: z.string().max(200).default(""),
  city: z.string().max(100).default(""),
  state: z.string().max(50).default(""),
  zip: z.string().max(20).default(""),
});

const SocialLinks = z.object({
  facebook: z.string().url().optional().nullable().or(z.literal("")),
  youtube: z.string().url().optional().nullable().or(z.literal("")),
  instagram: z.string().url().optional().nullable().or(z.literal("")),
});

export const SiteSettingsGeneralSchema = z.object({
  contactEmail: z.email("Valid email required"),
  contactPhone: z.string().max(50).optional().nullable(),
  address: Address,
  socialLinks: SocialLinks,
  welcomeFormRecipients: z.array(z.email()).default([]),
  funeralFormRecipients: z.array(z.email()).default([]),
  baptismFormRecipients: z.array(z.email()).default([]),
  ociaFormRecipients: z.array(z.email()).default([]),
  prayerFormRecipients: z.array(z.email()).default([]),
  logoBlobKey: z.string().max(500).optional().nullable(),
  logoAlt: z.string().max(120).optional().nullable(),
  faviconBlobKey: z.string().max(500).optional().nullable(),
  appleTouchIconBlobKey: z.string().max(500).optional().nullable(),
  footerCopy: z.string().max(1000).optional().nullable(),
  bottomBarHtml: z.string().max(1000).optional().nullable(),
  densityScale: z
    .string()
    .regex(/^\d+(?:\.\d{1,2})?$/, "Number with up to 2 decimals")
    .default("1.00"),
});

const SeasonalGivingCampaign = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
  activeFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activeUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const Designation = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
});

export const SiteSettingsGivingSchema = z.object({
  primaryUrl: z.string().url("Touchpoint primary URL is required"),
  recurringUrl: z.string().url().optional().nullable().or(z.literal("")),
  designations: z.array(Designation).default([]),
  seasonal: z.array(SeasonalGivingCampaign).default([]),
});

export type SiteSettingsGeneralInput = z.infer<typeof SiteSettingsGeneralSchema>;
export type SiteSettingsGivingInput = z.infer<typeof SiteSettingsGivingSchema>;
