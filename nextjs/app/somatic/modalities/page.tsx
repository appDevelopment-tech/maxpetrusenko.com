import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Modalities - Nervous System Reset, Tantra Massage, Kyo-Tai",
  description: "Session types: 60-min nervous system reset, 120-min tantra massage, and 120-min Kyo-tai immersion. Private somatic sessions customized to your needs.",
  ogType: "website",
  canonical: absoluteUrl("/somatic/modalities"),
});

export default function ModalitiesPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Modalities - Nervous System Reset, Tantra Massage, Kyo-Tai",
          description: "Session types: nervous system reset, tantra massage, and Kyo-tai immersion.",
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
            <h1>Session Modalities</h1>
            <p>
              Three depths of work, each customized to your nervous system and
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
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20Nervous%20System%20Reset.%20Preferred%20day%2Ftime%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Book Reset
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

          {/* Tantra Massage */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3>Tantra Massage</h3>
                <p style={{ color: "var(--accent)", fontWeight: 500 }}>
                  120 minutes • Energetic activation and opening
                </p>
              </div>
              <a
                className="btn primary sm"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20Tantra%20Massage.%20Preferred%20day%2Ftime%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Book Tantra
              </a>
            </div>
            <p style={{ marginTop: 12 }}>
              Energetic activation, conscious intimacy, and somatic repatterning
              for those ready to open. Consent-led sensual mapping with energy
              channel work and breath pacing.
            </p>
            <div style={{ marginTop: 16 }}>
              <h4>What's included:</h4>
              <ul className="list" style={{ marginTop: 8, marginLeft: 20 }}>
                <li>Consent-led sensual mapping</li>
                <li>Energy channel work + breath pacing</li>
                <li>Post-session grounding tea + reflection</li>
              </ul>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
              <strong>Outcome:</strong> Deepens connection and self-awareness
            </div>
          </div>

          {/* Kyo-Tai Immersion */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3>Kyo-Tai Immersion</h3>
                <p style={{ color: "var(--accent)", fontWeight: 500 }}>
                  120 minutes • For facilitators and practitioners
                </p>
              </div>
              <a
                className="btn primary sm"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20Kyo-Tai%20immersion.%20Preferred%20day%2Ftime%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Inquire
              </a>
            </div>
            <p style={{ marginTop: 12 }}>
              Kyo means "shared/common" and tai means "body"—two bodies becoming
              one integrated system. Evokes the deep physical and energetic
              merging that occurs during contact movement.
            </p>
            <div style={{ marginTop: 16 }}>
              <h4>What's included:</h4>
              <ul className="list" style={{ marginTop: 8, marginLeft: 20 }}>
                <li>Somatic unwinding + fascia melt</li>
                <li>Contact-based Ki transmission for full-system rewiring</li>
                <li>Guided practice to carry forward and pass on awareness</li>
              </ul>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
              <strong>For:</strong> Facilitators and those who treat this as a
              craft, ready for forceful guidance rather than gentle massage
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
                <li>You're new to somatic or tantra work</li>
                <li>You're experiencing stress or burnout</li>
                <li>You want better sleep and regulation</li>
                <li>You prefer a gentler entry point</li>
              </ul>
            </div>
            <div className="card">
              <h3>Choose Tantra if...</h3>
              <ul className="list" style={{ marginTop: 12, marginLeft: 20 }}>
                <li>You want deeper energetic and emotional opening</li>
                <li>You're comfortable with conscious touch</li>
                <li>You want to explore presence and intimacy</li>
                <li>You've done somatic work before</li>
              </ul>
            </div>
            <div className="card">
              <h3>Choose Kyo-Tai if...</h3>
              <ul className="list" style={{ marginTop: 12, marginLeft: 20 }}>
                <li>You're a practitioner or facilitator</li>
                <li>You're ready for intense, forceful work</li>
                <li>You want to experience shared-body contact</li>
                <li>You've done significant somatic work</li>
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
