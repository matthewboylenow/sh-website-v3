"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { editorFields } from "@/lib/audit";
import { staff } from "@/db/schema";
import {
  StaffCreateSchema,
  StaffUpdateSchema,
} from "@/lib/validators/staff";

type ActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  // Staff is admin-only per backend.html §07 roles table.
  if (session.user.role !== "admin") {
    return { ok: false as const, error: "Forbidden — admins only" };
  }
  return { ok: true as const, session };
}

function parseStaffForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    slug: get("slug"),
    name: get("name"),
    role: get("role"),
    bio: get("bio") || null,
    email: get("email") || null,
    photoBlobKey: get("photoBlobKey") || null,
    orderingPriority: get("orderingPriority") || "0",
    isActive: formData.get("isActive") === "on",
  };
}

export async function createStaffAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = StaffCreateSchema.safeParse(parseStaffForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(staff)
      .values({
        ...parsed.data,
        email: parsed.data.email || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
      })
      .returning({ id: staff.id, slug: staff.slug });

    revalidateTag("staff");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updateStaffAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = StaffUpdateSchema.safeParse(parseStaffForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(staff)
      .set({
        ...parsed.data,
        email: parsed.data.email || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
        updatedAt: new Date(), ...(await editorFields()),
      })
      .where(eq(staff.id, id))
      .returning({ id: staff.id, slug: staff.slug });
    revalidateTag("staff");
    if (!row) return { ok: false, error: "Staff not found" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteStaffAndRedirect(id: string) {
  const guard = await requireWriter();
  if (!guard.ok) return;
  // Soft delete via isActive=false; hard deletes are DB-only.
  await db
    .update(staff)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(staff.id, id));
  revalidateTag("staff");
  redirect("/admin/staff");
}
