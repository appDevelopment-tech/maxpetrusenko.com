import { dmSans, cormorant, epilogue } from "@/lib/utils/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteHero } from "@/components/layout/RouteHero";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CloudflareAnalytics } from "@/components/analytics/CloudflareAnalytics";
import { ConciergeWidget } from "@/components/concierge/ConciergeWidget";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema } from "@/lib/seo/structured-data";
import "@/styles/globals.css";

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  colorScheme: "light",
  themeColor: "#f7f1e6",
};

export const metadata = {
  title: {
    default: "Max Petrusenko | Presence & Product",
    template: "%s | Max Petrusenko",
  },
  description:
    "Tech builder and somatic practitioner. Explore portfolio, atelier, and mindfold work.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
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
        <JsonLd type="Person" data={generatePersonSchema()} />
        <Header />
        <RouteHero />
        <main className="page">{children}</main>
        <Footer />
        <ConciergeWidget />
      </body>
    </html>
  );
}
