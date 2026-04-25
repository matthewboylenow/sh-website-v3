import { z } from "zod";

const slugLike = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Lowercase letters, numbers, hyphens");

export const TaxonomiesSchema = z.object({
  eventCategories: z.array(slugLike).max(40),
  eventAudiences: z.array(slugLike).max(40),
  ministryAudiences: z.array(slugLike).max(40),
});

export type TaxonomiesInput = z.infer<typeof TaxonomiesSchema>;
