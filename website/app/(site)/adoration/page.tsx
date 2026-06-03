import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("adoration", "/adoration");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("adoration", { showMinistriesCrumb: false });
}
