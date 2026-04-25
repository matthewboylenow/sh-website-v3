import Link from "next/link";
import { StaffForm } from "../StaffForm";

export const metadata = { title: "New staff · Admin" };

export default function NewStaffPage() {
  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/staff" className="hover:text-rust-dark">Staff</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New staff member</h1>
      <div className="mt-8">
        <StaffForm
          mode="create"
          defaultValues={{
            slug: "",
            name: "",
            role: "",
            isActive: true,
            orderingPriority: 100,
          }}
        />
      </div>
    </div>
  );
}
