/**
 * USCCB readings fetch + scrape. Used by both the public-facing
 * /api/readings handler and the /mass Server Component (so the
 * page doesn't pay for a self-HTTP roundtrip).
 *
 * Best-effort regex scrape — if USCCB changes their markup, we
 * return `null` and consumers fall back to a "Read at USCCB.org"
 * link.
 */

export type Reading = {
  label: string;
  citation: string | null;
  preview: string | null;
};

export type ReadingsResult = {
  date: string;
  source: string;
  readings: Reading[] | null;
};

export async function fetchReadings(
  isoDate?: string,
): Promise<ReadingsResult> {
  const date = isoDate ?? todayInTz("America/New_York");
  const usccbDate = formatUsccbDate(date);
  const upstream = (
    process.env.READINGS_UPSTREAM ?? "https://bible.usccb.org/bible/readings"
  ).replace(/\/$/, "");
  const source = `${upstream}/${usccbDate}.cfm`;

  const html = await fetch(source, {
    next: { revalidate: 60 * 60 * 24, tags: ["readings"] },
    headers: { "User-Agent": "SaintHelenWebsite/3.0 (parish website)" },
  })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);

  const readings = html ? scrapeReadings(html) : null;
  return { date, source, readings };
}

export function todayInTz(tz: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function formatUsccbDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${mm}${dd}${yyyy!.slice(-2)}`;
}

function scrapeReadings(html: string): Reading[] | null {
  const labels = ["Reading 1", "Responsorial Psalm", "Reading 2", "Gospel"];
  const out: Reading[] = [];

  for (const label of labels) {
    const headRegex = new RegExp(
      `<h3[^>]*>\\s*${escapeRegex(label)}\\s*</h3>`,
      "i",
    );
    const headMatch = html.match(headRegex);
    if (!headMatch) continue;
    const after = html.slice(headMatch.index! + headMatch[0].length);

    const citeMatch = after.match(/<a[^>]*href="[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/i);
    const citation = citeMatch ? cleanText(citeMatch[1]!) : null;

    const pMatch = after.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const preview = pMatch ? cleanText(stripTags(pMatch[1]!)).slice(0, 240) : null;

    if (citation || preview) {
      out.push({ label: prettyLabel(label), citation, preview });
    }
  }

  return out.length > 0 ? out : null;
}

function prettyLabel(l: string): string {
  if (l === "Reading 1") return "First Reading";
  if (l === "Reading 2") return "Second Reading";
  return l;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function cleanText(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
