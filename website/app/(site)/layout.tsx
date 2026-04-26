import {
  prepareAnnouncementBody,
  SiteAnnouncement,
} from "@/components/site/Announcement";
import { Footer } from "@/components/site/Footer";
import { GiveFab } from "@/components/site/GiveFab";
import { Header } from "@/components/site/Header";
import { assetUrl } from "@/lib/blob";
import { ENABLE_GIVE_FAB } from "@/lib/flags";
import { getActiveAnnouncement } from "@/lib/queries/announcements.query";
import { getSiteSettings } from "@/lib/queries/site-settings.query";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, announcement] = await Promise.all([
    getSiteSettings(),
    getActiveAnnouncement(),
  ]);
  const [logoUrl, announcementImageUrl] = await Promise.all([
    assetUrl(settings?.logoBlobKey),
    assetUrl(announcement?.imageBlobKey),
  ]);

  return (
    <>
      <Header
        nav={settings?.nav}
        logoUrl={logoUrl}
        logoAlt={settings?.logoAlt ?? "Saint Helen"}
      />
      <main id="main">{children}</main>
      <Footer
        copy={settings?.footerCopy}
        bottomBarHtml={settings?.bottomBarHtml}
      />
      {ENABLE_GIVE_FAB && <GiveFab />}
      {announcement && (
        <SiteAnnouncement
          data={announcement}
          imageUrl={announcementImageUrl}
          bodyHtml={prepareAnnouncementBody(announcement.body)}
        />
      )}
    </>
  );
}
