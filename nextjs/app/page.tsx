import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateProfessionalServiceSchema,
  generateTechServiceSchema,
  generateFAQSchema,
  generateTechFAQSchema,
  generateEnhancedPersonSchema,
  generateScheduleActionSchema,
  generateAggregateRatingSchema,
} from "@/lib/seo/structured-data";
import { EmailCapture } from "@/components/forms/EmailCapture";

export const metadata = generateMetadata({
  title: "Presence & Product",
  description: "Building calm products and embodied experiences. Two worlds I live in: shipping tech for creators and founders, and running a private atelier for somatic energy work.",
  ogType: "website",
  canonical: absoluteUrl("/"),
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Presence & Product",
          description: "Building calm products and embodied experiences.",
          url: "/",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([{ name: "Home", url: "/" }])}
      />

      {/* ProfessionalService schema for somatic offerings */}
      <JsonLd type="ProfessionalService" data={generateProfessionalServiceSchema()} />

      {/* ProfessionalService schema for tech offerings */}
      <JsonLd type="ProfessionalService" data={generateTechServiceSchema()} />

      {/* FAQ schema for somatic services */}
      <JsonLd type="FAQPage" data={generateFAQSchema()} />

      {/* FAQ schema for tech services */}
      <JsonLd type="FAQPage" data={generateTechFAQSchema()} />

      {/* Enhanced Person schema with social links */}
      <JsonLd type="Person" data={generateEnhancedPersonSchema()} />

      {/* AggregateRating for overall services */}
      <JsonLd type="AggregateRating" data={generateAggregateRatingSchema("all")} />

      {/* ScheduleAction for WhatsApp booking */}
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tantra")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("mindfold")} />

      {/* Hidden schema.org metadata for AI */}
      <section itemScope itemType="https://schema.org/Person" style={{ display: "none" }}>
        <meta itemProp="name" content="Max Petrusenko" />
        <meta itemProp="jobTitle" content="Tech builder & somatic practitioner" />
        <meta itemProp="description" content="AI automation, Claude Code, n8n workflows" />
        <meta itemProp="telephone" content="+1-786-543-6688" />
      </section>

      {/* Section 2: Parallax hero image */}
      <div style={{ position: "relative", width: "100%", height: "60vh", minHeight: "400px" }}>
        <Image
          src="/images/DSC05871.jpg"
          alt="Max Petrusenko - Tech builder & somatic practitioner"
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
          quality={90}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.3)" }}></div>
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div className="container" style={{ display: "flex", justifyContent: "center" }}>
            <div className="card" style={{ maxWidth: "880px", width: "100%" }}>
              <div className="eyebrow">
                <span className="dot"></span> Max Petrusenko
              </div>
              <h1>Two practices, built on the same principle</h1>
              <p>
                I build products that help creators ship, and I facilitate somatic sessions that help people feel again.
                Both are about clarity, presence, and lasting results.
              </p>
              <div className="hero-actions">
                <Link className="btn primary" href="/somatic">
                  Book a Session
                </Link>
                <Link className="btn secondary" href="/tech">
                  See Tech Work
                </Link>
              </div>

              <div style={{ marginTop: "24px" }}>
                <h3>Choose your path</h3>
                <div className="tiles">
                  <a className="tile" href="/somatic" rel="noopener">
                    <div className="tile-meta">
                      <span className="tile-title">Somatic Sessions</span>
                      <span className="tile-desc">
                        Tantra massage, nervous system reset, and energy work.
                      </span>
                    </div>
                    <span className="badge spirit">Book</span>
                  </a>
                  <Link className="tile" href="/tech">
                    <div className="tile-meta">
                      <span className="tile-title">Tech Portfolio</span>
                      <span className="tile-desc">
                        Products, apps, and automation for founders.
                      </span>
                    </div>
                    <span className="badge tech">View</span>
                  </Link>
                  <Link className="tile" href="/mindfold/events">
                    <div className="tile-meta">
                      <span className="tile-title">Mindfold</span>
                      <span className="tile-desc">
                        Blindfolded presence journeys for groups.
                      </span>
                    </div>
                    <span className="badge mindfold">Explore</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Sandy separator for content sections */}
      <div style={{ background: "var(--color-bg)", padding: "40px 20px", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ marginBottom: "16px" }}>Featured Work & Insights</h2>
          <p style={{ color: "var(--color-text-muted)" }}>Recent updates, articles, and live sessions</p>
        </div>
      </div>

      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2>On X</h2>
            <span className="section-note">
              Top shares from{" "}
              <a
                href={siteConfig.social.twitter}
                target="_blank"
                rel="noopener"
              >
                <strong>@petrusenko_max</strong>
              </a>
            </span>
          </div>
          <div className="tweet-card">
            <Image
              src="https://pbs.twimg.com/media/GxxJBKwW4AAUxYs?format=jpg&name=900x900"
              alt="Claude Code sub-agents overview"
              width={400}
              height={400}
            />
            <div>
              <h3>Top post</h3>
              <p>
                🧵 I just gave Claude Code sub-agents write access to our
                production code. Most CTOs called me insane. Here&apos;s what
                happened:
              </p>
              <div className="stat-list">
                <span>&rarr; $253k saved annually</span>
                <span>&rarr; 3x faster feature delivery</span>
                <span>&rarr; 73% fewer bugs in production</span>
                <span>&rarr; Zero regressions across 127 PRs</span>
                <span>&rarr; Featured by Anthropic, Vercel</span>
              </div>
              <div className="hero-actions hero-actions-compact">
                <a
                  className="btn primary"
                  href="https://x.com/petrusenko_max/status/1953516625161834824"
                  target="_blank"
                  rel="noopener"
                >
                  Read the thread
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Featured writing</h2>
            <span className="section-note">
              Selected pieces on security, AI, and systems.
            </span>
          </div>
          {/* Atmospheric separator image */}
          <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "var(--space-6)" }}>
            <Image
              src="/images/DSC05764.jpg"
              alt="Atmospheric tropical setting"
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              style={{ objectFit: "cover" }}
              quality={85}
            />
          </div>
          <div className="article-list">
            <a
              className="article-card"
              href="https://medium.com/p/52e70e459cc2"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*0QKNs7G5UA3-97wb4SmNpQ.jpeg"
                alt="Global wealth distribution article cover"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">
                  Why Most People Are Dead Wrong About Global Wealth
                </span>
                <span className="article-sub">
                  7 min read · Data-driven analysis
                </span>
              </div>
            </a>
            <a
              className="article-card"
              href="https://medium.com/p/99c594d458b5"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*8Ggv_is-3TE87N5nLIMfhA.jpeg"
                alt="GrapheneOS phone cover"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">
                  The Smartphone That Makes Police Officers Sweat
                </span>
                <span className="article-sub">
                  GrapheneOS privacy guide
                </span>
              </div>
            </a>
            <a
              className="article-card"
              href="https://medium.com/p/65b991356c25"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*uSx3Al0UcKOBhxpIey3hAw.png"
                alt="Claude skills article cover"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">
                  Unleash Your Inner Wizard: Claude Skills
                </span>
                <span className="article-sub">
                  Technical deep dive
                </span>
              </div>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Mindfold live</h2>
            <span className="section-note">
              100 people at a music festival learning how to feel.
            </span>
          </div>
          <a
            className="embed-image"
            href="https://www.instagram.com/p/C9ivYB1u2-6/"
            target="_blank"
            rel="noopener"
            aria-label="Watch Mindfold live session"
          >
            <Image
              src="https://static.wixstatic.com/media/f6c00d_70158acbc6524e2ca139603802c01494f000.jpg/v1/fill/w_720,h_402,al_c,q_80,enc_avif,quality_auto/f6c00d_70158acbc6524e2ca139603802c01494f000.jpg"
              alt="Mindfold live session at a music festival"
              width={720}
              height={402}
            />
          </a>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Kyo-tai Immersion · $333</h2>
            <span className="section-note">
              Byōtōh-inspired contact: strong, non-sexual bodywork to break
              patterns fast.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>What it is</h3>
              <p>
                Intense contact practice—bending, leveraging, and sustained
                pressure to purge old energy and blocks. We move as one system
                to &quot;jump&quot; consciousness. Non-sexual.
              </p>
            </div>
            <div className="card">
              <h3>Who it&apos;s for</h3>
              <p>
                Ready for forceful guidance, not gentle massage. Founders/
                creators who can stay present while the body is challenged; we set
                intent and thresholds before we start.
              </p>
            </div>
            <div className="card">
              <h3>How to book</h3>
              <p>Limited spots. Message to align intentions, readiness, and timing.</p>
              <div className="hero-actions hero-actions-compact">
                <a
                  className="btn primary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20the%20Kyo-tai%20immersion%20(%24333).%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Text to book
                </a>
                <a
                  className="btn secondary"
                  href={siteConfig.externalLinks.atelier}
                  target="_blank"
                  rel="noopener"
                >
                  View atelier
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Two Practices, One Person</h2>
            <span className="section-note">
              I run two distinct businesses. Choose the one that serves you.
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3 className="text-accent-tech">Tech Consulting</h3>
              <p>
                I help founders ship products faster. Product strategy, automation,
                and build services for teams who need calm UX and clear outcomes.
              </p>
              <ul className="list">
                <li>Product/UX strategy and execution</li>
                <li>Workflow automation</li>
                <li>AI tooling and systems</li>
              </ul>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <Link className="btn secondary" href="/tech">
                  View portfolio
                </Link>
              </div>
            </div>
            <div className="card">
              <h3 className="text-accent-spirit">Somatic Sessions</h3>
              <p>
                Private tantra and energy work for nervous system regulation.
                Sessions are boundaries-first, consent-led, and tailored to your
                system.
              </p>
              <ul className="list">
                <li>Nervous system reset (60 min)</li>
                <li>Tantra massage (120 min)</li>
                <li>Kyo-tai immersion (120 min)</li>
              </ul>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <a
                  className="btn primary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Book via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <EmailCapture />
    </>
  );
}
