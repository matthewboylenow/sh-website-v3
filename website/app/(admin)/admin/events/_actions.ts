"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events } from "@/db/schema";
import {
  EventCreateSchema,
  EventUpdateSchema,
} from "@/lib/validators/events";

/**
 * Server Actions for the events admin. All mutations end with
 * revalidateTag("events") so public-site Server Components reflect
 * the change on the next request.
 *
 * Role gate: admin and editor can write events; ministry_lead cannot.
 */

type ActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Not signed in" };
  }
  if (session.user.role === "ministry_lead") {
    return { ok: false as const, error: "Forbidden" };
  }
  return { ok: true as const, session };
}

function parseEventForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const getList = (k: string) =>
    get(k)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  // Recurrence + exceptions ride along as JSON in hidden inputs from the
  // client form (avoids hand-parsing a multi-field nested structure).
  let recurrence: unknown = null;
  const recRaw = get("recurrence");
  if (recRaw) {
    try {
      recurrence = JSON.parse(recRaw);
    } catch {
      // Leave null — Zod will surface the issue if required.
    }
  }
  let exceptionDates: string[] = [];
  const excRaw = get("exceptionDates");
  if (excRaw) {
    try {
      const parsed = JSON.parse(excRaw);
      if (Array.isArray(parsed)) {
        exceptionDates = parsed.filter((s) => typeof s === "string");
      }
    } catch {
      // ignore
    }
  }

  return {
    slug: get("slug"),
    title: get("title"),
    lede: get("lede") || null,
    body: get("body") || null,
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    location: get("location") || null,
    audiences: getList("audiences"),
    categories: getList("categories"),
    registerUrl: get("registerUrl") || null,
    registerCtaLabel: get("registerCtaLabel") || null,
    photoBlobKey: get("photoBlobKey") || null,
    isFeatured: formData.get("isFeatured") === "on",
    status: (get("status") || "draft") as "draft" | "published" | "archived",
    recurrence,
    exceptionDates,
  };
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = EventCreateSchema.safeParse(parseEventForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .insert(events)
      .values({
        ...parsed.data,
        registerUrl: parsed.data.registerUrl || null,
        registerCtaLabel: parsed.data.registerCtaLabel || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
        recurrence: parsed.data.recurrence ?? null,
        exceptionDates: parsed.data.exceptionDates ?? [],
        createdBy: guard.session.user.id,
      })
      .returning({ id: events.id, slug: events.slug });

    revalidateTag("events");
    if (!row) {
      return { ok: false, error: "Insert returned no row" };
    }
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database error",
    };
  }
}

export async function updateEventAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = EventUpdateSchema.safeParse(parseEventForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [row] = await db
      .update(events)
      .set({
        ...parsed.data,
        registerUrl: parsed.data.registerUrl || null,
        registerCtaLabel: parsed.data.registerCtaLabel || null,
        photoBlobKey: parsed.data.photoBlobKey || null,
        recurrence: parsed.data.recurrence ?? null,
        exceptionDates: parsed.data.exceptionDates ?? [],
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning({ id: events.id, slug: events.slug });

    revalidateTag("events");
    if (!row) {
      return { ok: false, error: "Event not found" };
    }
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database error",
    };
  }
}

export async function setEventStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const [row] = await db
    .update(events)
    .set({ status, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning({ id: events.id, slug: events.slug });
  revalidateTag("events");
  if (!row) {
    return { ok: false, error: "Event not found" };
  }
  return { ok: true, id: row.id, slug: row.slug };
}

export async function deleteEventAndRedirect(id: string) {
  // Soft delete: set archived. Hard delete is DB-only.
  const guard = await requireWriter();
  if (!guard.ok) return;
  await db
    .update(events)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(events.id, id));
  revalidateTag("events");
  redirect("/admin/events");
}
