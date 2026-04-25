import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { massTimes, staff } from "@/db/schema";
import { MassTimeForm } from "../MassTimeForm";

export const metadata = { title: "Edit mass time · Admin" };

export default async function EditMassTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [row] = await db.select().from(massTimes).where(eq(massTimes.id, id)).limit(1);
  if (!row) notFound();

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
        <span>Edit</span>
      </nav>
      <h1 className="text-3xl">{row.label ?? prettyKind(row.kind)}</h1>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <MassTimeForm
          mode="edit"
          rowId={row.id}
          staffOptions={staffOptions}
          defaultValues={row}
        />
      </div>
    </div>
  );
}

function prettyKind(k: "sunday" | "vigil" | "daily" | "holy_day"): string {
  return k === "vigil"
    ? "Saturday Vigil"
    : k === "sunday"
      ? "Sunday Mass"
      : k === "daily"
        ? "Daily Mass"
        : "Holy Day Mass";
}
