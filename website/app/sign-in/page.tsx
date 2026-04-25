import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container } from "@/components/site/Container";
import { SignInTabs } from "./SignInTabs";

export const metadata = {
  title: "Sign in",
  description: "Saint Helen Admin sign-in.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) {
    redirect(params.callbackUrl ?? "/admin");
  }

  return (
    <main className="min-h-dvh bg-cream pb-24 pt-12 sm:pt-20">
      <Container width="narrow">
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-base font-bold text-navy hover:text-rust-dark"
          >
            <span aria-hidden="true">←</span> Saint Helen
          </Link>
          <div className="mt-10 rounded-xl border border-rule bg-white p-8 shadow-md sm:p-10">
            <span className="sh-eyebrow">Admin sign-in</span>
            <h1 className="mt-2 text-3xl">Welcome back.</h1>
            <p className="sh-lede mt-3 text-[15px]">
              Sign in with the email or phone on file. Don&rsquo;t have an account?
              An admin needs to invite you first.
            </p>
            <div className="mt-8">
              <SignInTabs
                callbackUrl={params.callbackUrl ?? "/admin"}
                initialError={params.error}
              />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-ink-3">
            Trouble signing in? Email{" "}
            <a className="font-semibold" href="mailto:parish@sainthelen.org">
              parish@sainthelen.org
            </a>
            .
          </p>
        </div>
      </Container>
    </main>
  );
}
