import Link from "next/link";

export function AdminTopbar({
  userEmail,
  userName,
  signOut,
}: {
  userEmail: string;
  userName: string | null;
  signOut: () => Promise<void>;
}) {
  const initials = (userName ?? userEmail)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="border-b border-navy-dark bg-navy text-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="font-serif text-base font-bold text-white hover:text-gold"
          >
            Saint Helen Admin
          </Link>
          <span className="hidden rounded-pill bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 sm:inline">
            {process.env.VERCEL_ENV ?? "local"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-white hover:text-gold sm:inline"
          >
            View site →
          </Link>
          <span className="hidden text-xs text-white md:inline">
            {userName ?? userEmail}
          </span>
          <div
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-rust text-xs font-bold uppercase text-white"
          >
            {initials || "·"}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-pill border border-white/40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
