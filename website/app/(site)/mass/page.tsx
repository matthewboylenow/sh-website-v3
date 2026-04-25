import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { SectionHead } from "@/components/site/SectionHead";
import { DayPicker, type WeekDay } from "@/components/mass/DayPicker";
import { getWeeklyMassTimes } from "@/lib/queries/mass-times.query";

export const metadata = {
  title: "Mass & Livestream",
  description:
    "Pick a day and see every Mass offered that day, who's presiding, and the weekly schedule. Sunday Masses are livestreamed.",
};

export const revalidate = 3600;

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DOW_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function buildWeek(
  weekly: Awaited<ReturnType<typeof getWeeklyMassTimes>>,
): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const times = weekly
      .filter((row) => row.dayOfWeek === dow)
      .map((row) => ({
        id: row.id,
        time: row.time,
        label: row.label,
        kind: row.kind,
        liveStreamUrl: row.liveStreamUrl,
        presider: row.presider?.id ? row.presider : null,
      }));
    const isToday = i === 0;
    return {
      dayOfWeek: dow,
      date: d.toISOString().slice(0, 10),
      title: `${DOW_LONG[dow]}, ${d.toLocaleString("en-US", { month: "long" })} ${d.getDate()}${isToday ? " · Today" : ""}`,
      shortLabel: isToday ? `${DOW_SHORT[dow]} · Today` : DOW_SHORT[dow],
      dayNum: String(d.getDate()),
      isToday,
      times,
    };
  });
}

export default async function MassPage() {
  const weekly = await getWeeklyMassTimes();
  const week = buildWeek(weekly);

  const vigil = weekly.filter((m) => m.kind === "vigil");
  const sunday = weekly.filter((m) => m.kind === "sunday");
  const daily = weekly.filter((m) => m.kind === "daily");

  return (
    <>
      <InteriorHero
        eyebrow="Worship at Saint Helen"
        title="Mass & livestream."
        lede="Pick a day and we'll show you every Mass offered that day, who's presiding, and the readings. Sunday Masses are livestreamed via Subsplash; replays stay up for the week."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Worship" },
          { label: "Mass schedule" },
        ]}
        photoLabel="Sanctuary during Mass"
        photoBrief="Elevation of the Eucharist · candlelight, shallow depth."
        photoTone="warm"
      />

      {/* ---- Pick a day -------------------------------------------- */}
      <section className="py-20">
        <Container width="wide">
          <SectionHead eyebrow="Pick a day" title="This week's schedule" />

          <div className="mt-10 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
            <DayPicker week={week} />

            {/* Readings card — real USCCB proxy lands in Step 6 */}
            <div className="rounded-lg bg-navy p-8 text-white">
              <span className="sh-eyebrow text-gold">Today&rsquo;s readings</span>
              <h3 className="mt-2 text-white">Daily readings</h3>
              <p className="mt-4 text-white/80">
                Live readings from the USCCB Lectionary will appear here once
                the <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">/api/readings</code>{" "}
                Edge proxy is wired in Step 6. For now this is a placeholder so
                the page shape is correct.
              </p>
              <a
                href="https://bible.usccb.org/readings"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
              >
                Read at USCCB.org <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          {/* Livestream slot — waiting for the Subsplash embed code */}
          <div className="mt-14 flex flex-wrap items-center gap-5 rounded-lg bg-cream p-6 sm:gap-6">
            <div className="grid size-12 place-items-center rounded-full bg-rust text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-serif text-base font-bold text-navy">
                Sunday livestream replay
              </div>
              <div className="text-xs text-ink-3">
                Subsplash embed lands in Step 8 — Matthew will supply the widget.
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- Weekly rhythm ---------------------------------------- */}
      <section className="bg-cream py-20">
        <Container width="wide">
          <SectionHead eyebrow="Weekend rhythm" title="Weekly Mass schedule" />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <MassGroup title="Saturday Vigil" entries={vigil} />
            <MassGroup title="Sunday" entries={sunday} />
            <MassGroup title="Weekday (Mon–Fri)" entries={daily} />
          </div>
        </Container>
      </section>
    </>
  );
}

function MassGroup({
  title,
  entries,
}: {
  title: string;
  entries: Awaited<ReturnType<typeof getWeeklyMassTimes>>;
}) {
  return (
    <div>
      <h3 className="font-serif text-lg font-bold text-navy">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">No services scheduled.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((m) => (
            <li
              key={m.id}
              className="flex items-baseline justify-between rounded-md bg-white px-4 py-3"
            >
              <span className="font-serif text-lg font-bold text-navy">
                {formatTime(m.time)}
              </span>
              <span className="text-sm text-ink-2">
                {m.label ?? (m.kind === "vigil" ? "Vigil" : m.kind === "sunday" ? "Sunday" : "Weekday")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0
    ? `${h12}:00 ${period}`
    : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
