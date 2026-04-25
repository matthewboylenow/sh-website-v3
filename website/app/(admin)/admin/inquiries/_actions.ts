"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { inquiries, inquiryEvents, ministryLeads } from "@/db/schema";
import {
  InquiryStatusUpdateSchema,
  type InquiryStatusUpdateInput,
} from "@/lib/validators/inquiries";

type Result =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Admins can act on any inquiry. Ministry leads can act on inquiries
 * for ministries they lead. Editors share the admin scope.
 */
async function authorize(inquiryId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };

  const role = session.user.role;
  if (role === "admin" || role === "editor") {
    return { ok: true as const, session };
  }

  // Ministry-lead — must own the ministry the inquiry is for.
  const [row] = await db
    .select({ ministryId: inquiries.ministryId })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);
  if (!row) return { ok: false as const, error: "Inquiry not found" };

  const myIds = session.user.ministryIds ?? [];
  if (!myIds.includes(row.ministryId)) {
    return { ok: false as const, error: "You don't lead that ministry" };
  }
  return { ok: true as const, session };
}

export async function updateInquiryStatusAction(
  input: InquiryStatusUpdateInput,
): Promise<Result> {
  const parsed = InquiryStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const guard = await authorize(parsed.data.inquiryId);
  if (!guard.ok) return guard;

  await db
    .update(inquiries)
    .set({
      status: parsed.data.status,
      reasonCode: parsed.data.reasonCode ?? null,
      updatedAt: new Date(),
    })
    .where(eq(inquiries.id, parsed.data.inquiryId));

  await db.insert(inquiryEvents).values({
    inquiryId: parsed.data.inquiryId,
    userId: guard.session.user.id,
    kind: "status_change",
    payload: {
      to: parsed.data.status,
      reasonCode: parsed.data.reasonCode ?? null,
    },
  });

  if (parsed.data.notes && parsed.data.notes.trim().length > 0) {
    await db
      .update(inquiries)
      .set({ notes: parsed.data.notes, updatedAt: new Date() })
      .where(eq(inquiries.id, parsed.data.inquiryId));
    await db.insert(inquiryEvents).values({
      inquiryId: parsed.data.inquiryId,
      userId: guard.session.user.id,
      kind: "note_added",
      payload: { length: parsed.data.notes.length },
    });
  }

  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${parsed.data.inquiryId}`);
  return { ok: true };
}

const AddNoteSchema = z.object({
  inquiryId: z.uuid(),
  notes: z.string().min(1).max(5000),
});

export async function addInquiryNoteAction(input: {
  inquiryId: string;
  notes: string;
}): Promise<Result> {
  const parsed = AddNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const guard = await authorize(parsed.data.inquiryId);
  if (!guard.ok) return guard;

  await db
    .update(inquiries)
    .set({ notes: parsed.data.notes, updatedAt: new Date() })
    .where(eq(inquiries.id, parsed.data.inquiryId));

  await db.insert(inquiryEvents).values({
    inquiryId: parsed.data.inquiryId,
    userId: guard.session.user.id,
    kind: "note_added",
    payload: { length: parsed.data.notes.length },
  });

  revalidatePath(`/admin/inquiries/${parsed.data.inquiryId}`);
  return { ok: true };
}

const AssignSchema = z.object({
  inquiryId: z.uuid(),
  assigneeId: z.uuid().nullable(),
});

export async function assignInquiryAction(input: {
  inquiryId: string;
  assigneeId: string | null;
}): Promise<Result> {
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const guard = await authorize(parsed.data.inquiryId);
  if (!guard.ok) return guard;

  // Validate assignee actually leads this ministry (or is admin/editor).
  if (parsed.data.assigneeId) {
    const [inq] = await db
      .select({ ministryId: inquiries.ministryId })
      .from(inquiries)
      .where(eq(inquiries.id, parsed.data.inquiryId))
      .limit(1);
    if (!inq) return { ok: false, error: "Inquiry not found" };

    const [lead] = await db
      .select({ userId: ministryLeads.userId })
      .from(ministryLeads)
      .where(
        and(
          eq(ministryLeads.userId, parsed.data.assigneeId),
          eq(ministryLeads.ministryId, inq.ministryId),
        ),
      )
      .limit(1);
    if (!lead) {
      return { ok: false, error: "Assignee doesn't lead this ministry" };
    }
  }

  await db
    .update(inquiries)
    .set({ assignedTo: parsed.data.assigneeId, updatedAt: new Date() })
    .where(eq(inquiries.id, parsed.data.inquiryId));

  await db.insert(inquiryEvents).values({
    inquiryId: parsed.data.inquiryId,
    userId: guard.session.user.id,
    kind: "assigned",
    payload: { to: parsed.data.assigneeId },
  });

  revalidatePath(`/admin/inquiries/${parsed.data.inquiryId}`);
  return { ok: true };
}

/**
 * Returns the inquiries the session is allowed to see. Admins/editors
 * see everything; ministry leads see only their ministries' inquiries.
 */
export async function visibleMinistryFilter(): Promise<
  | { kind: "all" }
  | { kind: "scope"; ministryIds: string[] }
  | { kind: "none" }
> {
  const session = await auth();
  if (!session?.user) return { kind: "none" };
  const role = session.user.role;
  if (role === "admin" || role === "editor") return { kind: "all" };
  const ids = session.user.ministryIds ?? [];
  if (ids.length === 0) return { kind: "none" };
  return { kind: "scope", ministryIds: ids };
}
