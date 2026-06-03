import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("pre-cana", "/pre-cana");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("pre-cana", { showMinistriesCrumb: false });
}
