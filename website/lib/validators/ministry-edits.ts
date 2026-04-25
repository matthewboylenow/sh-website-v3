import { z } from "zod";

/**
 * Fields a ministry lead can edit on their own ministry. Mirrors
 * `backend.html §07` exactly — controlled blocks, not free-form.
 */
export const MinistryEditProposedSchema = z.object({
  tagline: z.string().max(120).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  meetingCadence: z.string().max(80).optional().nullable(),
  contactEmail: z.email().optional().nullable().or(z.literal("")),
  isAcceptingNew: z.boolean().optional(),
  faq: z
    .array(
      z.object({
        q: z.string().min(1).max(140),
        a: z.string().min(1).max(500),
      }),
    )
    .max(5)
    .optional(),
});

export type MinistryEditProposed = z.infer<typeof MinistryEditProposedSchema>;
