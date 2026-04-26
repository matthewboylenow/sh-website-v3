"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { formationPages } from "@/db/schema";
import {
  FormationCreateSchema,
  FormationUpdateSchema,
} from "@/lib/validators/formation";

type ActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role === "ministry_lead") {
    return { ok: false as const, error: "Forbidden" };
  }
  return { ok: true as const, session };
}

function parseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const getList = (k: string) =>
    get(k)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    slug: get("slug"),
    name: get("name"),
    summary: get("summary") || null,
    description: get("description") || null,
    category: (get("category") || "kids") as
      | "kids"
      | "youth"
      | "adults"
      | "families",
    audiences: getList("audiences"),
    photoBlobKey: get("photoBlobKey") || null,
    contactEmail: get("contactEmail") || null,
    leadStaffId: get("leadStaffId") || null,
    orderingPriority: get("orderingPriority") || "100",
    status: (get("status") || "draft") as "draft" | "published" | "archived",
  };
}

export async function createFormationAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = FormationCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(formationPages)
      .values({
        ...parsed.data,
        photoBlobKey: parsed.data.photoBlobKey || null,
        contactEmail: parsed.data.contactEmail || null,
        leadStaffId: parsed.data.leadStaffId || null,
      })
      .returning({ id: formationPages.id, slug: formationPages.slug });
    revalidateTag("formation");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updateFormationAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = FormationUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(formationPages)
      .set({
        ...parsed.data,
        photoBlobKey: parsed.data.photoBlobKey || null,
        contactEmail: parsed.data.contactEmail || null,
        leadStaffId: parsed.data.leadStaffId || null,
        updatedAt: new Date(),
      })
      .where(eq(formationPages.id, id))
      .returning({ id: formationPages.id, slug: formationPages.slug });
    revalidateTag("formation");
    if (!row) return { ok: false, error: "Page not found" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function setFormationStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;
  const [row] = await db
    .update(formationPages)
    .set({ status, updatedAt: new Date() })
    .where(eq(formationPages.id, id))
    .returning({ id: formationPages.id, slug: formationPages.slug });
  revalidateTag("formation");
  if (!row) return { ok: false, error: "Page not found" };
  return { ok: true, id: row.id, slug: row.slug };
}
