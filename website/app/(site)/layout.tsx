import { Footer } from "@/components/site/Footer";
import { GiveFab } from "@/components/site/GiveFab";
import { Header } from "@/components/site/Header";
import { ENABLE_GIVE_FAB } from "@/lib/flags";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      {ENABLE_GIVE_FAB && <GiveFab />}
    </>
  );
}
