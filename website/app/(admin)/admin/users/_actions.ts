"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  InviteUserSchema,
  SetRoleSchema,
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
    ministryId: get("ministryId") || null,
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
        ministryId: parsed.data.ministryId || null,
        // emailVerified intentionally null until first sign-in.
      })
      .returning({ id: users.id });
    if (!row) return { ok: false, error: "Insert returned no row" };
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

export async function setUserRoleAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const parsed = SetRoleSchema.safeParse({
    userId: get("userId"),
    role: get("role"),
    ministryId: get("ministryId") || null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Don't let admins demote themselves into a corner.
  if (parsed.data.userId === guard.session.user.id && parsed.data.role !== "admin") {
    return {
      ok: false,
      error: "Use a different admin to change your own role — locking yourself out is too easy this way.",
    };
  }

  try {
    const [row] = await db
      .update(users)
      .set({
        role: parsed.data.role,
        ministryId: parsed.data.role === "ministry_lead" ? parsed.data.ministryId : null,
      })
      .where(eq(users.id, parsed.data.userId))
      .returning({ id: users.id });
    if (!row) return { ok: false, error: "User not found" };
    return { ok: true, id: row.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database error",
    };
  }
}
