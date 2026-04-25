"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { massTimes } from "@/db/schema";
import {
  MASS_KINDS,
  MassTimeCreateSchema,
  MassTimeUpdateSchema,
  OVERRIDE_KINDS,
} from "@/lib/validators/mass-times";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role === "ministry_lead")
    return { ok: false as const, error: "Forbidden" };
  return { ok: true as const, session };
}

function parseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const rowType = get("rowType"); // "weekly" | "override"
  const dayOfWeekRaw = get("dayOfWeek");
  const overrideDate = get("overrideDate");
  const overrideKind = get("overrideKind");
  const kind = get("kind");
  const isKnownKind = (MASS_KINDS as readonly string[]).includes(kind);
  const isKnownOverride = (OVERRIDE_KINDS as readonly string[]).includes(overrideKind);

  return {
    dayOfWeek: rowType === "weekly" && dayOfWeekRaw !== "" ? Number(dayOfWeekRaw) : null,
    time: get("time"),
    kind: isKnownKind ? (kind as (typeof MASS_KINDS)[number]) : "sunday",
    label: get("label") || null,
    presiderId: get("presiderId") || null,
    liveStreamUrl: get("liveStreamUrl") || null,
    overrideDate: rowType === "override" ? overrideDate || null : null,
    overrideKind:
      rowType === "override" && isKnownOverride
        ? (overrideKind as (typeof OVERRIDE_KINDS)[number])
        : null,
    notes: get("notes") || null,
    isActive: formData.get("isActive") === "on",
  };
}

export async function createMassTimeAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = MassTimeCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(massTimes)
      .values({
        ...parsed.data,
        presiderId: parsed.data.presiderId || null,
        liveStreamUrl: parsed.data.liveStreamUrl || null,
      })
      .returning({ id: massTimes.id });
    revalidateTag("mass-times");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updateMassTimeAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = MassTimeUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(massTimes)
      .set({
        ...parsed.data,
        presiderId: parsed.data.presiderId || null,
        liveStreamUrl: parsed.data.liveStreamUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(massTimes.id, id))
      .returning({ id: massTimes.id });
    revalidateTag("mass-times");
    if (!row) return { ok: false, error: "Mass time not found" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteMassTimeAndRedirect(id: string) {
  const guard = await requireWriter();
  if (!guard.ok) return;
  await db.delete(massTimes).where(eq(massTimes.id, id));
  revalidateTag("mass-times");
  redirect("/admin/mass-times");
}
