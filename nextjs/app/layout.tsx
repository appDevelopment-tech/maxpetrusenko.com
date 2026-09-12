import { dmSans, cormorant, epilogue } from "@/lib/utils/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteHero } from "@/components/layout/RouteHero";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CloudflareAnalytics } from "@/components/analytics/CloudflareAnalytics";
import { EngagementTracker } from "@/components/analytics/EngagementTracker";
import { ConciergeWidget } from "@/components/concierge/ConciergeWidget";
import { JsonLd } from "@/components/seo/JsonLd";
import Script from "next/script";
import { generatePersonSchema } from "@/lib/seo/structured-data";
import { siteConfig } from "@/config/site";
import "@/styles/globals.css";

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  colorScheme: "light",
  themeColor: "#f7f1e6",
};

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Max Petrusenko | Presence & Product",
    template: "%s | Max Petrusenko",
  },
  description:
    "Two practices. Choose your path. Tech automation and somatic energy work.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${dmSans.variable} ${cormorant.variable} ${epilogue.variable}`}
      lang="en"
    >
      <body className={dmSans.className} suppressHydrationWarning>
        <GoogleAnalytics />
        <CloudflareAnalytics />
        <EngagementTracker />
        <JsonLd type="Person" data={generatePersonSchema()} />
        <Header />
        <RouteHero />
        <main className="page">{children}</main>
        <Footer />
        <Script
          src="https://news.google.com/swg/js/v1/publisher.js"
          strategy="afterInteractive"
        />
        <ConciergeWidget />
      </body>
    </html>
  );
}
