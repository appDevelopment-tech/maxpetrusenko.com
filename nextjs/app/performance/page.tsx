import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Performance - Regulation, Energy & Sustainability for Builders",
  description: "Where tech and somatic practice meet: nervous system regulation, energy management, and sustainable performance for founders, creators, and builders.",
  ogType: "website",
  canonical: absoluteUrl("/performance"),
});

export default function PerformancePage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Performance - Regulation, Energy & Sustainability for Builders",
          description: "Where tech and somatic practice meet: nervous system regulation and energy management for founders.",
          url: "/performance",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Performance", url: "/performance" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> The Bridge
            </div>
            <h1 className="clip-reveal clip-reveal-d1">Performance without Burnout</h1>
            <p>
              Where tech and somatic practice meet. Regulation, energy
              management, and sustainable performance for founders, creators,
              and builders who want to ship at a high level without burning out.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/tech">
                Tech Work
              </Link>
              <Link className="btn secondary" href="/somatic">
                Somatic Practice
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h3>The Thesis</h3>
            <p style={{ marginBottom: 12 }}>
              High performers treat their bodies like machines—push harder, grind
              longer, optimize for output. This works until it doesn't.
            </p>
            <p>
              Sustainable performance comes from regulation, not acceleration.
              The same nervous system skills that enable deep somatic work also
              enable sustainable high-performance building.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>The Problem: High Performance, High Cost</h2>
          </div>
          <div className="split">
            <div className="card">
              <h3>Founder Physiology</h3>
              <p>
                Founders work longer hours, sleep less, and carry more cortisol
                than almost any other group. The body keeps score.
              </p>
              <ul className="list" style={{ marginTop: 12 }}>
                <li>Chronic fight-or-flight activation</li>
                <li>Sleep disruption and insomnia</li>
                <li>Emotional dysregulation</li>
                <li>Decision fatigue</li>
                <li>Numbing behaviors (doomscrolling, substances, overwork)</li>
              </ul>
            </div>
            <div className="card">
              <h3>The Hidden Cost</h3>
              <p>
                You can't cheat physiology. The body adapts to stress, then
                breaks. High performance on a burning platform isn't
                sustainable—it's just delayed collapse.
              </p>
              <p style={{ marginTop: 12 }}>
                <em>
                  Most performance optimization focuses on output—systems,
                  automation, delegation. Few address the capacity for output:
                  nervous system regulation.
                </em>
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>The Bridge: Somatic Skills for Builders</h2>
            <span className="section-note">
              Practices that translate directly to sustainable performance.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Down-Regulation on Demand</h3>
              <p>
                The ability to shift from activation to rest voluntarily. Not
                "relax when you're done"—shift states mid-workday without
                losing momentum.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Practice:</strong> 5-minute breath reset between deep
                work sessions.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Outcome:</strong> Sustained focus without cortisol
                accumulation.
              </p>
            </div>
            <div className="card">
              <h3>Embodied Decision-Making</h3>
              <p>
                Founders make hundreds of decisions daily. Most are made from
                activation—fight-or-flight clarity that isn't actually clear.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Practice:</strong> Somatic check-in before significant
                decisions.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Outcome:</strong> Fewer regret decisions, less second-
                guessing.
              </p>
            </div>
            <div className="card">
              <h3>Energy Budgeting</h3>
              <p>
                Treat energy like capital. You have finite capacity—spend it on
                high-leverage work, not low-grade activation.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Practice:</strong> Track energy expenditure, not just
                time.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Outcome:</strong> Work on what matters, stop grinding on
                what doesn't.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Practices & Protocols</h2>
            <span className="section-note">
              Concrete things to do. Not theory—practice.
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Daily Reset Protocol</h3>
              <p>
                A 10-minute midday practice that resets your nervous system and
                clears accumulated activation. Done consistently, it changes
                your baseline.
              </p>
              <ol className="list" style={{ marginTop: 12, marginLeft: 20 }}>
                <li>Find a quiet space (even a bathroom stall works)</li>
                <li>2 minutes: Box breathing (4-4-4-4)</li>
                <li>3 minutes: Body scan for tension</li>
                <li>3 minutes: Release through gentle movement</li>
                <li>2 minutes: Ground before returning</li>
              </ol>
            </div>
            <div className="card">
              <h3>Pre-Deep Work Somatic Prep</h3>
              <p>
                Enter deep work from regulation, not activation. The quality of
                your input determines the quality of your output.
              </p>
              <ol className="list" style={{ marginTop: 12, marginLeft: 20 }}>
                <li>Set intention: What specifically am I doing?</li>
                <li>Check in: Where's my nervous system right now?</li>
                <li>If activated: 3-minute down-regulation first</li>
                <li>Begin work from calm, not wired</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Working Together</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>1:1 Somatic Coaching</h3>
              <p>
                Weekly sessions to build your regulation toolkit. We track your
                nervous system baseline and watch it shift over time.
              </p>
              <p style={{ marginTop: 12 }}>
                <a
                  className="btn secondary sm"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20somatic%20coaching."
                  target="_blank"
                  rel="noopener"
                >
                  Inquire
                </a>
              </p>
            </div>
            <div className="card">
              <h3>Founder Intensives</h3>
              <p>
                Deep work for founders at an inflection point. Half-day somatic
                immersion plus integration plan for sustained practice.
              </p>
              <p style={{ marginTop: 12 }}>
                <a
                  className="btn secondary sm"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20founder%20intensives."
                  target="_blank"
                  rel="noopener"
                >
                  Inquire
                </a>
              </p>
            </div>
            <div className="card">
              <h3>Group Practice</h3>
              <p>
                Weekly group practice for founders. Learn regulation skills in
                community, lower cost than 1:1.
              </p>
              <p style={{ marginTop: 12 }}>
                <em>Coming soon. Message to join waitlist.</em>
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Resources</h2>
          </div>
          <div className="card">
            <h3>Resources</h3>
            <p>
              Free resources coming soon: daily reset practice audio, burnout
              assessment checklist, energy tracking template, and founder case
              studies. Message to get notified when resources are available.
            </p>
            <p style={{ marginTop: 12 }}>
              <a
                className="btn secondary sm"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20notify%20me%20when%20resources%20are%20ready."
                target="_blank"
                rel="noopener"
              >
                Get Notified
              </a>
            </p>
          </div>
        </section>

        <section className="section">
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link className="btn primary" href="/somatic">
              Explore Somatic Practice
            </Link>
            <Link className="btn secondary" href="/tech">
              See Tech Work
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
