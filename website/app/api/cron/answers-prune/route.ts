import { NextResponse } from "next/server";
import { pruneAnswerData } from "@/lib/answers/retention";

/**
 * Nightly retention run.
 *
 * WordPress hung this off WP-Cron, which only fires on a page request — so
 * on a quiet parish site "daily" meant "whenever somebody next visits", and
 * if nobody did, the retention promise was simply not kept. A real scheduler
 * is the whole point of moving it.
 *
 * Add to vercel.json:
 *   { "crons": [{ "path": "/api/cron/answers-prune", "schedule": "0 8 * * *" }] }
 * 08:00 UTC is a little after 3am in Westfield.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel signs its own cron requests with this header. Without a secret
  // configured the route refuses rather than running open to the internet.
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await pruneAnswerData();
  return NextResponse.json({ ok: true, ...result });
}
