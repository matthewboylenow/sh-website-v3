"use server";

import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { pages, pageSections } from "@/db/schema";
import { editorFields } from "@/lib/audit";
import { parseSeoFromForm } from "@/lib/validators/seo";
import { PageCreateSchema, PageUpdateSchema } from "@/lib/validators/pages";

type ActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role !== "admin" && session.user.role !== "editor")
    return { ok: false as const, error: "Forbidden" };
  return { ok: true as const, session };
}

function parseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    slug: get("slug"),
    title: get("title"),
    summary: get("summary") || null,
    photoBlobKey: get("photoBlobKey") || null,
    status: (get("status") || "draft") as "draft" | "published" | "archived",
    ...parseSeoFromForm(formData),
  };
}

export async function createPageAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = PageCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(pages)
      .values({
        ...parsed.data,
        photoBlobKey: parsed.data.photoBlobKey || null,
        ...(await editorFields()),
      })
      .returning({ id: pages.id, slug: pages.slug });
    revalidateTag("pages");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("pages_slug_uq")) {
      return { ok: false, error: "That slug is already in use." };
    }
    return { ok: false, error: msg };
  }
}

export async function updatePageAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = PageUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(pages)
      .set({
        ...parsed.data,
        photoBlobKey: parsed.data.photoBlobKey || null,
        updatedAt: new Date(),
        ...(await editorFields()),
      })
      .where(eq(pages.id, id))
      .returning({ id: pages.id, slug: pages.slug });
    revalidateTag("pages");
    if (!row) return { ok: false, error: "Page not found" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function setPageStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;
  const [row] = await db
    .update(pages)
    .set({ status, updatedAt: new Date(), ...(await editorFields()) })
    .where(eq(pages.id, id))
    .returning({ id: pages.id, slug: pages.slug });
  revalidateTag("pages");
  if (!row) return { ok: false, error: "Page not found" };
  return { ok: true, id: row.id, slug: row.slug };
}

export async function deletePageAndRedirect(id: string) {
  const guard = await requireWriter();
  if (!guard.ok) return;
  // Hard-delete sections first (no FK cascade — page_sections is polymorphic).
  await db
    .delete(pageSections)
    .where(
      and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, id)),
    );
  await db.delete(pages).where(eq(pages.id, id));
  revalidateTag("pages");
  revalidateTag("page-sections");
  redirect("/admin/pages");
}
