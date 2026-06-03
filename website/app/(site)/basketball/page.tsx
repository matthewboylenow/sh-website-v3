import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("basketball", "/basketball");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("basketball", { showMinistriesCrumb: false });
}
