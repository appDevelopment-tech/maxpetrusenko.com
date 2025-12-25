import Link from "next/link";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Spirituality",
  description: "Presence Atelier and Mindfold—private tantra, somatic energy work, and sensory journeys.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality"),
});

export default function SpiritualityPage() {
  return (
    <>
      <JsonLd type="Organization" data={generateOrganizationSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Spirituality - Presence Atelier",
          description: "Private tantra and somatic sessions in Ubud. Nervous system regulation, deep rewiring, and conscious presence.",
          url: "/spirituality",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Spirituality", url: "/spirituality" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Presence Atelier
            </div>
            <h1>Somatic energy work with boundaries first</h1>
            <p>
              Private tantra and somatic sessions in Ubud. Nervous system
              regulation, deep rewiring, and conscious presence. Limited weekly
              spots.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Book via WhatsApp
              </a>
              <a
                className="btn secondary"
                href={siteConfig.externalLinks.atelier}
                target="_blank"
                rel="noopener"
              >
                View Atelier Site
              </a>
            </div>
            <div className="hero-cta-note">
              First-timers welcome. Consent and pacing are set together.
            </div>
          </div>

          <div className="hero-card">
            <h3>Offerings</h3>
            <div className="tiles">
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Nervous System Reset</span>
                  <span className="tile-desc">90-minute session to arrive safely.</span>
                </div>
                <span className="badge spirit">Book</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Deep Repatterning</span>
                  <span className="tile-desc">Longer arc for deep rewiring.</span>
                </div>
                <span className="badge spirit">Inquire</span>
              </div>
              <Link className="tile" href="/mindfold/events">
                <div className="tile-meta">
                  <span className="tile-title">Mindfold Journeys</span>
                  <span className="tile-desc">
                    Sensory subtraction to expand perception.
                  </span>
                </div>
                <span className="badge mindfold">Explore</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Booking</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>WhatsApp</h3>
              <p>
                Fastest channel. Send your intention and preferred day/time.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn primary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Message
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Email</h3>
              <p>Prefer email? Share your availability and intentions.</p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="mailto:hello@maxpetrusenko.com?subject=Atelier%20inquiry"
                  target="_blank"
                  rel="noopener"
                >
                  Email
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Questions</h3>
              <p>
                Ask anything before you book; boundaries and pacing are set
                together.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20quick%20question%20before%20booking%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Text on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Lineage & training</h2>
            <span className="section-note">
              How I ground the work: formal initiations and embodied practice.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Shambhavi Mahamudra</h3>
              <p>
                Sadhguru / Isha: completed Shambhavi Mahamudra practice. Breath,
                kriya, and meditative depth inform the pace and presence of
                sessions.
              </p>
            </div>
            <div className="card">
              <h3>Kriya Yoga Initiation</h3>
              <p>
                Paramahansa Yogananda lineage: Kriya initiation informs the
                nervous system work, stability, and energetic hygiene in every
                session.
              </p>
            </div>
            <div className="card">
              <h3>Tantra Massage Certification</h3>
              <p>
                Satyarti workshops and certificates: bodywork precision,
                boundaries-first touch, and safe expansion inside clear
                containers.
              </p>
            </div>
          </div>
          <div className="cards-3 grid" style={{ marginTop: 14 }}>
            <div className="card">
              <h3>Amenti Dance Workshops</h3>
              <p>
                Movement labs for &quot;intro into movemeant&quot; and
                &quot;layers&quot;—somatic listening, rhythm, and contact skills
                that translate into session flow.
              </p>
            </div>
            <div className="card">
              <h3>Embodied Facilitation</h3>
              <p>
                Group and 1:1 formats; informed by silent practice, kriya
                discipline, and consent-forward facilitation.
              </p>
            </div>
            <div className="card">
              <h3>Integration</h3>
              <p>
                Post-session guidance on breath, daily anchors, and movement
                cues to keep the nervous system regulated after the work.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Guides & FAQs</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Boundaries First</h3>
              <p>
                Consent is verbal, ongoing, and respected. You can pause or
                redirect anytime.
              </p>
            </div>
            <div className="card">
              <h3>Preparation</h3>
              <p>
                Loose clothing, hydrated, light meals. Studio stocked with
                linens, oils, tea, shower.
              </p>
            </div>
            <div className="card">
              <h3>For Couples</h3>
              <p>
                Available by alignment; we set agreements together in a
                pre-call.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
