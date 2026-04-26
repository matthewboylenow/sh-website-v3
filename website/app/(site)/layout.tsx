import { Footer } from "@/components/site/Footer";
import { GiveFab } from "@/components/site/GiveFab";
import { Header } from "@/components/site/Header";
import { ENABLE_GIVE_FAB } from "@/lib/flags";
import { getSiteSettings } from "@/lib/queries/site-settings.query";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  return (
    <>
      <Header nav={settings?.nav} />
      <main id="main">{children}</main>
      <Footer />
      {ENABLE_GIVE_FAB && <GiveFab />}
    </>
  );
}
