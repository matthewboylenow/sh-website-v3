"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings, type Redirect } from "@/db/schema";
import {
  RedirectsManifestSchema,
  type RedirectsManifestInput,
} from "@/lib/validators/redirects";

type Result = { ok: true } | { ok: false; error: string };

export async function saveRedirectsAction(
  manifest: RedirectsManifestInput,
): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in" };
  if (session.user.role !== "admin") {
    return { ok: false, error: "Forbidden — admins only" };
  }

  const parsed = RedirectsManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "manifest";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  const items: Redirect[] = parsed.data.items.map((r) => ({
    from: r.from.trim(),
    to: r.to.trim(),
    permanent: r.permanent,
  }));

  try {
    await db
      .update(siteSettings)
      .set({ redirects: items, updatedAt: new Date() })
      .where(eq(siteSettings.id, 1));
    revalidateTag("site-settings");
    revalidateTag("redirects");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}
