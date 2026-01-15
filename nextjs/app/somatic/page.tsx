import Link from "next/link";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Somatic Practice - Nervous System Regulation & Energy Work",
  description: "Private somatic sessions and tantra massage for founders, creators, and seekers. Nervous system reset, deep repatterning, and conscious presence. Currently in Dubai, traveling to Athens and Lisbon.",
  ogType: "website",
  canonical: absoluteUrl("/somatic"),
});

export default function SomaticPage() {
  return (
    <>
      <JsonLd type="Organization" data={generateOrganizationSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Somatic Practice - Nervous System Regulation & Energy Work",
          description: "Private somatic sessions for founders and creators. Nervous system reset, tantra massage, and energy work.",
          url: "/somatic",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Somatic", url: "/somatic" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Somatic Practice
            </div>
            <h1>Nervous system regulation for people who lead, create, and need to feel again</h1>
            <p>
              Private tantra and somatic sessions for founders, artists, and seekers.
              Expect focused touch, energetic attunement, and a space built for deep
              rewiring.
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
              <Link className="btn secondary" href="/spirituality">
                Visit Atelier
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h3>Current Location</h3>
            <div className="tiles">
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Dubai</span>
                  <span className="tile-desc">January - February 2026</span>
                </div>
                <span className="badge spirit">Available</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Athens</span>
                  <span className="tile-desc">February - March 2026</span>
                </div>
                <span className="badge tech">Upcoming</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Lisbon</span>
                  <span className="tile-desc">March 2026 onwards</span>
                </div>
                <span className="badge tech">Upcoming</span>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: "0.9em" }}>
              Regular bases: Miami (Mar-Jun) & Ubud, Bali (Jun-Aug)
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>The Practice</h2>
            <span className="section-note">
              Somatic energy work grounded in lineage and formal training.
            </span>
          </div>
          <div className="cards-3 grid">
            <Link className="card card-with-actions" href="/somatic/approach">
              <h3>Approach</h3>
              <p>
                Boundaries-first somatic work. Consent is verbal, ongoing, and
                respected in every moment.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <span className="btn secondary sm">Learn more</span>
              </div>
            </Link>
            <Link className="card card-with-actions" href="/somatic/modalities">
              <h3>Modalities</h3>
              <p>
                Nervous system reset, tantra massage, and Kyo-tai immersion for
                different depths of work.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <span className="btn secondary sm">Explore</span>
              </div>
            </Link>
            <Link className="card card-with-actions" href="/somatic/training">
              <h3>Lineage & Training</h3>
              <p>
                Shambhavi Mahamudra, Kriya Yoga initiation, Tantra Massage
                certification, and embodied facilitation.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <span className="btn secondary sm">View</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Session Types</h2>
            <span className="section-note">
              Choose your depth. Each session is customized to your nervous
              system and intentions.
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Nervous System Reset (60 min)</h3>
              <p>
                Grounding bodywork to discharge stress, regulate your breath, and
                restore circulation. Ideal for first-timers or those needing a
                gentle return to presence.
              </p>
              <ul className="list" style={{ marginTop: 12 }}>
                <li>Guided down-regulation and breath</li>
                <li>Somatic release for shoulders, spine, and hips</li>
                <li>Closing integration + home ritual</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                <strong>90% of clients report better sleep same night</strong>
              </p>
            </div>
            <div className="card">
              <h3>Tantra Massage (120 min)</h3>
              <p>
                Energetic activation, conscious intimacy, and somatic
                re-patterning for those ready to open. Consent-led sensual
                mapping with energy channel work.
              </p>
              <ul className="list" style={{ marginTop: 12 }}>
                <li>Consent-led sensual mapping</li>
                <li>Energy channel work + breath pacing</li>
                <li>Post-session grounding tea + reflection</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                <strong>Deepens connection and self-awareness</strong>
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Kyo-Tai Immersion (120 min) — For facilitators and practitioners</h3>
            <p>
              Kyo means "shared/common" and tai means "body"—two bodies becoming
              one integrated system. Somatic unwinding, fascia melt, and
              contact-based Ki transmission for full-system rewiring.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong>
                Intense contact practice for those ready for forceful guidance,
                not gentle massage.
              </strong>
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>How Sessions Work</h2>
            <span className="section-note">
              Grounded, clear, and intentional. Nothing rushed, nothing left
              vague.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <div className="eyebrow">01</div>
              <h3>Arrival + Intention</h3>
              <p>
                We co-create a boundary map, tune your breath, and set an
                intention for the session. Expect clarity before touch.
              </p>
            </div>
            <div className="card">
              <div className="eyebrow">02</div>
              <h3>Deep Body + Energy</h3>
              <p>
                Somatic release meets subtle energy attunement. No choreography—
                every movement is guided by how your body responds.
              </p>
            </div>
            <div className="card">
              <div className="eyebrow">03</div>
              <h3>Integration</h3>
              <p>
                Re-ground with tea, reflection prompts, and a take-home practice.
                You leave regulated, present, and resourced.
              </p>
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
              <p>Fastest channel. Send your intention and preferred day/time.</p>
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
                  href="mailto:hello@maxpetrusenko.com?subject=Somatic%20session%20inquiry"
                  target="_blank"
                  rel="noopener"
                >
                  Email
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Questions First?</h3>
              <p>Ask anything before you book. Boundaries and pacing are set together.</p>
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
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h4>Is this suitable for first-timers?</h4>
              <p>
                Absolutely. We begin with breath, boundaries, and intention. The
                60-minute Reset is perfect to arrive in your body without
                overwhelm if you're new to somatic or tantra practices.
              </p>
            </div>
            <div className="card">
              <h4>How do you handle boundaries and consent?</h4>
              <p>
                We map what is welcomed and what is not before any touch. Consent
                is verbal, ongoing, and respected in every moment. You can pause
                or redirect anytime.
              </p>
            </div>
            <div className="card">
              <h4>What should I bring or prepare?</h4>
              <p>
                Wear loose clothing, arrive hydrated, and avoid heavy meals for
                2 hours beforehand. The studio is stocked with linens, oils, tea,
                and a private shower.
              </p>
            </div>
            <div className="card">
              <h4>Do you work with couples?</h4>
              <p>
                Yes, I facilitate couple tantra and energy sessions when
                intentions are aligned. We run a 15-minute pre-call to set
                agreements and comfort levels.
              </p>
            </div>
            <div className="card">
              <h4>Where are you currently located?</h4>
              <p>
                I'm currently in Dubai (Jan-Feb), moving to Athens (Feb-Mar),
                then Lisbon (Mar onwards). I also maintain regular bases in
                Miami and Ubud, Bali. Message to confirm current availability.
              </p>
            </div>
            <div className="card">
              <h4>Is tantra massage sexual?</h4>
              <p>
                No. Tantra massage in my practice is a somatic energy work and
                healing modality, not a sexual service. Sessions are non-sexual
                with clear boundaries.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
