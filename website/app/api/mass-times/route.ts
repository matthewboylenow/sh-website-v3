import { NextResponse } from "next/server";
import { getWeeklyMassTimes } from "@/lib/queries/mass-times.query";

/**
 * Public read-only weekly Mass schedule. Used by /mass internally
 * via direct query, but also exposed here for any external embed,
 * widget, or integration that wants the data as JSON.
 *
 * Cached 5 minutes at the edge — admin mutations call
 * revalidateTag("mass-times") so this updates promptly on changes.
 */

export const runtime = "nodejs";

export async function GET() {
  const rows = await getWeeklyMassTimes();
  const data = rows.map((row) => ({
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    time: row.time,
    kind: row.kind,
    label: row.label,
    liveStreamUrl: row.liveStreamUrl,
    notes: row.notes,
    presider: row.presider?.id
      ? { name: row.presider.name, role: row.presider.role }
      : null,
  }));
  return NextResponse.json(
    { count: data.length, items: data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  );
}
