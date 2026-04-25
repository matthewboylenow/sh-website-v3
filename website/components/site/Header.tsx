import Link from "next/link";

const NAV_ITEMS = [
  { label: "I'm New", href: "/im-new" },
  { label: "Worship", href: "/mass" },
  { label: "Ministries", href: "/ministries" },
  { label: "Events", href: "/events" },
  { label: "Bulletin", href: "/bulletin" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/20 bg-navy/55 px-4 py-2 shadow-lg backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-navy/40 sm:px-5">
        <Link
          href="/"
          className="font-serif text-base font-bold tracking-tight text-white hover:text-gold sm:text-lg"
        >
          Saint Helen
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/give"
          className="inline-flex items-center rounded-full bg-rust px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-5 sm:py-2"
        >
          Give
        </Link>
      </div>
    </header>
  );
}
