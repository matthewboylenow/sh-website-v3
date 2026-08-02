"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import {
  HomepageHeroSchema,
  type HomepageHeroInput,
} from "@/lib/validators/homepage";
import {
  saveSectionsForParent,
  type SaveSectionsResult,
} from "@/lib/server/page-sections-actions";
import type { MinistrySectionsManifestInput } from "@/lib/validators/page-sections";
import { HOMEPAGE_PARENT_ID } from "./constants";
import { FORBIDDEN, canWriteContent } from "@/lib/authz";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  // Named requireAdmin, but this is deliberately the writer check —
  // editors may edit the homepage. See lib/authz.ts for the full matrix.
  if (!canWriteContent(session.user.role)) {
    return { ok: false as const, error: FORBIDDEN };
  }
  return { ok: true as const };
}

export async function saveHomepageHeroAction(
  input: HomepageHeroInput,
): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = HomepageHeroSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "hero";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  // Strip empty-string optional URLs to NULL-equivalent before persist.
  const clean = {
    ...parsed.data,
    videoUrl: parsed.data.videoUrl || undefined,
    posterUrl: parsed.data.posterUrl || undefined,
    eyebrow: parsed.data.eyebrow || undefined,
    lede: parsed.data.lede || undefined,
    massPeek: {
      enabled: parsed.data.massPeek.enabled,
      eyebrow: parsed.data.massPeek.eyebrow || undefined,
      linkLabel: parsed.data.massPeek.linkLabel || undefined,
      linkHref: parsed.data.massPeek.linkHref || undefined,
    },
  };

  try {
    await db
      .update(siteSettings)
      .set({ homepageHero: clean, updatedAt: new Date() })
      .where(eq(siteSettings.id, 1));
    revalidateTag("site-settings");
    revalidateTag("homepage");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

/**
 * Section-side wrapper, mirrors the ministry + formation pattern. Admin
 * + editor only.
 */
export async function saveHomepageSectionsAction(
  manifest: MinistrySectionsManifestInput,
): Promise<SaveSectionsResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const result = await saveSectionsForParent(
    "homepage",
    HOMEPAGE_PARENT_ID,
    manifest,
  );
  if (result.ok) revalidateTag("homepage");
  return result;
}
