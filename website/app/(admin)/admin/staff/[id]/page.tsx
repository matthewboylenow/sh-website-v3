import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { StaffForm } from "../StaffForm";

export const metadata = { title: "Edit staff · Admin" };

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [row] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  if (!row) notFound();

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/staff" className="hover:text-rust-dark">Staff</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{row.name}</span>
      </nav>
      <h1 className="text-3xl">{row.name}</h1>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <StaffForm mode="edit" staffId={row.id} defaultValues={row} />
      </div>
    </div>
  );
}
