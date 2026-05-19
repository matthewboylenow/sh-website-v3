import { z } from "zod";

/**
 * Funeral intake submission — shape matches the legacy FluentForms
 * page at sainthelen.org/funerals. Most fields are optional because
 * families fill in what they can in the days following a death; the
 * celebrant works from whatever's provided. Required fields cover
 * only what's needed to schedule the Mass and reach the family.
 *
 * Reading + music option lists are validated as free strings rather
 * than enums — the parish music director sometimes accommodates
 * one-off requests, and we don't want a stale dropdown to block a
 * submission. Lists are still enforced in the UI.
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

const optionalText = (max = 500) =>
  z.string().max(max).optional().nullable().or(z.literal(""));

const optionalLong = (max = 4000) =>
  z.string().max(max).optional().nullable().or(z.literal(""));

export const FuneralSubmitSchema = z.object({
  /* ---- Form filler --------------------------------------------- */
  fillerName: z.string().min(1, "Required").max(200),
  fillerEmail: z.email("Valid email required").max(200),

  /* ---- Mass scheduling ----------------------------------------- */
  massDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  massTime: z.string().min(1, "Pick a time").max(50),

  /* ---- Deceased ------------------------------------------------ */
  deceasedName: z.string().min(1, "Required").max(200),
  deceasedNickname: optionalText(100),
  placeOfBirth: optionalText(200),
  deceasedAge: optionalText(20),
  deceasedDateOfBirth: optionalText(20),

  maritalStatus: optionalText(20),
  spouseStatus: optionalText(20),
  spouseName: optionalText(200),
  yearsMarried: optionalText(50),

  childrenNames: optionalLong(1000),
  grandchildrenNames: optionalLong(1000),
  greatGrandchildrenNames: optionalLong(1000),
  siblingsNames: optionalLong(1000),
  parentsNames: optionalLong(1000),

  wasParishioner: optionalText(10),
  deceasedAddress: Address.optional(),

  /* ---- Next of Kin --------------------------------------------- */
  kinFirstName: optionalText(100),
  kinLastName: optionalText(100),
  kinRelation: optionalText(100),
  kinAddress: Address.optional(),
  kinEmail: z.email().or(z.literal("")).optional(),
  kinPhone: optionalText(50),

  /* ---- Background --------------------------------------------- */
  occupation: optionalLong(2000),
  specialQualities: optionalLong(4000),
  hobbies: optionalLong(4000),

  /* ---- Faith life --------------------------------------------- */
  relationshipWithGod: optionalLong(4000),
  parishInvolvement: optionalLong(2000),
  primaryCaregivers: optionalLong(2000),
  specialRequests: optionalLong(4000),

  /* ---- Mass of Christian Burial -------------------------------- */
  remains: z.string().min(1, "Required").max(50),
  remainsOther: optionalText(200),
  familyPlacesPall: z.string().min(1, "Required").max(10),

  /* ---- Readings and Lectors ----------------------------------- */
  familyChoosesPassages: z.string().min(1, "Required").max(10),
  firstReading: optionalText(100),
  secondReading: optionalText(100),
  intercessionOption: optionalText(100),

  familyMemberReader: z.string().min(1, "Required").max(10),
  readerFirstReading: optionalText(200),
  readerSecondReading: optionalText(200),
  readerPrayerFaithful: optionalText(200),

  giftBearers: optionalLong(1000),
  wordsOfRemembrance: z.string().min(1, "Required").max(10),
  wordsOfRemembrancePerson: optionalText(200),

  /* ---- Livestream --------------------------------------------- */
  livestreamRequested: z.string().min(1, "Required").max(10),

  /* ---- Music --------------------------------------------------- */
  entranceHymn: optionalText(200),
  psalm: optionalText(200),
  preparationHymn: optionalText(200),
  communionHymn: optionalText(200),
  commendationHymn: optionalText(200),
  recessionalHymn: optionalText(200),
  otherMusicRequests: optionalLong(2000),
});

export type FuneralSubmission = z.infer<typeof FuneralSubmitSchema>;
