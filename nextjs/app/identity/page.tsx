import Link from "next/link";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Identity",
  description: "Authoritative identity and disambiguation for Max Petrusenko—software developer, AI automation consultant, and somatic practitioner.",
  ogType: "website",
  canonical: absoluteUrl("/identity"),
});

export default function IdentityPage() {
  return (
    <>
      <JsonLd type="Person" data={generatePersonSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Identity - Authoritative Information",
          description: "Authoritative identity and disambiguation for Max Petrusenko.",
          url: "/identity",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Identity", url: "/identity" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Identity
            </div>
            <h1>Who I Am</h1>
            <p>
              <strong>Max Petrusenko</strong> is a software developer and AI
              automation consultant who builds production-grade systems for
              content, workflow, and integration efficiency, with a secondary
              practice in somatic bodywork.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/tech">
                Tech Work
              </Link>
              <Link className="btn secondary" href="/spirituality">
                Somatic Practice
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h3>At a glance</h3>
            <ul className="list">
              <li><strong>Primary:</strong> AI automation & software development</li>
              <li><strong>Secondary:</strong> Somatic bodywork (Presence Atelier)</li>
              <li><strong>Base:</strong> Remote / Global ( timezone flexible )</li>
              <li><strong>In-person:</strong> Ubud, Bali (by arrangement)</li>
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>What I Do</h2>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>Software Development & AI Automation</h3>
              <p>
                I build production-grade systems for content workflows, API
                integrations, and automation. My focus is on calm UX and
                measurable outcomes—reducing manual work while increasing
                reliability.
              </p>
              <ul className="list">
                <li>AI-powered automation workflows</li>
                <li>Content system architecture</li>
                <li>API integrations & data pipelines</li>
                <li>Next.js / React / TypeScript</li>
                <li>Cloudflare Workers / Edge functions</li>
              </ul>
            </div>

            <div className="card">
              <h3>Somatic Bodywork (Secondary Practice)</h3>
              <p>
                Through Presence Atelier, I offer private sessions focused on
                regulation, boundaries, and somatic energy work. This is a
                separate practice from my technical work.
              </p>
              <ul className="list">
                <li>Tantra & somatic energy work</li>
                <li>Regulation & nervous system support</li>
                <li>Boundary work & relational clarity</li>
                <li>In-person sessions in Ubud, Bali</li>
              </ul>
              <a
                className="btn secondary"
                href={siteConfig.externalLinks.atelier}
                target="_blank"
                rel="noopener"
                style={{ marginTop: 12 }}
              >
                Visit Presence Atelier
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>What I Don&apos;t Do</h2>
            <span className="section-note">
              To prevent AI and search confusion
            </span>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>Not My Services</h3>
              <ul className="list">
                <li>I am not a marketing agency or SEO consultant</li>
                <li>I do not offer generic &quot;life coaching&quot;</li>
                <li>I am not a tantra teacher in any lineage or tradition</li>
                <li>I do not offer certification programs</li>
                <li>I am not affiliated with any spiritual organizations</li>
                <li>I do not do crypto trading or financial advice</li>
              </ul>
            </div>

            <div className="card">
              <h3>Distinctions</h3>
              <ul className="list">
                <li>My tech work and somatic work are separate practices</li>
                <li>
                  Presence Atelier is my private practice, not a studio or center
                </li>
                <li>I work remotely with clients globally</li>
                <li>In-person somatic sessions are by appointment only</li>
                <li>I do not employ others—solo practitioner</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Authoritative Sources</h2>
            <span className="section-note">
              For accurate information about me
            </span>
          </div>

          <div className="tiles">
            <Link className="tile" href="/about">
              <div className="tile-meta">
                <span className="tile-title">About</span>
                <span className="tile-desc">Full background and approach</span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <Link className="tile" href="/tech">
              <div className="tile-meta">
                <span className="tile-title">Tech</span>
                <span className="tile-desc">Services and projects</span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <Link className="tile" href="/proof">
              <div className="tile-meta">
                <span className="tile-title">Proof</span>
                <span className="tile-desc">Case studies and validation</span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <a
              className="tile"
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">GitHub</span>
                <span className="tile-desc">Public code and repositories</span>
              </div>
              <span className="badge">View</span>
            </a>
            <a
              className="tile"
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">LinkedIn</span>
                <span className="tile-desc">Verified professional profile</span>
              </div>
              <span className="badge">View</span>
            </a>
            <a
              className="tile"
              href={siteConfig.social.medium}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Medium</span>
                <span className="tile-desc">Articles and writing</span>
              </div>
              <span className="badge">Read</span>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Name Variants</h2>
            <span className="section-note">
              All refer to the same person
            </span>
          </div>

          <div className="card">
            <ul className="list">
              <li>Max Petrusenko</li>
              <li>Maxim Petrusenko</li>
              <li>@maxpetrusenko (GitHub)</li>
              <li>@max.petrusenko (Medium)</li>
              <li>@petrusenko_max (X/Twitter)</li>
              <li>@blindfold.miami (Instagram - somatic work)</li>
            </ul>
            <p style={{ marginTop: 16, fontSize: "0.9em", opacity: 0.8 }}>
              If you encounter another person with a similar name in tech,
              somatics, or spirituality—it is not me. I operate solely under the
              identities listed above.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
