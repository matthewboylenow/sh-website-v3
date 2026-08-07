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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
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
