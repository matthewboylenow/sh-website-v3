"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  ANNOUNCEMENT_ACCENTS,
  ANNOUNCEMENT_KINDS,
  announcements,
  type AnnouncementDateRow,
} from "@/db/schema";
import {
  AnnouncementCreateSchema,
  AnnouncementUpdateSchema,
} from "@/lib/validators/announcements";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (session.user.role !== "admin") {
    return { ok: false as const, error: "Forbidden — admins only" };
  }
  return { ok: true as const };
}

function parseForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  // Date rows ride along as JSON in a hidden input.
  let dateRows: AnnouncementDateRow[] = [];
  const raw = get("dateRows");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        dateRows = parsed
          .filter(
            (r): r is AnnouncementDateRow =>
              r &&
              typeof r === "object" &&
              typeof r.label === "string" &&
              typeof r.detail === "string",
          )
          .map((r) => ({ label: r.label.trim(), detail: r.detail.trim() }))
          .filter((r) => r.label && r.detail);
      }
    } catch {
      // ignore
    }
  }

  const kind = get("kind") || "slide_in";
  const accent = get("accent") || "navy";
  return {
    kind: (ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)
      ? (kind as "slide_in" | "modal")
      : ("slide_in" as const),
    status: (get("status") || "draft") as "draft" | "published" | "archived",
    priority: get("priority") || "0",
    startsAt: get("startsAt") || null,
    endsAt: get("endsAt") || null,
    ribbon: get("ribbon") || null,
    title: get("title"),
    body: get("body") || null,
    imageBlobKey: get("imageBlobKey") || null,
    dateRows,
    ctaLabel: get("ctaLabel") || null,
    ctaHref: get("ctaHref") || null,
    showDelaySeconds: get("showDelaySeconds") || "2.5",
    dismissDays: get("dismissDays") || "7",
    accent: (ANNOUNCEMENT_ACCENTS as readonly string[]).includes(accent)
      ? (accent as "navy" | "rust" | "gold")
      : ("navy" as const),
  };
}

export async function createAnnouncementAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = AnnouncementCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(announcements)
      .values({
        ...parsed.data,
        showDelaySeconds: String(parsed.data.showDelaySeconds),
        imageBlobKey: parsed.data.imageBlobKey || null,
      })
      .returning({ id: announcements.id });
    revalidateTag("announcements");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updateAnnouncementAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = AnnouncementUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(announcements)
      .set({
        ...parsed.data,
        showDelaySeconds:
          parsed.data.showDelaySeconds !== undefined
            ? String(parsed.data.showDelaySeconds)
            : undefined,
        imageBlobKey: parsed.data.imageBlobKey || null,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning({ id: announcements.id });
    revalidateTag("announcements");
    if (!row) return { ok: false, error: "Announcement not found" };
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function setAnnouncementStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const [row] = await db
    .update(announcements)
    .set({ status, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id });
  revalidateTag("announcements");
  if (!row) return { ok: false, error: "Announcement not found" };
  return { ok: true, id: row.id };
}
