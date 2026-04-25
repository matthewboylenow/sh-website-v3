import { z } from "zod";

export const AccountUpdateSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  // E.164 — leading +, country code, then digits.
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164 format (e.g. +19085551234)")
    .optional()
    .nullable()
    .or(z.literal("")),
  preferredAuthMethod: z.enum(["email", "sms"]).default("email"),
});

export type AccountUpdateInput = z.infer<typeof AccountUpdateSchema>;
