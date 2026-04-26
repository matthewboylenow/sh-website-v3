"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Role } from "@/auth.config";

const CONTENT_ADMIN = [
  { href: "/admin/events", label: "Events" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/mass-times", label: "Mass times" },
  { href: "/admin/ministries", label: "Ministries" },
  { href: "/admin/formation", label: "Formation" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/bulletins", label: "Bulletins" },
  { href: "/admin/seasonal-banners", label: "Seasonal banners" },
] as const;

/** Ministry leads see only their own surface. */
const CONTENT_MINISTRY_LEAD = [
  { href: "/admin/my-ministries", label: "My ministries" },
] as const;

const SETTINGS = [
  { href: "/admin/settings", label: "Site settings", role: "admin" as const },
  { href: "/admin/settings/giving", label: "Giving links", role: "admin" as const },
  { href: "/admin/settings/navigation", label: "Navigation", role: "admin" as const },
  { href: "/admin/settings/redirects", label: "Redirects", role: "admin" as const },
  { href: "/admin/settings/announcements", label: "Announcements", role: "admin" as const },
  { href: "/admin/settings/taxonomies", label: "Taxonomies", role: "admin" as const },
  { href: "/admin/matchmaker", label: "Matchmaker", role: "admin" as const },
  { href: "/admin/users", label: "Users & roles", role: "admin" as const },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/approvals", label: "Approvals", role: "admin" as const },
  { href: "/admin/media", label: "Media", role: "admin" as const },
  { href: "/admin/account", label: "My account" },
] as const;

export function AdminRail({ role }: { role: Role }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const isLead = role === "ministry_lead";

  const contentItems = isLead ? CONTENT_MINISTRY_LEAD : CONTENT_ADMIN;

  return (
    <aside className="hidden border-r border-rule py-8 pr-4 lg:block">
      <RailGroup title="Content">
        {contentItems.map((item) => (
          <RailLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </RailGroup>
      <RailGroup title="Settings" className="mt-6">
        {SETTINGS.filter(
          (item) => !("role" in item && item.role === "admin" && !isAdmin),
        ).map((item) => (
          <RailLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </RailGroup>
    </aside>
  );
}

function RailGroup({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {title}
      </h3>
      <ul>{children}</ul>
    </div>
  );
}

function RailLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-white font-semibold text-navy shadow-sm"
            : "text-ink-2 hover:bg-white"
        }`}
      >
        {label}
      </Link>
    </li>
  );
}
