import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, siteSettings } from "@/db/schema";
import { MatchmakerEditor } from "./MatchmakerEditor";

export const metadata = { title: "Matchmaker · Admin" };

export default async function AdminMatchmakerPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/matchmaker");
  if (session.user.role !== "admin") redirect("/admin");

  const [settingsRow, ministryRows] = await Promise.all([
    db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1),
    db
      .select({ matchmakerTags: ministries.matchmakerTags })
      .from(ministries)
      .where(eq(ministries.status, "published")),
  ]);

  const settings = settingsRow[0];
  if (!settings) redirect("/admin/settings");

  // Surface the union of tags currently in published ministries —
  // helps the admin pick tags that will actually score against a ministry.
  const ministryTagSet = new Set<string>();
  for (const r of ministryRows) {
    for (const t of r.matchmakerTags ?? []) ministryTagSet.add(t);
  }

  return (
    <div className="max-w-4xl">
      <header>
        <span className="sh-eyebrow">Settings</span>
        <h1 className="mt-2 text-3xl">Ministry Matchmaker</h1>
        <p className="sh-lede mt-2 text-[15px]">
          Edit the questions, answers, and tags the public quiz uses. The
          scoring API intersects these tags with each ministry&rsquo;s{" "}
          <code className="rounded bg-cream px-1.5 py-0.5 text-xs">
            matchmakerTags
          </code>{" "}
          field — so make sure the tags you use here match what your
          ministries carry.
        </p>
      </header>

      <div className="mt-8">
        <MatchmakerEditor
          initial={settings.matchmaker ?? { questions: [] }}
          knownMinistryTags={[...ministryTagSet].sort()}
        />
      </div>
    </div>
  );
}
