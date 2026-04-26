import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, ministries } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { EventForm } from "../EventForm";

export const metadata = { title: "Edit event · Admin" };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!row) notFound();

  const [photoPreviewUrl, settings, ministryOptions] = await Promise.all([
    assetUrl(row.photoBlobKey),
    getSiteSettings(),
    db
      .select({ id: ministries.id, name: ministries.name })
      .from(ministries)
      .orderBy(asc(ministries.name)),
  ]);
  const tax = settings?.taxonomies ?? {
    eventCategories: [],
    eventAudiences: [],
    ministryAudiences: [],
  };

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/events" className="hover:text-rust-dark">
          Events
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{row.title}</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl">{row.title}</h1>
        <Link
          href={`/events/${row.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-rust-dark hover:text-rust"
        >
          View on site →
        </Link>
      </div>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <EventForm
          mode="edit"
          eventId={row.id}
          defaultValues={row}
          photoPreviewUrl={photoPreviewUrl}
          audienceOptions={tax.eventAudiences}
          categoryOptions={tax.eventCategories}
          ministryOptions={ministryOptions}
        />
      </div>
    </div>
  );
}
