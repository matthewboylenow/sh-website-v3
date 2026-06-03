import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("wwp", "/wwp");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("wwp", { showMinistriesCrumb: false });
}
