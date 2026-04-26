"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { editorFields } from "@/lib/audit";
import { bulletins } from "@/db/schema";
import {
  BulletinCreateSchema,
  BulletinUpdateSchema,
} from "@/lib/validators/bulletins";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role === "ministry_lead")
    return { ok: false as const, error: "Forbidden" };
  return { ok: true as const, session };
}

function parseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    weekOf: get("weekOf"),
    title: get("title") || null,
    pdfBlobKey: get("pdfBlobKey"),
    thumbBlobKey: get("thumbBlobKey") || null,
    pageCount: get("pageCount") || null,
    publishedAt: get("publishedAt") || null,
  };
}

export async function createBulletinAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = BulletinCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(bulletins)
      .values({
        weekOf: parsed.data.weekOf,
        title: parsed.data.title,
        pdfBlobKey: parsed.data.pdfBlobKey,
        thumbBlobKey: parsed.data.thumbBlobKey,
        pageCount: parsed.data.pageCount,
        // Auto-publish on create — bulletins go live immediately.
        publishedAt: parsed.data.publishedAt ?? new Date(),
        ...(await editorFields()),
      })
      .returning({ id: bulletins.id });
    revalidateTag("bulletins");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("bulletins_week_of_uq")) {
      return {
        ok: false,
        error: "A bulletin already exists for that week. Edit it instead.",
      };
    }
    return { ok: false, error: msg };
  }
}

export async function updateBulletinAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = BulletinUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(bulletins)
      .set({ ...parsed.data, ...(await editorFields()) })
      .where(eq(bulletins.id, id))
      .returning({ id: bulletins.id });
    revalidateTag("bulletins");
    if (!row) return { ok: false, error: "Bulletin not found" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteBulletinAndRedirect(id: string) {
  const guard = await requireWriter();
  if (!guard.ok) return;
  await db.delete(bulletins).where(eq(bulletins.id, id));
  revalidateTag("bulletins");
  redirect("/admin/bulletins");
}
