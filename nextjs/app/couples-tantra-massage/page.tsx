import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Couples Tantra Massage",
  description:
    "Couples tantra and somatic sessions with boundaries first. Shared intention, guided pacing, and WhatsApp booking.",
  ogType: "website",
  canonical: absoluteUrl("/couples-tantra-massage"),
});

export default function CouplesTantraMassagePage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Couples Tantra Massage",
          description:
            "Couples tantra and somatic sessions with boundaries first. Shared intention, guided pacing, and WhatsApp booking.",
          url: "/couples-tantra-massage",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Couples Tantra Massage", url: "/couples-tantra-massage" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">Couples</div>
            <h1 className="clip-reveal clip-reveal-d1">Couples tantra massage</h1>
            <p>
              Couples sessions are available for partners who want more presence,
              clearer communication, and a shared somatic experience with
              boundaries set together.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20we%27re%20interested%20in%20a%20couples%20tantra%20session.%20Our%20intention%20is%20____."
                target="_blank"
                rel="noopener"
              >
                Text for availability
              </a>
              <Link className="btn secondary" href="/spirituality">
                Open spirituality
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="cards-3 grid">
            <div className="card">
              <h3>How it starts</h3>
              <p>
                Shared intention first, then a clear agreement around pacing,
                boundaries, and what each partner wants from the session.
              </p>
            </div>
            <div className="card">
              <h3>What it supports</h3>
              <p>
                Connection, trust, nervous-system regulation, and more honest
                communication through guided somatic practice.
              </p>
            </div>
            <div className="card">
              <h3>Best next step</h3>
              <p>
                Send your intention and preferred timing on WhatsApp. That is the
                fastest path for alignment and availability.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
