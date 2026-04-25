import Link from "next/link";
import { Container } from "@/components/site/Container";

export default function SiteNotFound() {
  return (
    <section className="bg-cream py-32">
      <Container width="default" className="text-center">
        <span className="sh-eyebrow">404 · Not found</span>
        <h1 className="mt-4">That page isn&rsquo;t live yet.</h1>
        <p className="sh-lede mx-auto mt-4 max-w-[52ch]">
          The Saint Helen 3.0 rebuild is in progress — the homepage, Plan Your
          Visit, Mass, and Events are ready. The rest of the site comes online
          with Step 4 (admin) and Step 5 (uploads). Thanks for your patience.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
          >
            Back to home
          </Link>
          <Link
            href="/mass"
            className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
          >
            Mass times
          </Link>
        </div>
      </Container>
    </section>
  );
}
