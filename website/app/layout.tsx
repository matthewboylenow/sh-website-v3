import type { Metadata } from "next";
import { Libre_Baskerville, Libre_Franklin } from "next/font/google";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { assetUrl } from "@/lib/blob";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const [faviconUrl, appleTouchIconUrl] = await Promise.all([
    assetUrl(settings?.faviconBlobKey ?? null),
    assetUrl(settings?.appleTouchIconBlobKey ?? null),
  ]);
  // appleTouchIconUrl falls back to faviconUrl when not set so iOS still
  // gets a sized icon. /favicon.ico in app/ stays as the last-resort.
  const appleIcon = appleTouchIconUrl ?? faviconUrl;
  return {
    title: {
      default: "Saint Helen Parish",
      template: "%s · Saint Helen Parish",
    },
    description:
      "A Roman Catholic parish in Westfield, NJ. Mass times, livestream, ministries, events, and the weekly bulletin.",
    icons: faviconUrl
      ? {
          icon: faviconUrl,
          ...(appleIcon ? { apple: appleIcon } : {}),
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${libreBaskerville.variable} ${libreFranklin.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
