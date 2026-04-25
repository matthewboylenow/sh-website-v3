import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AdminRail } from "@/components/admin/AdminRail";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export const metadata = {
  title: "Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/admin");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <div className="min-h-dvh bg-cream">
      <AdminTopbar
        userEmail={session.user.email ?? ""}
        userName={session.user.name ?? null}
        signOut={signOutAction}
      />
      <div className="mx-auto grid max-w-[1400px] gap-0 px-4 sm:px-6 lg:grid-cols-[220px_1fr]">
        <AdminRail role={session.user.role} />
        <main className="min-w-0 py-8 lg:pl-8">{children}</main>
      </div>
    </div>
  );
}
