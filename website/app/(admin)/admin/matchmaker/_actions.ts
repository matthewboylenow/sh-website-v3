"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings, type MatchmakerManifest } from "@/db/schema";
import { MatchmakerManifestSchema } from "@/lib/validators/matchmaker";
import { FORBIDDEN_ADMIN_ONLY, canAdminister } from "@/lib/authz";

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (!canAdminister(session.user.role))
    return { ok: false as const, error: FORBIDDEN_ADMIN_ONLY };
  return { ok: true as const };
}

export async function saveMatchmakerAction(
  manifest: MatchmakerManifest,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = MatchmakerManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await db
      .update(siteSettings)
      .set({
        matchmaker: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.id, 1));
    revalidateTag("site-settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database error",
    };
  }
}
