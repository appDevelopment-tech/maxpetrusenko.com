import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Lineage & Training - Somatic Practice Background",
  description: "My training and lineage in somatic and energy work: Shambhavi Mahamudra, Kriya Yoga initiation, Tantra Massage certification, and embodied facilitation.",
  ogType: "website",
  canonical: absoluteUrl("/somatic/training"),
});

export default function TrainingPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Lineage & Training - Somatic Practice Background",
          description: "Training and lineage in somatic and energy work: Shambhavi Mahamudra, Kriya Yoga, Tantra Massage certification.",
          url: "/somatic/training",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Somatic", url: "/somatic" },
          { name: "Training", url: "/somatic/training" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <Link href="/somatic">← Somatic</Link>
            </div>
            <h1 className="clip-reveal clip-reveal-d1">Lineage & Training</h1>
            <p>
              How I ground the work: formal initiations, embodied practice, and
              ongoing study. The somatic work I offer is informed by years of
              personal practice and formal training.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Formal Training & Certifications</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Shambhavi Mahamudra</h3>
              <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}>
                Sadhguru / Isha Foundation
              </p>
              <p style={{ marginTop: 12 }}>
                Completed Shambhavi Mahamudra practice. Breath, kriya, and
                meditative depth inform the pace and presence of sessions.
              </p>
            </div>
            <div className="card">
              <h3>Kriya Yoga Initiation</h3>
              <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}>
                Paramahansa Yogananda lineage
              </p>
              <p style={{ marginTop: 12 }}>
                Kriya initiation informs the nervous system work, stability, and
                energetic hygiene in every session.
              </p>
            </div>
            <div className="card">
              <h3>Tantra Nectar University Certification</h3>
              <p style={{ fontSize: "0.9em", color: "var(--text-secondary)" }}>
                Satyarti / Tantra Nectar University
              </p>
              <p style={{ marginTop: 12 }}>
                Bodywork precision, boundaries-first touch, and safe expansion
                inside clear containers.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Embodied Practice</h2>
            <span className="section-note">
              Training is ongoing. The work I offer comes from lived practice,
              not just study.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Amenti Dance Workshops</h3>
              <p>
                Movement labs for "intro into movement" and "layers"—somatic
                listening, rhythm, and contact skills that translate into session
                flow.
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
              <h3>Integration Practice</h3>
              <p>
                Post-session guidance on breath, daily anchors, and movement cues
                to keep the nervous system regulated after the work.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Experience & Track Record</h2>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="tiles" style={{ marginBottom: 12 }}>
              <div className="tile">
                <span className="tile-title">217+</span>
                <span className="tile-desc">Transformations facilitated</span>
              </div>
              <div className="tile">
                <span className="tile-title">4.9/5</span>
                <span className="tile-desc">Average client sentiment</span>
              </div>
              <div className="tile">
                <span className="tile-title">100%</span>
                <span className="tile-desc">1:1 sessions, no assistants</span>
              </div>
            </div>
            <p>
              Every session is facilitated directly by me. I don't use assistants
              or trainees—when you book, you get my full presence and expertise.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>How Training Informs Sessions</h2>
          </div>
          <div className="split">
            <div className="card">
              <h3>Energetic Hygiene</h3>
              <p>
                Kriya discipline and daily practice maintain clear boundaries and
                prevent energetic transfer between sessions.
              </p>
            </div>
            <div className="card">
              <h3>Presence Over Technique</h3>
              <p>
                Formal practice cultivates the stillness needed to read your
                nervous system accurately and respond in the moment.
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Integration Focus</h3>
            <p>
              The work doesn't end when the session does. Training in embodiment
              and integration means I can guide you to carry the practice
              forward—home rituals, breathwork, and daily anchors to sustain
              nervous system regulation.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Ongoing Study</h2>
          </div>
          <div className="card">
            <p>
              I continue to study and practice. Somatic work is not a
              certification—it's a lifelong path. My current focus includes
              nervous system regulation in high-stress founders, trauma-informed
              touch, and the intersection of tantra and creative practice.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link className="btn secondary" href="/somatic">
              Back to Somatic
            </Link>
            <a
              className="btn primary"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____."
              target="_blank"
              rel="noopener"
            >
              Join inquiry list
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
