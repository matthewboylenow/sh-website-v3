import Link from "next/link";
import { SeasonalBannerForm } from "../SeasonalBannerForm";

export const metadata = { title: "New banner · Admin" };

export default function NewBannerPage() {
  // Default to a 2-week window starting tomorrow.
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  end.setHours(20, 0, 0, 0);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/seasonal-banners" className="hover:text-rust-dark">
          Seasonal banners
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="text-3xl">New seasonal banner</h1>
      <div className="mt-8">
        <SeasonalBannerForm
          mode="create"
          defaultValues={{ startsAt: start, endsAt: end, isActive: true }}
        />
      </div>
    </div>
  );
}
