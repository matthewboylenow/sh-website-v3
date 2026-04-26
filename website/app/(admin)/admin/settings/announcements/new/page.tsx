import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AnnouncementForm } from "../AnnouncementForm";

export const metadata = { title: "New announcement · Admin" };

export default async function NewAnnouncementPage() {
  const session = await auth();
  if (!session?.user)
    redirect("/sign-in?callbackUrl=/admin/settings/announcements/new");
  if (session.user.role !== "admin") redirect("/admin");

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/settings/announcements" className="hover:text-rust-dark">
          Announcements
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New announcement</h1>
      <div className="mt-8">
        <AnnouncementForm
          mode="create"
          defaultValues={{
            kind: "slide_in",
            status: "draft",
            priority: 0,
            accent: "navy",
            dateRows: [],
          }}
        />
      </div>
    </div>
  );
}
