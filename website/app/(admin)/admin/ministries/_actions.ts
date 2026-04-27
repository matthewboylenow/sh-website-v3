"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { editorFields } from "@/lib/audit";
import { parseSeoFromForm } from "@/lib/validators/seo";
import { ministries } from "@/db/schema";
import {
  MINISTRY_CATEGORIES,
  MinistryCreateSchema,
  MinistryUpdateSchema,
} from "@/lib/validators/ministries";

type ActionResult =
  | { ok: true; id: string; slug: string }
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
  const getList = (k: string) =>
    get(k)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const cat = get("category");
  const isCat = (MINISTRY_CATEGORIES as readonly string[]).includes(cat);

  let inquiryConfig: unknown = undefined;
  const cfgRaw = get("inquiryConfig");
  if (cfgRaw) {
    try {
      inquiryConfig = JSON.parse(cfgRaw);
    } catch {
      // Leave undefined — Zod will reject with a "Required" error if needed.
    }
  }

  return {
    slug: get("slug"),
    name: get("name"),
    tagline: get("tagline") || null,
    description: get("description") || null,
    audiences: getList("audiences"),
    category: isCat ? (cat as (typeof MINISTRY_CATEGORIES)[number]) : null,
    matchmakerTags: getList("matchmakerTags"),
    meetingCadence: get("meetingCadence") || null,
    leadStaffId: get("leadStaffId") || null,
    photoBlobKey: get("photoBlobKey") || null,
    contactEmail: get("contactEmail") || null,
    isAcceptingNew: formData.get("isAcceptingNew") === "on",
    orderingPriority: get("orderingPriority") || "0",
    status: (get("status") || "draft") as "draft" | "published" | "archived",
    inquiryConfig,
    ...parseSeoFromForm(formData),
  };
}

export async function createMinistryAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = MinistryCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(ministries)
      .values({
        ...parsed.data,
        leadStaffId: parsed.data.leadStaffId || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
        contactEmail: parsed.data.contactEmail || null,
      })
      .returning({ id: ministries.id, slug: ministries.slug });
    revalidateTag("ministries");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updateMinistryAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = MinistryUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(ministries)
      .set({
        ...parsed.data,
        leadStaffId: parsed.data.leadStaffId || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
        contactEmail: parsed.data.contactEmail || null,
        updatedAt: new Date(), ...(await editorFields()),
      })
      .where(eq(ministries.id, id))
      .returning({ id: ministries.id, slug: ministries.slug });
    revalidateTag("ministries");
    if (!row) return { ok: false, error: "Ministry not found" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function setMinistryStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;
  const [row] = await db
    .update(ministries)
    .set({ status, updatedAt: new Date() })
    .where(eq(ministries.id, id))
    .returning({ id: ministries.id, slug: ministries.slug });
  revalidateTag("ministries");
  if (!row) return { ok: false, error: "Ministry not found" };
  return { ok: true, id: row.id, slug: row.slug };
}
