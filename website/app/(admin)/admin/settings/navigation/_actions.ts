"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { NavManifestSchema, type NavManifestInput } from "@/lib/validators/nav";

type Result =
  | { ok: true }
  | { ok: false; error: string };

export async function saveNavManifestAction(
  manifest: NavManifestInput,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (session.user.role !== "admin") {
    return { ok: false, error: "Forbidden — admins only" };
  }

  const parsed = NavManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "manifest";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  try {
    await db
      .update(siteSettings)
      .set({ nav: parsed.data, updatedAt: new Date() })
      .where(eq(siteSettings.id, 1));
    revalidateTag("site-settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}
