import { z } from "zod";

export const ROLES = ["admin", "editor", "ministry_lead"] as const;

const phoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164 (e.g. +19085551234)")
  .optional()
  .nullable()
  .or(z.literal(""));

/**
 * Multi-ministry assignments now live in the ministry_leads join
 * table. Forms submit a comma-separated list of ministry UUIDs which
 * is parsed server-side into the join-table rows.
 */
export const InviteUserSchema = z
  .object({
    email: z.email("Valid email required"),
    name: z.string().max(200).optional().nullable(),
    role: z.enum(ROLES).default("editor"),
    phone: phoneE164,
    ministryIds: z.array(z.uuid()).default([]),
  })
  .refine(
    (v) => v.role !== "ministry_lead" || v.ministryIds.length > 0,
    {
      path: ["ministryIds"],
      message: "Ministry leads must be scoped to at least one ministry.",
    },
  );

export const SetUserSchema = z
  .object({
    userId: z.uuid(),
    role: z.enum(ROLES),
    ministryIds: z.array(z.uuid()).default([]),
  })
  .refine(
    (v) => v.role !== "ministry_lead" || v.ministryIds.length > 0,
    {
      path: ["ministryIds"],
      message: "Ministry leads must be scoped to at least one ministry.",
    },
  );

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type SetUserInput = z.infer<typeof SetUserSchema>;
