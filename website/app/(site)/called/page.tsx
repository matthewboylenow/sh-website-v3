import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("called", "/called");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("called", { showMinistriesCrumb: false });
}
