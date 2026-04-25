import { z } from "zod";

const baseFields = {
  weekOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  title: z.string().max(200).optional().nullable(),
  pdfBlobKey: z
    .string()
    .min(1, "Upload a bulletin PDF before saving")
    .max(500),
  thumbBlobKey: z.string().max(500).optional().nullable(),
  pageCount: z.coerce.number().int().min(1).max(200).optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(),
};

export const BulletinCreateSchema = z.object(baseFields);
export const BulletinUpdateSchema = z.object(baseFields).partial();

export type BulletinCreateInput = z.infer<typeof BulletinCreateSchema>;
export type BulletinUpdateInput = z.infer<typeof BulletinUpdateSchema>;
