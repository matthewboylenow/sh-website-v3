"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, ministryEdits } from "@/db/schema";
import { ENABLE_MINISTRY_SELF_SERVICE } from "@/lib/flags";
import { MinistryEditProposedSchema } from "@/lib/validators/ministry-edits";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

export async function submitMinistryEditAction(
  formData: FormData,
): Promise<ActionResult> {
  if (!ENABLE_MINISTRY_SELF_SERVICE) {
    return { ok: false, error: "Ministry self-service is disabled." };
  }

  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (session.user.role !== "ministry_lead")
    return { ok: false, error: "Forbidden — ministry leads only" };
  if (!session.user.ministryId)
    return { ok: false, error: "No ministry scope on your account." };

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  // Decode FAQ rows shaped as faq[N].q / faq[N].a
  const faqMap = new Map<number, { q?: string; a?: string }>();
  for (const [k, v] of formData.entries()) {
    const m = k.match(/^faq\[(\d+)\]\.(q|a)$/);
    if (!m || typeof v !== "string") continue;
    const idx = Number(m[1]);
    const field = m[2] as "q" | "a";
    const row = faqMap.get(idx) ?? {};
    row[field] = v.trim();
    faqMap.set(idx, row);
  }
  const faq = [...faqMap.values()]
    .filter((r) => r.q && r.a)
    .map((r) => ({ q: r.q!, a: r.a! }));

  const parsed = MinistryEditProposedSchema.safeParse({
    tagline: get("tagline") || null,
    description: get("description") || null,
    meetingCadence: get("meetingCadence") || null,
    contactEmail: get("contactEmail") || null,
    isAcceptingNew: formData.get("isAcceptingNew") === "on",
    faq: faq.length > 0 ? faq : undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Verify the ministry actually exists.
  const [ministry] = await db
    .select({ id: ministries.id })
    .from(ministries)
    .where(eq(ministries.id, session.user.ministryId))
    .limit(1);
  if (!ministry) return { ok: false, error: "Your assigned ministry no longer exists." };

  const [row] = await db
    .insert(ministryEdits)
    .values({
      ministryId: ministry.id,
      submittedBy: session.user.id,
      proposed: parsed.data,
    })
    .returning({ id: ministryEdits.id });

  if (!row) return { ok: false, error: "Insert returned no row" };
  return { ok: true, id: row.id };
}
