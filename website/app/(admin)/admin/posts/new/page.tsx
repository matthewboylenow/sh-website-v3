import Link from "next/link";
import { PostForm } from "../PostForm";

export const metadata = { title: "New post · Admin" };

export default function NewPostPage() {
  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/posts" className="hover:text-rust-dark">Posts</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New post</h1>
      <div className="mt-8">
        <PostForm
          mode="create"
          defaultValues={{
            slug: "",
            title: "",
            category: "pastor",
            status: "draft",
          }}
        />
      </div>
    </div>
  );
}
