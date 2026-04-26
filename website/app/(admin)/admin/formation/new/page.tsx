import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { FormationForm } from "../FormationForm";

export const metadata = { title: "New formation page · Admin" };

export default async function NewFormationPage() {
  const [staffOptions, settings] = await Promise.all([
    db
      .select({ id: staff.id, name: staff.name })
      .from(staff)
      .orderBy(asc(staff.orderingPriority), asc(staff.name)),
    getSiteSettings(),
  ]);
  const tax = settings?.taxonomies ?? {
    eventCategories: [],
    eventAudiences: [],
    ministryAudiences: [],
  };

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/formation" className="hover:text-rust-dark">Formation</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New formation page</h1>
      <div className="mt-8">
        <FormationForm
          mode="create"
          staffOptions={staffOptions}
          audienceOptions={tax.ministryAudiences}
          defaultValues={{
            slug: "",
            name: "",
            category: "kids",
            orderingPriority: 100,
            status: "draft",
            audiences: [],
          }}
        />
      </div>
    </div>
  );
}
