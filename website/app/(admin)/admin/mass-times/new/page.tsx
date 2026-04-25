import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { MassTimeForm } from "../MassTimeForm";

export const metadata = { title: "New mass time · Admin" };

export default async function NewMassTimePage() {
  const staffOptions = await db
    .select({ id: staff.id, name: staff.name })
    .from(staff)
    .orderBy(asc(staff.orderingPriority), asc(staff.name));

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/mass-times" className="hover:text-rust-dark">
          Mass times
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New mass time</h1>
      <p className="sh-lede mt-2 text-[15px]">
        Add a recurring weekly Mass, or a one-off override (canceled, added, moved).
      </p>
      <div className="mt-8">
        <MassTimeForm
          mode="create"
          staffOptions={staffOptions}
          defaultValues={{
            dayOfWeek: 0,
            time: "10:00",
            kind: "sunday",
            isActive: true,
          }}
        />
      </div>
    </div>
  );
}
