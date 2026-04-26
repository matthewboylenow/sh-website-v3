import { auth } from "@/auth";

/**
 * Audit fields populated on every admin write — `lastEditedBy` is the
 * signed-in user's id when present, null otherwise (so server-triggered
 * writes like the public matchmaker upsert don't fail FK validation).
 *
 * Spread the result into your Drizzle .set() calls:
 *
 *   .update(events).set({ ...patch, ...(await editorFields()) })
 */
export async function editorFields(): Promise<{
  lastEditedBy: string | null;
  lastEditedAt: Date;
}> {
  const session = await auth();
  return {
    lastEditedBy: session?.user?.id ?? null,
    lastEditedAt: new Date(),
  };
}
