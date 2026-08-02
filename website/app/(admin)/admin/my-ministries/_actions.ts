"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, ministryEdits, ministryLeads } from "@/db/schema";
import { ENABLE_MINISTRY_SELF_SERVICE } from "@/lib/flags";
import { MinistryEditProposedSchema } from "@/lib/validators/ministry-edits";
import { canWriteContent } from "@/lib/authz";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

/**
 * Submit a proposed edit for a ministry the current user leads.
 *
 * Authorization: user must have a ministry_leads row for this ministry,
 * OR be admin/editor (who can edit any ministry directly via /admin/
 * ministries — but if they hit this route, treat them like a lead and
 * route through the approval queue for consistency).
 *
 * Hard-gated by ENABLE_MINISTRY_SELF_SERVICE for ministry_lead role.
 * Admin/editor bypass the flag.
 */
export async function submitMinistryEditAction(
  ministryId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };

  const isPrivileged = canWriteContent(session.user.role);
  const leadsThis = session.user.ministryIds.includes(ministryId);

  if (!isPrivileged && !leadsThis) {
    return { ok: false, error: "You don't lead that ministry." };
  }
  if (!isPrivileged && !ENABLE_MINISTRY_SELF_SERVICE) {
    return { ok: false, error: "Ministry self-service is disabled." };
  }

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
    .where(eq(ministries.id, ministryId))
    .limit(1);
  if (!ministry) return { ok: false, error: "Ministry not found." };

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

/** Confirm the current user can lead this ministry. Server-side gate. */
export async function userLeadsMinistry(
  userId: string,
  ministryId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: ministryLeads.userId })
    .from(ministryLeads)
    .where(
      and(
        eq(ministryLeads.userId, userId),
        eq(ministryLeads.ministryId, ministryId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
