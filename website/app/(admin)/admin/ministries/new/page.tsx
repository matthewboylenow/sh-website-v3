import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { MinistryForm } from "../MinistryForm";

export const metadata = { title: "New ministry · Admin" };

export default async function NewMinistryPage() {
  const staffOptions = await db
    .select({ id: staff.id, name: staff.name })
    .from(staff)
    .orderBy(asc(staff.orderingPriority), asc(staff.name));

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
