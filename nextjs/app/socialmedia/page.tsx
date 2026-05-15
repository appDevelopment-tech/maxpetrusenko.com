import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/structured-data";
import { SocialDashboard } from "./SocialDashboard";

export const metadata = generateMetadata({
  title: "Social Media Dashboard",
  description:
    "Live dashboard showing Max Petrusenko's automated AI news posts across LinkedIn, Facebook, X, and Instagram.",
  ogType: "website",
  canonical: absoluteUrl("/socialmedia"),
});

export default function SocialMediaPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Social Media Dashboard",
          description: "Automated posting dashboard — AI news across platforms.",
          url: "/socialmedia",
        })}
      />      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Social Media", url: "/socialmedia" },
        ])}
      />

      {/* Hero */}
      <section className="dark-zone mt-8 py-16 px-4 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#121d2e_58%,#152438_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-tech)]">
            Live dashboard
          </p>
          <h1 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Automated social posting
          </h1>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            AI-curated news posted to TikTok, X, LinkedIn, Reddit, Facebook, Instagram
            &amp; more — powered by automated video generation and cross-platform scheduling.
          </p>
        </div>
      </section>

      {/* Dashboard */}
      <section className="px-4 py-16 md:py-20">
        <div className="container">
          <SocialDashboard />
        </div>
      </section>
    </>
  );
}
