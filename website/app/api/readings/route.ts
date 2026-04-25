import { NextResponse } from "next/server";
import { fetchReadings } from "@/lib/readings";

/**
 * Public daily readings endpoint. Optional ?date=YYYY-MM-DD; defaults
 * to today (America/New_York). Cached on the edge for the day.
 */

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? undefined;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const result = await fetchReadings(date);
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
