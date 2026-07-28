import { permanentRedirect } from "next/navigation";

/**
 * Legacy /p/<slug> compatibility. CMS pages moved to root URLs
 * (July 2026, Matthew's call — "no /p"). Anything already shared or
 * bookmarked under /p/ lands on the canonical root URL; sacrament rows
 * keep their /sacraments/<name> home.
 */
export default async function LegacyPrefixedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug.startsWith("sacraments-")) {
    permanentRedirect(`/sacraments/${slug.slice("sacraments-".length)}`);
  }
  permanentRedirect(`/${slug}`);
}
