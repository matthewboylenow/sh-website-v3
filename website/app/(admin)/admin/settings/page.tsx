import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Site settings · Admin" };

export default async function AdminSiteSettingsPage() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) notFound();
  const logoPreviewUrl = await assetUrl(row.logoBlobKey);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Settings</span>
          <h1 className="mt-2 text-3xl">Site settings</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Contact info, address, social links, and the basics every page
            uses. Stewardship URLs live on{" "}
            <Link href="/admin/settings/giving" className="font-semibold text-rust-dark">
              /admin/settings/giving
            </Link>.
          </p>
        </div>
      </header>

      <div className="mt-8">
        <SettingsForm initial={row} logoPreviewUrl={logoPreviewUrl} />
      </div>
    </div>
  );
}
