import { z } from "zod";

const idRegex = /^[a-z0-9][a-z0-9-]{0,40}$/;

const Answer = z.object({
  id: z.string().regex(idRegex, "Lowercase letters, numbers, hyphens"),
  label: z.string().min(1).max(120),
  sublabel: z.string().max(120).optional(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  skipQuestionIds: z.array(z.string().regex(idRegex)).max(8).optional(),
});

const Question = z.object({
  id: z.string().regex(idRegex, "Lowercase letters, numbers, hyphens"),
  prompt: z.string().min(1).max(200),
  answers: z
    .array(Answer)
    .min(2, "At least two answer choices per question")
    .max(8, "Up to 8 answers per question"),
});

export const MatchmakerManifestSchema = z
  .object({
    questions: z.array(Question).max(8),
    fallbackTags: z.array(z.string().min(1).max(40)).default([]),
  })
  .refine(
    (m) => {
      // Ensure question ids are unique.
      const seen = new Set<string>();
      for (const q of m.questions) {
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        // Ensure answer ids are unique within a question.
        const ans = new Set<string>();
        for (const a of q.answers) {
          if (ans.has(a.id)) return false;
          ans.add(a.id);
        }
      }
      return true;
    },
    { message: "Question and answer ids must be unique." },
  );
