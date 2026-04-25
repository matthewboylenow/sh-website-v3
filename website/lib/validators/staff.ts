import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseFields = {
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1, "Name is required").max(200),
  role: z.string().min(1, "Role is required").max(120),
  bio: z.string().max(5000).optional().nullable(),
  email: z.email().optional().nullable().or(z.literal("")),
  photoBlobKey: z.string().max(500).optional().nullable(),
  orderingPriority: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
};

export const StaffCreateSchema = z.object(baseFields);
export const StaffUpdateSchema = z.object(baseFields).partial();

export type StaffCreateInput = z.infer<typeof StaffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof StaffUpdateSchema>;
