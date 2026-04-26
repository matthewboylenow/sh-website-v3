import { z } from "zod";

const fromPath = z
  .string()
  .min(2, "Path is required")
  .max(500)
  .startsWith("/", "Must start with /")
  .refine((s) => !s.includes(" "), "No spaces allowed")
  .refine(
    (s) => !s.startsWith("/api/") && !s.startsWith("/_next/") && s !== "/",
    "Reserved path",
  );

const toTarget = z
  .string()
  .min(1, "Target is required")
  .max(1000)
  .refine(
    (s) =>
      s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://"),
    "Use a path like /ministries/foo or a full URL",
  );

export const RedirectSchema = z.object({
  from: fromPath,
  to: toTarget,
  permanent: z.boolean().default(false),
});

export const RedirectsManifestSchema = z
  .object({ items: z.array(RedirectSchema).max(500) })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.items.forEach((r, i) => {
      const key = r.from.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "from"],
          message: "Duplicate from path",
        });
      }
      seen.add(key);
      // Trivial loop: from === to
      if (r.from === r.to) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "to"],
          message: "from and to are the same — this would loop",
        });
      }
    });
  });

export type RedirectsManifestInput = z.infer<typeof RedirectsManifestSchema>;
