import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { GivingForm } from "./GivingForm";

export const metadata = { title: "Giving links · Admin" };

export default async function AdminGivingSettingsPage() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) notFound();

  return (
    <div>
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/settings" className="hover:text-rust-dark">
          Site settings
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Giving</span>
      </nav>
      <h1 className="text-3xl">Giving links</h1>
      <p className="sh-lede mt-2 text-[15px]">
        Touchpoint URLs the public Give page links out to. Edit these any time
        — no deploy needed.
      </p>

      <div className="mt-8">
        <GivingForm
          initial={
            row.giving ?? {
              primaryUrl: "",
              recurringUrl: undefined,
              designations: [],
              seasonal: [],
            }
          }
        />
      </div>
    </div>
  );
}
