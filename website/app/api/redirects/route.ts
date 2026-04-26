import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";

/**
 * Public-but-private redirects manifest. Middleware fetches this with
 * `next: { tags: ["redirects"], revalidate: 300 }` so it stays warm
 * across requests; admin saves bust the tag via revalidateTag("redirects").
 *
 * Returns the raw array — no auth gate, the contents are equivalent to
 * what the public site would expose anyway via 307s.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getRedirects = unstable_cache(
  async () => {
    const [row] = await db
      .select({ redirects: siteSettings.redirects })
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);
    return row?.redirects ?? [];
  },
  ["redirects:singleton"],
  { tags: ["redirects", "site-settings"], revalidate: 300 },
);

export async function GET() {
  const items = await getRedirects();
  return NextResponse.json({ items });
}
