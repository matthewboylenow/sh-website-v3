import { z } from "zod";

/**
 * OCIA (Order of Christian Initiation of Adults) inquirer form.
 * Ported from the legacy FluentForms "New OCIA Form" (id 24) on
 * sainthelen.org/ocia-form — same questions, same option lists.
 * Name + email are required so the team can respond; everything else is
 * optional (the legacy form required nothing, and inquirers often skip
 * the reflective questions on a first pass).
 */

const optionalText = (max = 4000) =>
  z.string().max(max).optional().nullable().or(z.literal(""));

export const OCIA_BAPTIZED_OPTIONS = ["Yes", "No", "Unsure"] as const;

export const OCIA_SACRAMENTS = [
  "Penance (Confession)",
  "Eucharist (First Communion)",
  "Confirmation",
] as const;

export const OCIA_MARITAL_STATUSES = [
  "Never been married",
  "Engaged to be married",
  "Married",
  "Married, but separated",
  "Divorced, not remarried",
  "Widow/widower, not remarried",
] as const;

export const OCIA_RESONATE_OPTIONS = [
  "I need much more information about the Catholic Church before I would consider joining",
  "I am considering joining, but I am still unsure.",
  "I am fairly sure that I would like to join, but I need some time to study and pray about it.",
  "I am fairly sure I want to join the Catholic Church.",
] as const;

export const OciaSubmitSchema = z.object({
  firstName: z.string().min(1, "Required").max(100),
  lastName: z.string().min(1, "Required").max(100),
  email: z.email("Enter a valid email"),
  phone: optionalText(40),
  currentAffiliation: optionalText(300),
  baptized: z.enum(OCIA_BAPTIZED_OPTIONS).optional().nullable().or(z.literal("")),
  baptismDetails: optionalText(2000),
  sacramentsReceived: z.array(z.enum(OCIA_SACRAMENTS)).optional(),
  maritalStatus: z.enum(OCIA_MARITAL_STATUSES).optional().nullable().or(z.literal("")),
  whatLedYou: optionalText(4000),
  religiousEducation: optionalText(4000),
  catholicInteractions: optionalText(4000),
  questionsConcerns: optionalText(4000),
  whoIsJesus: optionalText(4000),
  resonates: z.enum(OCIA_RESONATE_OPTIONS).optional().nullable().or(z.literal("")),
});

export type OciaSubmission = z.infer<typeof OciaSubmitSchema>;
