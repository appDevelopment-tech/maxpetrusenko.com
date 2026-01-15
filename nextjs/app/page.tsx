import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
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

      <div className="location-banner">
        <span className="location-item">
          <span className="location-icon">📍</span>
          <span>Currently: <strong>Dubai</strong> (Jan-Feb) → <strong>Athens</strong> (Feb-Mar) → <strong>Lisbon</strong> (Mar)</span>
        </span>
        <span className="location-divider">•</span>
        <span className="location-item">
          <span className="location-icon">🔵</span>
          <span>Regular bases: <strong>Miami</strong> (Mar-Jun) &amp; <strong>Ubud, Bali</strong> (Jun-Aug)</span>
        </span>
      </div>

      {/* Social proof bar */}
      <div className="social-proof-bar">
        <span className="proof-item">✓ 200+ sessions facilitated</span>
        <span className="proof-item">✓ 500K+ views on X & Medium</span>
        <span className="proof-item">✓ 4.9/5 client satisfaction</span>
      </div>

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Presence & Product
            </div>
            <h1>Building calm products and embodied experiences</h1>
            <p>
              Two worlds I live in: shipping tech for creators and founders, and
              running a private atelier for somatic energy work. Pick where you want
              to go.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/spirituality">
                Explore Spirituality
              </Link>
              <Link className="btn secondary" href="/tech">
                Explore Tech
              </Link>
              <Link className="btn secondary" href="/links">
                All Links
              </Link>
            </div>
            <div className="hero-cta-note">
              Availability is limited for sessions; tech projects by fit.
            </div>
          </div>

          <div className="hero-card quick-paths">
            <h3>Quick paths</h3>
            <div className="tiles">
              <a className="tile" href={siteConfig.externalLinks.atelier} target="_blank" rel="noopener">
                <div className="tile-meta">
                  <span className="tile-title">Atelier</span>
                  <span className="tile-desc">
                    Private tantra & somatic sessions in Ubud.
                  </span>
                </div>
                <span className="badge spirit">Visit</span>
              </a>
              <a
                className="tile"
                href="https://www.instagram.com/p/C9ivYB1u2-6/"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">Mindfold live</span>
                  <span className="tile-desc">
                    See 100 people dancing blindfold together at Create Infinite
                    Elements. Watch the clip.
                  </span>
                </div>
                <span className="badge mindfold">Watch</span>
              </a>
              <Link className="tile" href="/tech">
                <div className="tile-meta">
                  <span className="tile-title">Tech Portfolio</span>
                  <span className="tile-desc">
                    Products, apps, and tools for creators.
                  </span>
                </div>
                <span className="badge">View</span>
              </Link>
            </div>
          </div>
        </section>

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
                <span>&rarr; 511.6K views</span>
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
                  36K views · 26K reads · 7 min read
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
                  249K views · 26K reads · GrapheneOS privacy
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
                  41K presentations · 8.7K views · 5.4K reads
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
            <h2>What I&apos;m focused on</h2>
            <div className="pill-row">
              <span className="pill">Tech: product + build</span>
              <span className="pill">Spirituality: somatic + tantra</span>
              <span className="pill">Mindfold: sensory journeys</span>
            </div>
          </div>
          <div className="split">
            <div className="card">
              <h3 className="text-accent-tech">Tech</h3>
              <p>
                Shipping tools, automation, and products for creators and
                founders. Calm UX, clear outcomes.
              </p>
              <ul className="list">
                <li>Product/UX and build</li>
                <li>Workflow automation</li>
                <li>Content visibility tools</li>
              </ul>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <Link className="btn secondary" href="/tech">
                  See tech work
                </Link>
              </div>
            </div>
            <div className="card">
              <h3 className="text-accent-spirit">Spirituality</h3>
              <p>
                Presence Atelier: private tantra and somatic energy work in Ubud.
                Deep rewiring and nervous system reset.
              </p>
              <ul className="list">
                <li>1:1 sessions, limited weekly spots</li>
                <li>Boundaries-first, regulated pace</li>
                <li>WhatsApp to book</li>
              </ul>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <Link className="btn primary" href="/spirituality">
                  See atelier focus
                </Link>
              </div>
            </div>
            <div className="card">
              <h3 className="text-accent-mindfold">Mindfold</h3>
              <p>
                Blindfolded presence journeys to deepen awareness and trust.
                Group or 1:1 formats.
              </p>
              <ul className="list">
                <li>Sensory subtraction to expand perception</li>
                <li>Facilitated safety and integration</li>
                <li>Learn more on Mindfold Sanctuary</li>
                <li>
                  <a
                    href="https://www.instagram.com/p/C9ivYB1u2-6/"
                    target="_blank"
                    rel="noopener"
                  >
                    See 100 people at a music festival learning how to feel
                  </a>
                </li>
              </ul>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <Link className="btn secondary" href="/mindfold/events">
                  Events & info
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <EmailCapture />
    </>
  );
}
