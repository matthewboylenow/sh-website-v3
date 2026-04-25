"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { TaxonomiesSchema } from "@/lib/validators/taxonomies";

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

export async function saveTaxonomiesAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (session.user.role !== "admin")
    return { ok: false, error: "Forbidden — admins only" };

  const parseList = (key: string): string[] =>
    String(formData.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const parsed = TaxonomiesSchema.safeParse({
    eventCategories: parseList("eventCategories"),
    eventAudiences: parseList("eventAudiences"),
    ministryAudiences: parseList("ministryAudiences"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  await db
    .update(siteSettings)
    .set({ taxonomies: parsed.data, updatedAt: new Date() })
    .where(eq(siteSettings.id, 1));
  revalidateTag("site-settings");
  return { ok: true };
}
