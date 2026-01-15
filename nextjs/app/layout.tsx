import { dmSans, cormorant, epilogue } from "@/lib/utils/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CloudflareAnalytics } from "@/components/analytics/CloudflareAnalytics";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema } from "@/lib/seo/structured-data";
import "@/styles/globals.css";

export const metadata = {
  title: {
    default: "Max Petrusenko | Presence & Product",
    template: "%s | Max Petrusenko",
  },
  description:
    "Tech builder and somatic practitioner. Explore portfolio, atelier, and mindfold work.",
  viewport: "width=device-width, initial-scale=1.0",
  colorScheme: "light",
  themeColor: "#f7f1e6",
  icons: {
    icon: "/favicon.png",
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
      <body className={dmSans.className}>
        <GoogleAnalytics />
        <CloudflareAnalytics />
        <JsonLd type="Person" data={generatePersonSchema()} />
        <Header />
        <main className="page">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
