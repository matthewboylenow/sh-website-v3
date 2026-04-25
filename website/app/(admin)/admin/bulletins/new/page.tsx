import Link from "next/link";
import { BulletinForm } from "../BulletinForm";

export const metadata = { title: "New bulletin · Admin" };

function nextSundayISO(): string {
  const d = new Date();
  // Move forward to the upcoming Sunday (DOW 0). If today is Sunday,
  // use today.
  const dow = d.getDay();
  const offset = dow === 0 ? 0 : 7 - dow;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function NewBulletinPage() {
  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/bulletins" className="hover:text-rust-dark">
          Bulletins
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Upload</span>
      </nav>
      <h1 className="text-3xl">Upload a bulletin</h1>
      <p className="sh-lede mt-2 text-[15px]">
        One PDF per Sunday. Pick the date the bulletin covers — duplicate
        weeks are blocked at save.
      </p>
      <div className="mt-8">
        <BulletinForm
          mode="create"
          defaultValues={{
            weekOf: nextSundayISO(),
          }}
        />
      </div>
    </div>
  );
}
