"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AccountUpdateSchema } from "@/lib/validators/account";

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

export async function updateAccountAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const parsed = AccountUpdateSchema.safeParse({
    name: get("name") || null,
    phone: get("phone") || null,
    preferredAuthMethod: get("preferredAuthMethod") || "email",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await db
      .update(users)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        preferredAuthMethod: parsed.data.preferredAuthMethod,
      })
      .where(eq(users.id, session.user.id));
    return { ok: true };
  } catch (err) {
    // Likely a unique-phone collision.
    const message = err instanceof Error ? err.message : "Database error";
    return {
      ok: false,
      error: message.includes("users_phone_uq")
        ? "That phone number is already in use by another user."
        : message,
    };
  }
}
