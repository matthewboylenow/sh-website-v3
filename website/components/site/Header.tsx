import Link from "next/link";
import { Container } from "./Container";

const NAV_ITEMS = [
  { label: "I'm New", href: "/im-new" },
  { label: "Worship", href: "/mass" },
  { label: "Ministries", href: "/ministries" },
  { label: "Events", href: "/events" },
  { label: "Bulletin", href: "/bulletin" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-navy text-white shadow-md">
      <Container width="wide">
        <div className="flex items-center justify-between gap-6 py-4">
          <Link
            href="/"
            className="font-serif text-lg font-bold tracking-tight text-white hover:text-gold"
          >
            Saint Helen
          </Link>

          <nav className="hidden md:block">
            <ul className="flex items-center gap-7">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-white hover:text-gold"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            href="/give"
            className="inline-flex items-center rounded-pill bg-rust px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Give
          </Link>
        </div>
      </Container>
    </header>
  );
}
