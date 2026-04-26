import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ministries } from "@/db/schema";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { EventForm } from "../EventForm";

export const metadata = { title: "New event · Admin" };

export default async function NewEventPage() {
  const settings = await getSiteSettings();
  const tax = settings?.taxonomies ?? {
    eventCategories: [],
    eventAudiences: [],
    ministryAudiences: [],
  };

  const ministryOptions = await db
    .select({ id: ministries.id, name: ministries.name })
    .from(ministries)
    .orderBy(asc(ministries.name));

  // Default the start/end to "today at 6 PM" / "today at 8 PM" — most events
  // are evenings; editor adjusts as needed.
  const start = new Date();
  start.setHours(18, 0, 0, 0);
  const end = new Date(start);
  end.setHours(20, 0, 0, 0);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/events" className="hover:text-rust-dark">
          Events
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New event</h1>
      <p className="sh-lede mt-2 text-[15px]">
        Drafts don&rsquo;t appear on the public site until you publish.
      </p>
      <div className="mt-8">
        <EventForm
          mode="create"
          audienceOptions={tax.eventAudiences}
          categoryOptions={tax.eventCategories}
          ministryOptions={ministryOptions}
          defaultValues={{
            slug: "",
            title: "",
            startsAt: start,
            endsAt: end,
            audiences: [],
            categories: [],
            isFeatured: false,
            status: "draft",
          }}
        />
      </div>
    </div>
  );
}
