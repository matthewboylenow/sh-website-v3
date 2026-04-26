"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, ministryEdits } from "@/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role !== "admin")
    return { ok: false as const, error: "Forbidden — admins only" };
  return { ok: true as const, session };
}

export async function approveMinistryEditAction(editId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const [edit] = await db
    .select()
    .from(ministryEdits)
    .where(eq(ministryEdits.id, editId))
    .limit(1);
  if (!edit) return { ok: false, error: "Edit not found" };
  if (edit.status !== "pending") return { ok: false, error: "Edit is not pending" };

  // Apply the proposed jsonb diff onto the ministry. We intentionally
  // only set the fields present in proposed — partial updates only.
  const proposed = edit.proposed ?? {};
  const setClause: Record<string, unknown> = { updatedAt: new Date() };
  if ("tagline" in proposed) setClause.tagline = proposed.tagline ?? null;
  if ("description" in proposed) setClause.description = proposed.description ?? null;
  if ("meetingCadence" in proposed) setClause.meetingCadence = proposed.meetingCadence ?? null;
  if ("contactEmail" in proposed) setClause.contactEmail = proposed.contactEmail ?? null;
  if ("isAcceptingNew" in proposed) setClause.isAcceptingNew = proposed.isAcceptingNew ?? true;
  // FAQ is intentionally NOT applied here — schema doesn't have a `faq`
  // column on ministries yet (post-launch ticket). Approvals UI shows
  // the FAQ diff for context but admins note out-of-band changes.

  // Sequential update — Neon HTTP driver doesn't support transactions.
  // If the second update fails the ministry has the new content but the
  // edit row is still pending; admin can re-approve and the second
  // update completes. No data loss either way.
  await db.update(ministries).set(setClause).where(eq(ministries.id, edit.ministryId));
  await db
    .update(ministryEdits)
    .set({
      status: "approved",
      reviewedBy: guard.session.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(ministryEdits.id, editId));

  revalidateTag("ministries");
  return { ok: true };
}

export async function rejectMinistryEditAction(
  editId: string,
  note: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const [edit] = await db
    .select({ status: ministryEdits.status })
    .from(ministryEdits)
    .where(eq(ministryEdits.id, editId))
    .limit(1);
  if (!edit) return { ok: false, error: "Edit not found" };
  if (edit.status !== "pending") return { ok: false, error: "Edit is not pending" };

  await db
    .update(ministryEdits)
    .set({
      status: "rejected",
      reviewedBy: guard.session.user.id,
      reviewerNote: note.trim() || null,
      reviewedAt: new Date(),
    })
    .where(eq(ministryEdits.id, editId));

  return { ok: true };
}
