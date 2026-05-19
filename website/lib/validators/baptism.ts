import { z } from "zod";

/**
 * Baptism intake submission — shape matches the legacy FluentForms
 * page at sainthelen.org/baptism. Required fields cover identity +
 * how to contact the family; the rest is descriptive.
 */

const Address = z
  .object({
    line1: z.string().max(200).optional().nullable().default(""),
    line2: z.string().max(200).optional().nullable().default(""),
    city: z.string().max(100).optional().nullable().default(""),
    state: z.string().max(50).optional().nullable().default(""),
    zip: z.string().max(20).optional().nullable().default(""),
  })
  .partial();

const optionalText = (max = 200) =>
  z.string().max(max).optional().nullable().or(z.literal(""));

export const BaptismSubmitSchema = z.object({
  /* ---- General contact ---------------------------------------- */
  phone: z.string().min(7, "Phone required").max(50),
  email: z.email("Valid email required").max(200),

  /* ---- Child --------------------------------------------------- */
  childFirstName: z.string().min(1, "Required").max(100),
  childMiddleName: optionalText(100),
  childLastName: z.string().min(1, "Required").max(100),
  childGender: z.string().min(1, "Required").max(20),
  childDateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  childPlaceOfBirth: z.string().min(1, "Required").max(200),
  childBirthAddress: Address.optional(),

  /* ---- Family --------------------------------------------------- */
  motherFirstName: z.string().min(1, "Required").max(100),
  motherMiddleName: optionalText(100),
  motherLastName: z.string().min(1, "Required").max(100),
  motherMaidenName: optionalText(100),
  motherReligion: z.string().min(1, "Required").max(100),

  fatherFirstName: z.string().min(1, "Required").max(100),
  fatherMiddleName: optionalText(100),
  fatherLastName: z.string().min(1, "Required").max(100),
  fatherReligion: z.string().min(1, "Required").max(100),

  familyAddress: Address.optional(),
  familyPhone: z.string().min(7, "Required").max(50),

  parentMarriageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  marriageLocation: z.string().min(1, "Required").max(200),
  marriageAddress: Address.optional(),

  registeredParishioner: z.string().min(1, "Required").max(10),
  baptizingFirstChild: z.string().min(1, "Required").max(10),
  siblingAges: optionalText(500),

  /* ---- Godparents --------------------------------------------- */
  godMotherFirstName: z.string().min(1, "Required").max(100),
  godMotherLastName: z.string().min(1, "Required").max(100),
  godMotherReligion: z.string().min(1, "Required").max(100),
  godMotherAddress: Address.optional(),

  godFatherFirstName: z.string().min(1, "Required").max(100),
  godFatherLastName: z.string().min(1, "Required").max(100),
  godFatherReligion: z.string().min(1, "Required").max(100),
  godFatherAddress: Address.optional(),
});

export type BaptismSubmission = z.infer<typeof BaptismSubmitSchema>;
