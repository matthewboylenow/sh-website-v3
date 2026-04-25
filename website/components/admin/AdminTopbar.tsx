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
          <Link href="/admin" className="font-serif text-base font-bold text-white">
            Saint Helen <span className="text-gold">Admin</span>
          </Link>
          <span className="hidden text-xs text-white/50 sm:inline">
            {process.env.VERCEL_ENV ?? "local"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-white/70 hover:text-white sm:inline"
          >
            View site →
          </Link>
          <span className="hidden text-xs text-white/85 md:inline">
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
              className="rounded-pill border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
