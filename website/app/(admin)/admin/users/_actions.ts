"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministryLeads, users } from "@/db/schema";
import {
  InviteUserSchema,
  SetUserSchema,
} from "@/lib/validators/users";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role !== "admin")
    return { ok: false as const, error: "Forbidden — admins only" };
  return { ok: true as const, session };
}

function parseMinistryIds(formData: FormData): string[] {
  const raw = formData.get("ministryIds");
  if (typeof raw !== "string") return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const parsed = InviteUserSchema.safeParse({
    email: get("email"),
    name: get("name") || null,
    role: get("role") || "editor",
    phone: get("phone") || null,
    ministryIds: parseMinistryIds(formData),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
      })
      .returning({ id: users.id });
    if (!row) return { ok: false, error: "Insert returned no row" };

    if (parsed.data.ministryIds.length > 0) {
      await db
        .insert(ministryLeads)
        .values(
          parsed.data.ministryIds.map((mid, i) => ({
            userId: row.id,
            ministryId: mid,
            isPrimary: i === 0, // first picked = primary by default
            addedBy: guard.session.user.id,
          })),
        )
        .onConflictDoNothing();
    }
    return { ok: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("users_email_uq"))
      return { ok: false, error: "That email already has a user." };
    if (msg.includes("users_phone_uq"))
      return { ok: false, error: "That phone is already in use." };
    return { ok: false, error: msg };
  }
}

export async function setUserAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const parsed = SetUserSchema.safeParse({
    userId: get("userId"),
    role: get("role"),
    ministryIds: parseMinistryIds(formData),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (parsed.data.userId === guard.session.user.id && parsed.data.role !== "admin") {
    return {
      ok: false,
      error: "Use a different admin to change your own role.",
    };
  }

  try {
    await db
      .update(users)
      .set({ role: parsed.data.role })
      .where(eq(users.id, parsed.data.userId));

    // Replace ministry_leads rows for this user with the new set.
    // Insert any new pairs first, then prune the deletes — keeps the
    // operation as a logical "set sync" without a transaction.
    if (parsed.data.ministryIds.length === 0) {
      await db
        .delete(ministryLeads)
        .where(eq(ministryLeads.userId, parsed.data.userId));
    } else {
      await db
        .insert(ministryLeads)
        .values(
          parsed.data.ministryIds.map((mid, i) => ({
            userId: parsed.data.userId,
            ministryId: mid,
            isPrimary: i === 0,
            addedBy: guard.session.user.id,
          })),
        )
        .onConflictDoNothing();
      await db
        .delete(ministryLeads)
        .where(
          and(
            eq(ministryLeads.userId, parsed.data.userId),
            notInArray(ministryLeads.ministryId, parsed.data.ministryIds),
          ),
        );
    }

    return { ok: true, id: parsed.data.userId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database error",
    };
  }
}

/* ---- Helpers used by the users list page ---- */

/**
 * Loads ministry_leads for a list of users, returning a Map of
 * userId → ministryIds[]. One query for all users on the page, no
 * N+1 surprises.
 */
export async function leadsByUser(
  userIds: string[],
): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: ministryLeads.userId,
      ministryId: ministryLeads.ministryId,
    })
    .from(ministryLeads)
    .where(inArray(ministryLeads.userId, userIds));
  const out = new Map<string, string[]>();
  for (const r of rows) {
    const list = out.get(r.userId) ?? [];
    list.push(r.ministryId);
    out.set(r.userId, list);
  }
  return out;
}
