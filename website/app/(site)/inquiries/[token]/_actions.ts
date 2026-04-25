"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inquiries, inquiryEvents } from "@/db/schema";
import {
  verifyInquiryToken,
  type InquiryAction,
} from "@/lib/inquiry-tokens";

const ACTION_TO_STATUS: Record<InquiryAction, "contacted" | "joined" | "stuck"> = {
  contacted: "contacted",
  joined: "joined",
  stuck: "stuck",
};

/**
 * Server Action invoked by the magic-link confirmation form. Idempotent:
 * applying "contacted" twice is a no-op the second time. Designed to
 * survive Outlook safe-link prefetches because we only mutate on POST.
 */
export async function applyInquiryActionToken(token: string): Promise<void> {
  const verified = verifyInquiryToken(token);
  if (!verified.ok) {
    redirect(`/inquiries/${token}`);
  }

  const targetStatus = ACTION_TO_STATUS[verified.action];

  const [row] = await db
    .select({
      id: inquiries.id,
      currentStatus: inquiries.status,
    })
    .from(inquiries)
    .where(eq(inquiries.id, verified.inquiryId))
    .limit(1);
  if (!row) redirect(`/inquiries/${token}`);

  if (row.currentStatus !== targetStatus) {
    await db
      .update(inquiries)
      .set({ status: targetStatus, updatedAt: new Date() })
      .where(eq(inquiries.id, row.id));

    await db.insert(inquiryEvents).values({
      inquiryId: row.id,
      userId: null,
      viaToken: true,
      kind: "status_change",
      payload: { to: targetStatus, source: "magic-link" },
    });

    revalidatePath("/admin/inquiries");
    revalidatePath(`/admin/inquiries/${row.id}`);
  }

  redirect(`/inquiries/${token}?confirmed=1`);
}
