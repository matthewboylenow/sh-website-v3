import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("vbs", "/vbs");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("vbs", { showMinistriesCrumb: false });
}
