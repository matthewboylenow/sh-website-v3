"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { editorFields } from "@/lib/audit";
import { seasonalBanners } from "@/db/schema";
import {
  SeasonalBannerCreateSchema,
  SeasonalBannerUpdateSchema,
} from "@/lib/validators/seasonal-banners";
import { FORBIDDEN, canWriteContent } from "@/lib/authz";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (!canWriteContent(session.user.role))
    return { ok: false as const, error: FORBIDDEN };
  return { ok: true as const, session };
}

function parseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    title: get("title"),
    subtitle: get("subtitle") || null,
    ctaLabel: get("ctaLabel") || null,
    ctaUrl: get("ctaUrl") || null,
    photoBlobKey: get("photoBlobKey") || null,
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createBannerAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = SeasonalBannerCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(seasonalBanners)
      .values({
        ...parsed.data,
        ctaUrl: parsed.data.ctaUrl || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
      })
      .returning({ id: seasonalBanners.id });
    revalidateTag("seasonal-banners");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updateBannerAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = SeasonalBannerUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(seasonalBanners)
      .set({
        ...parsed.data,
        ctaUrl: parsed.data.ctaUrl || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
        updatedAt: new Date(), ...(await editorFields()),
      })
      .where(eq(seasonalBanners.id, id))
      .returning({ id: seasonalBanners.id });
    revalidateTag("seasonal-banners");
    if (!row) return { ok: false, error: "Banner not found" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteBannerAndRedirect(id: string) {
  const guard = await requireWriter();
  if (!guard.ok) return;
  await db.delete(seasonalBanners).where(eq(seasonalBanners.id, id));
  revalidateTag("seasonal-banners");
  redirect("/admin/seasonal-banners");
}
