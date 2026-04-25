import { z } from "zod";

export const ROLES = ["admin", "editor", "ministry_lead"] as const;

const phoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164 (e.g. +19085551234)")
  .optional()
  .nullable()
  .or(z.literal(""));

export const InviteUserSchema = z
  .object({
    email: z.email("Valid email required"),
    name: z.string().max(200).optional().nullable(),
    role: z.enum(ROLES).default("editor"),
    phone: phoneE164,
    ministryId: z.uuid().optional().nullable().or(z.literal("")),
  })
  .refine(
    (v) => v.role !== "ministry_lead" || Boolean(v.ministryId),
    {
      path: ["ministryId"],
      message: "Ministry leads must be scoped to a ministry.",
    },
  );

export const SetRoleSchema = z
  .object({
    userId: z.uuid(),
    role: z.enum(ROLES),
    ministryId: z.uuid().optional().nullable().or(z.literal("")),
  })
  .refine(
    (v) => v.role !== "ministry_lead" || Boolean(v.ministryId),
    {
      path: ["ministryId"],
      message: "Ministry leads must be scoped to a ministry.",
    },
  );

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
