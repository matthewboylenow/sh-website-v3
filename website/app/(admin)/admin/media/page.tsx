import Image from "next/image";
import { desc, ilike, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { blobAssets } from "@/db/schema";
import { resolveAssetUrl } from "@/lib/blob";
import { toDate } from "@/lib/dates";
import { DeleteAssetButton } from "./MediaRow";

export const metadata = { title: "Media · Admin" };

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/media");
  if (session.user.role !== "admin") redirect("/admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const where = q
    ? or(
        ilike(blobAssets.key, `%${q}%`),
        ilike(blobAssets.alt, `%${q}%`),
        ilike(blobAssets.caption, `%${q}%`),
      )
    : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(blobAssets)
      .where(where as never)
      .orderBy(desc(blobAssets.uploadedAt))
      .limit(120),
    db.select({ n: sql<number>`count(*)::int` }).from(blobAssets),
  ]);
  const total = totalRow[0]?.n ?? 0;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Settings</span>
          <h1 className="mt-2 text-3xl">Media library</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Every uploaded image and PDF, most recent first. Delete only after
            clearing the asset from any editor that references it — Postgres
            blocks the delete otherwise.
          </p>
        </div>
        <span className="text-xs text-ink-3">{total} total assets</span>
      </header>

      <form role="search" className="mt-6 max-w-md">
        <label htmlFor="media-search" className="sr-only">
          Search media
        </label>
        <input
          id="media-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by key, alt text, caption…"
          className="form-input"
        />
      </form>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-rule bg-white p-12 text-center">
          <p className="font-serif text-lg font-bold text-navy">
            No assets {q ? `match "${q}"` : "yet"}.
          </p>
          <p className="mt-2 text-sm text-ink-3">
            Upload from any editor (events, ministries, staff, etc.) and they
            land here automatically.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const url = resolveAssetUrl(r.blobUrl);
            const isPdf = r.mimeType === "application/pdf";
            return (
              <li
                key={r.key}
                className="overflow-hidden rounded-lg border border-rule bg-white"
              >
                <div className="relative aspect-[4/3] bg-cream">
                  {isPdf ? (
                    <div className="grid h-full place-items-center text-ink-3">
                      <div className="text-center">
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="mx-auto"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <p className="mt-2 font-mono text-[11px]">PDF</p>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={url}
                      alt={r.alt ?? r.key}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="space-y-1 p-4 text-xs">
                  <p
                    className="truncate font-mono text-[11px] text-ink-3"
                    title={r.key}
                  >
                    {r.key}
                  </p>
                  <p className="text-ink-2">
                    {r.alt ?? <span className="italic text-ink-3">no alt text</span>}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-2 text-[11px] text-ink-3">
                    <span>
                      {r.width && r.height ? `${r.width}×${r.height}` : "—"}
                      {" · "}
                      {formatBytes(r.byteSize)}
                      {" · "}
                      {toDate(r.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <DeleteAssetButton assetKey={r.key} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
