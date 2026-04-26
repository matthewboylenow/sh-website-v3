"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { editorFields } from "@/lib/audit";
import { posts } from "@/db/schema";
import { PostCreateSchema, PostUpdateSchema } from "@/lib/validators/posts";

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
  const status = (get("status") || "draft") as "draft" | "published" | "archived";
  const publishedAtRaw = get("publishedAt");
  return {
    slug: get("slug"),
    title: get("title"),
    summary: get("summary") || null,
    body: get("body") || null,
    category: (get("category") || "pastor") as "pastor" | "stewardship",
    photoBlobKey: get("photoBlobKey") || null,
    authorName: get("authorName") || null,
    status,
    publishedAt: publishedAtRaw ? publishedAtRaw : null,
  };
}

export async function createPostAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = PostCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Auto-set publishedAt when first published.
  const publishedAt =
    parsed.data.status === "published" && !parsed.data.publishedAt
      ? new Date()
      : (parsed.data.publishedAt ?? null);

  try {
    const [row] = await db
      .insert(posts)
      .values({
        ...parsed.data,
        photoBlobKey: parsed.data.photoBlobKey || null,
        authorName: parsed.data.authorName || null,
        authorId: guard.session.user.id,
        publishedAt,
      })
      .returning({ id: posts.id, slug: posts.slug });
    revalidateTag("posts");
    if (!row) return { ok: false, error: "Insert returned no row" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function updatePostAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = PostUpdateSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    // Stamp publishedAt the moment status flips to "published" if the
    // editor didn't pick a date themselves.
    const [existing] = await db
      .select({ publishedAt: posts.publishedAt, status: posts.status })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: "Post not found" };

    let publishedAt: Date | null = parsed.data.publishedAt ?? existing.publishedAt;
    if (
      parsed.data.status === "published" &&
      existing.status !== "published" &&
      !parsed.data.publishedAt
    ) {
      publishedAt = new Date();
    }

    const [row] = await db
      .update(posts)
      .set({
        ...parsed.data,
        photoBlobKey: parsed.data.photoBlobKey || null,
        authorName: parsed.data.authorName || null,
        publishedAt,
        updatedAt: new Date(), ...(await editorFields()),
      })
      .where(eq(posts.id, id))
      .returning({ id: posts.id, slug: posts.slug });
    revalidateTag("posts");
    if (!row) return { ok: false, error: "Post not found" };
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function setPostStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const [existing] = await db
    .select({ publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Post not found" };

  const publishedAt =
    status === "published" && !existing.publishedAt ? new Date() : existing.publishedAt;

  const [row] = await db
    .update(posts)
    .set({ status, publishedAt, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning({ id: posts.id, slug: posts.slug });
  revalidateTag("posts");
  if (!row) return { ok: false, error: "Post not found" };
  return { ok: true, id: row.id, slug: row.slug };
}
