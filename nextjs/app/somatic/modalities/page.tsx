import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Modalities - Nervous System Reset",
  description: "Session type: 60-min nervous system reset. Private somatic sessions customized to your needs.",
  ogType: "website",
  canonical: absoluteUrl("/somatic/modalities"),
});

export default function ModalitiesPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Modalities - Nervous System Reset",
          description: "Session type: nervous system reset.",
          url: "/somatic/modalities",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Somatic", url: "/somatic" },
          { name: "Modalities", url: "/somatic/modalities" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <Link href="/somatic">← Somatic</Link>
            </div>
            <h1 className="clip-reveal clip-reveal-d1">Session Modalities</h1>
            <p>
              Grounding bodywork customized to your nervous system and
              intentions. Choose based on what you're ready for.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Session Types</h2>
          </div>

          {/* Nervous System Reset */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3>Nervous System Reset</h3>
                <p style={{ color: "var(--accent)", fontWeight: 500 }}>
                  60 minutes • Grounding entry point
                </p>
              </div>
              <a
                className="btn primary sm"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20nervous%20system%20work."
                target="_blank"
                rel="noopener"
              >
                Join inquiry list
              </a>
            </div>
            <p style={{ marginTop: 12 }}>
              Grounding bodywork to discharge stress, regulate your breath, and
              restore circulation. Ideal for first-timers or those needing a
              gentle return to presence.
            </p>
            <div style={{ marginTop: 16 }}>
              <h4>What's included:</h4>
              <ul className="list" style={{ marginTop: 8, marginLeft: 20 }}>
                <li>Guided down-regulation and breathwork</li>
                <li>Somatic release for shoulders, spine, and hips</li>
                <li>Closing integration + home ritual</li>
              </ul>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
              <strong>Outcome:</strong> 90% of clients report better sleep the
              same night
            </div>
          </div>

        </section>

        <section className="section">
          <div className="section-head">
            <h2>Choosing Your Modality</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Choose Reset if...</h3>
              <ul className="list" style={{ marginTop: 12, marginLeft: 20 }}>
                <li>You're new to somatic work</li>
                <li>You're experiencing stress or burnout</li>
                <li>You want better sleep and regulation</li>
                <li>You prefer a gentler entry point</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link className="btn secondary" href="/somatic/approach">
              Read About Approach
            </Link>
            <a
              className="btn primary"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20which%20session%20type%20do%20you%20recommend%20for%20____%3F"
              target="_blank"
              rel="noopener"
            >
              Ask for Recommendation
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
