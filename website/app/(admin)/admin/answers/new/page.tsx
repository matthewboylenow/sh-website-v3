import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canWriteContent } from "@/lib/authz";
import { AnswerCardForm } from "../AnswerCardForm";

export const metadata = { title: "New answer card · Admin" };

export default async function NewAnswerCard() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/answers/new");
  if (!canWriteContent(session.user.role)) redirect("/admin");

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/answers" className="hover:text-rust-dark">
          Answer cards
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New answer card</h1>
      <p className="sh-lede mt-2 max-w-[62ch] text-[15px]">
        Cards are created as drafts. Nothing answers a search until you publish
        it.
      </p>
      <div className="mt-8">
        <AnswerCardForm mode="create" />
      </div>
    </div>
  );
}
