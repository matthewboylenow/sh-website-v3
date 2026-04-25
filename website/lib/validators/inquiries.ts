import { z } from "zod";
import { INQUIRY_STATUSES } from "@/db/schema";

const KINDS = ["join", "inquire", "volunteer"] as const;

export const InquirySubmitSchema = z.object({
  kind: z.enum(KINDS),
  name: z.string().min(1, "Please share your name").max(200),
  email: z.email("Please enter a valid email"),
  phone: z.string().max(30).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  customAnswers: z.record(z.string(), z.string()).optional(),
});

export const InquiryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  buttons: z
    .array(
      z.object({
        kind: z.enum(KINDS),
        label: z.string().min(1).max(80),
        enabled: z.boolean(),
      }),
    )
    .max(3),
  customFields: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        type: z.enum(["text", "textarea"]),
        required: z.boolean(),
      }),
    )
    .max(8)
    .optional(),
});

export const InquiryStatusUpdateSchema = z.object({
  inquiryId: z.uuid(),
  status: z.enum(INQUIRY_STATUSES),
  reasonCode: z.string().max(80).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type InquirySubmitInput = z.infer<typeof InquirySubmitSchema>;
export type InquiryConfigInput = z.infer<typeof InquiryConfigSchema>;
export type InquiryStatusUpdateInput = z.infer<typeof InquiryStatusUpdateSchema>;
