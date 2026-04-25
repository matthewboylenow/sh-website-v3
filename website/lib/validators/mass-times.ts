import { z } from "zod";

export const MASS_KINDS = ["sunday", "vigil", "daily", "holy_day"] as const;
export const OVERRIDE_KINDS = ["canceled", "added", "moved"] as const;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const baseFields = {
  // Either dayOfWeek (weekly) OR overrideDate (one-off) is set; both are
  // optional in the schema. We enforce "exactly one" via refine below.
  dayOfWeek: z.coerce
    .number()
    .int()
    .min(0)
    .max(6)
    .nullable()
    .optional(),
  time: z.string().regex(timeRegex, "Use HH:MM (24-hour)"),
  kind: z.enum(MASS_KINDS),
  label: z.string().max(120).optional().nullable(),
  presiderId: z.uuid().optional().nullable().or(z.literal("")),
  liveStreamUrl: z.string().url().optional().nullable().or(z.literal("")),
  overrideDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional(),
  overrideKind: z.enum(OVERRIDE_KINDS).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
};

export const MassTimeCreateSchema = z
  .object(baseFields)
  .refine(
    (v) => (v.dayOfWeek != null) !== Boolean(v.overrideDate),
    {
      message: "Either Day-of-week (weekly) or Override date — not both.",
      path: ["dayOfWeek"],
    },
  )
  .refine(
    (v) => !v.overrideDate || Boolean(v.overrideKind),
    { message: "Override kind required for one-off rows.", path: ["overrideKind"] },
  );

export const MassTimeUpdateSchema = z.object(baseFields).partial();

export type MassTimeCreateInput = z.infer<typeof MassTimeCreateSchema>;
export type MassTimeUpdateInput = z.infer<typeof MassTimeUpdateSchema>;
