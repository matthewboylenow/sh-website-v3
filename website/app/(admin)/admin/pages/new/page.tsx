import Link from "next/link";
import { PageForm } from "../PageForm";

export const metadata = { title: "New page · Admin" };

export default function NewPagePage() {
  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/pages" className="hover:text-rust-dark">
          Pages
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New page</h1>
      <p className="sh-lede mt-2 text-[15px]">
        Drafts don&rsquo;t appear publicly until you publish.
      </p>
      <div className="mt-8">
        <PageForm
          mode="create"
          defaultValues={{
            slug: "",
            title: "",
            status: "draft",
          }}
        />
      </div>
    </div>
  );
}
