import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("youth-ministry", "/youth-ministry");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("youth-ministry", { showMinistriesCrumb: false });
}
