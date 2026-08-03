import { z } from "zod";
import { LITURGICAL_RULES, MOMENT_AFTER } from "@/lib/answers/types";

/**
 * Validation for answer cards.
 *
 * The one rule worth calling out: a card marked pastoral cannot be published
 * by somebody without the review role. That is enforced in the action rather
 * than here, because it depends on who is asking.
 */

const MomentSchema = z.object({
  label: z.string().max(120).default(""),
  /** `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`. Parish local, no offset. */
  when: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/,
      "Use YYYY-MM-DD or YYYY-MM-DDTHH:MM",
    ),
  where: z.string().max(120).default(""),
  after: z.enum(MOMENT_AFTER).default("drop"),
  rule: z.union([z.enum(LITURGICAL_RULES), z.literal("")]).default(""),
});

const LinkSchema = z.object({
  label: z.string().min(1).max(160),
  url: z.string().min(1).max(1000),
});

const ActivationSchema = z.object({
  rule: z.enum(LITURGICAL_RULES),
  leadDays: z.coerce.number().int().min(0).max(365),
  trailDays: z.coerce.number().int().min(0).max(365),
});

export const AnswerCardSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  title: z.string().min(1).max(160),
  answer: z.string().min(1).max(8000),
  group: z.string().max(120).default(""),
  // Blank lines are dropped so an editor can lay the box out how they like.
  triggers: z.array(z.string().min(1).max(160)).min(1).max(60),
  links: z.array(LinkSchema).max(12).default([]),
  moments: z.array(MomentSchema).max(12).default([]),
  contact: z.string().max(60).default(""),
  pastoral: z.boolean().default(false),
  activation: ActivationSchema.nullable().default(null),
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  note: z.string().max(2000).default(""),
  position: z.coerce.number().int().min(0).max(9999).default(0),
});

export type AnswerCardInput = z.infer<typeof AnswerCardSchema>;

/** Split a textarea into a clean list, dropping blanks and duplicates. */
export function linesToList(raw: string, cap = 60): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}
