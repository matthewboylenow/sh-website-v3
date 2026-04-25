import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { MinistryForm } from "../MinistryForm";

export const metadata = { title: "New ministry · Admin" };

export default async function NewMinistryPage() {
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
        <Link href="/admin/ministries" className="hover:text-rust-dark">Ministries</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New ministry</h1>
      <div className="mt-8">
        <MinistryForm
          mode="create"
          staffOptions={staffOptions}
          audienceOptions={tax.ministryAudiences}
          defaultValues={{
            slug: "",
            name: "",
            isAcceptingNew: true,
            orderingPriority: 100,
            status: "draft",
            audiences: [],
            matchmakerTags: [],
          }}
        />
      </div>
    </div>
  );
}
