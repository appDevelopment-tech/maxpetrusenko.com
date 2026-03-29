import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Approach - Boundaries-First Somatic Work",
  description: "My approach to somatic energy work: consent-led, boundaries-first, nervous system-focused. Private sessions customized to your needs.",
  ogType: "website",
  canonical: absoluteUrl("/somatic/approach"),
});

export default function ApproachPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Approach - Boundaries-First Somatic Work",
          description: "My approach to somatic energy work: consent-led, boundaries-first, nervous system-focused.",
          url: "/somatic/approach",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Somatic", url: "/somatic" },
          { name: "Approach", url: "/somatic/approach" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <Link href="/somatic">← Somatic</Link>
            </div>
            <h1 className="clip-reveal clip-reveal-d1">Boundaries-First Approach</h1>
            <p>
              Consent-led somatic work. Every session begins with clarity about
              what is welcomed and what is not. Your nervous system sets the
              pace—not me.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Core Principles</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Consent is Verbal</h3>
              <p>
                We map boundaries before any touch begins. Consent is ongoing—
                you can pause or redirect at any moment. No implicit agreements,
                no assumptions.
              </p>
            </div>
            <div className="card">
              <h3>Nervous System Leads</h3>
              <p>
                Your body determines the depth and pace. I watch for signs of
                regulation and dysregulation. We go as deep as your system can
                integrate, not beyond.
              </p>
            </div>
            <div className="card">
              <h3>Safety Through Structure</h3>
              <p>
                Clear agreements create the safety needed for deep work. You'll
                always know what's coming, what's expected, and what's yours to
                choose.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>What to Expect in a Session</h2>
          </div>
          <div className="card">
            <h3>Session Structure</h3>
            <ol className="list" style={{ marginTop: 12, marginLeft: 20 }}>
              <li>
                <strong>Arrival (10 min):</strong> Grounding breath, boundary
                mapping, intention setting. No touch until we're clear on what's
                welcomed.
              </li>
              <li>
                <strong>Check-in (5 min):</strong> Verbal confirmation before
                we begin. You say yes, no, or maybe to each area of work.
              </li>
              <li>
                <strong>Bodywork (60-90 min):</strong> Somatic release, energy
                attunement, conscious touch. I check in regularly. You can pause
                anytime.
              </li>
              <li>
                <strong>Integration (15 min):</strong> Tea, reflection, and
                grounding. We discuss what emerged and what you're taking home.
              </li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>What This Is Not</h2>
          </div>
          <div className="split">
            <div className="card">
              <h3>Not spa massage</h3>
              <p>
                This isn't relaxation for relaxation's sake. The work is
                focused, sometimes intense, and always oriented toward your
                intention for transformation.
              </p>
            </div>
            <div className="card">
              <h3>Not therapy</h3>
              <p>
                Somatic work can be therapeutic, but this is not talk therapy or
                clinical treatment. We work through the body, not through
                cognitive processing.
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Not sexual service</h3>
            <p>
              Tantra massage in my practice is a somatic energy work and healing
              modality. Sessions are non-sexual with clear boundaries. I do not
              initiate or respond to sexual behavior. The focus is on nervous
              system regulation and conscious presence.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Who This Work Is For</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Founders & Leaders</h3>
              <p>
                People who carry significant responsibility and need a structured
                way to discharge stress and reconnect with their bodies.
              </p>
            </div>
            <div className="card">
              <h3>Creators & Artists</h3>
              <p>
                Those whose work requires deep sensitivity and presence, who want
                to clear blocks to creative and emotional flow.
              </p>
            </div>
            <div className="card">
              <h3>Seekers on a Path</h3>
              <p>
                People engaged in spiritual or self-development work who want
                somatic support for their journey.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <a
              className="btn primary"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
              target="_blank"
              rel="noopener"
            >
              Book a Session
            </a>
            <Link className="btn secondary" href="/somatic">
              Back to Somatic
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
