import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return buildMinistryMetadata(slug, `/ministries/${slug}`);
}

export default async function MinistryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return renderMinistryPage(slug, { showMinistriesCrumb: true });
}
