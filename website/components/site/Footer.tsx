import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-navy-dark text-white">
      <Container width="wide">
        <div className="grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="font-serif text-base font-bold text-white">
              Saint Helen Parish
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              1600 Rahway Avenue
              <br />
              Westfield, NJ 07090
            </p>
          </div>

          <FooterColumn
            title="Visit"
            links={[
              { label: "I'm New", href: "/im-new" },
              { label: "Mass & Livestream", href: "/mass" },
              { label: "Plan Your Visit", href: "/im-new" },
            ]}
          />
          <FooterColumn
            title="Connect"
            links={[
              { label: "Ministries", href: "/ministries" },
              { label: "Events", href: "/events" },
              { label: "Bulletin", href: "/bulletin" },
              { label: "Contact", href: "/contact" },
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              { label: "Give", href: "/give" },
              { label: "Volunteer", href: "/ministries" },
            ]}
          />
        </div>

        <div className="border-t border-white/15 py-6 text-xs text-white/85">
          &copy; {year} Saint Helen Parish &middot; A Roman Catholic parish in
          the Archdiocese of Newark.
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-white hover:text-gold">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
