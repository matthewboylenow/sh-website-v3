import {
  buildMinistryMetadata,
  renderMinistryPage,
} from "@/lib/ministry-route";

export const revalidate = 3600;

export async function generateMetadata() {
  return buildMinistryMetadata("young-adult-ministry", "/young-adult-ministry");
}

export default async function StandaloneMinistryPage() {
  return renderMinistryPage("young-adult-ministry", { showMinistriesCrumb: false });
}
