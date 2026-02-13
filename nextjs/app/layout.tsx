import { dmSans, cormorant, epilogue } from "@/lib/utils/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CloudflareAnalytics } from "@/components/analytics/CloudflareAnalytics";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema, generateEnhancedPersonSchema, generateServiceSpeakableSchema } from "@/lib/seo/structured-data";
import "@/styles/globals.css";

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  colorScheme: "light",
  themeColor: "#f7f1e6",
};

export const metadata = {
  metadataBase: new URL("https://www.maxpetrusenko.com"),
  title: {
    default: "Max Petrusenko | Presence & Product",
    template: "%s | Max Petrusenko",
  },
  description:
    "Two practices. Choose your path. Tech automation and somatic energy work.",
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
        <JsonLd type="Person" data={generateEnhancedPersonSchema()} />
        <Header />
        <main className="page">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
