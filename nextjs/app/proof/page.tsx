import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getCaseStudies, type CaseStudy } from "@/lib/cms/case-studies";

export const metadata = generateMetadata({
  title: "Proof",
  description: "Case studies, projects, and validation—evidence of outcomes for Max Petrusenko's work in AI automation and software development.",
  ogType: "website",
  canonical: absoluteUrl("/proof"),
});

function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <div className="card">
      <h3>{study.title}</h3>
      <p style={{ fontSize: "0.9em", opacity: 0.8, marginBottom: 12 }}>
        {study.client} · {study.industry} · {study.duration}
      </p>
      <p>{study.context}</p>

      {study.metrics && study.metrics.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ fontSize: "0.8em" }}>
            Outcomes
          </div>
          <div className="tags" style={{ marginTop: 8 }}>
            {study.metrics.map((metric, idx) => (
              <span key={idx} className="badge">
                {metric.label}: {metric.value}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ fontSize: "0.8em" }}>
          Stack
        </div>
        <div className="tags" style={{ marginTop: 8 }}>
          {study.stack.map((item, idx) => (
            <span key={idx} className="badge" style={{ fontSize: "0.85em" }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-actions" style={{ marginTop: 16 }}>
        <Link
          className="btn secondary"
          href={`/tech/case-studies#${study.id}`}
          style={{ padding: "8px 16px", fontSize: "0.9em" }}
        >
          Full Details
        </Link>
      </div>
    </div>
  );
}

export default function ProofPage() {
  const studies = getCaseStudies();

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Proof - Case Studies and Validation",
          description:
            "Case studies, projects, and validation for Max Petrusenko's work.",
          url: "/proof",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Proof", url: "/proof" },
        ])}
      />

      <div className="hero-image-section ui-immersive-hero ui-fade-up delay-1">
        <div className="hero-image-overlay"></div>
        <Image
          src="/images/tech-portrait.jpg"
          alt="Proof and case studies visual"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "50% 30%" }}
          quality={88}
        />
        <div className="hero-image-content">
          <h1>Proof</h1>
          <p>Case studies and measurable outcomes</p>
        </div>
      </div>

      <div className="container">
        <section className="hero ui-fade-up delay-2">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Proof
            </div>
            <h1>Evidence of Outcomes</h1>
            <p>
              Case studies, public work, and validation. No marketing
              fluff—just what was built, how it was built, and what changed.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/tech/case-studies">
                All Case Studies
              </Link>
              <a
                className="btn secondary"
                href={siteConfig.social.github}
                target="_blank"
                rel="noopener"
              >
                GitHub
              </a>
            </div>
          </div>

          <div className="hero-card">
            <h3>Quick stats</h3>
            <ul className="list">
              <li>{studies.length} detailed case studies</li>
              <li>Production systems deployed</li>
              <li>Remote-first, global client base</li>
              <li>Focus: measurable outcomes</li>
            </ul>
          </div>
        </section>
        <section className="ui-fade-up delay-3">
          <div className="ambient-band overflow-hidden rounded-[24px] border border-[rgba(12,17,21,0.09)]">
            <Image
              src="/images/generated/home-automation-portrait.png"
              alt="Proof and systems visual"
              width={1024}
              height={1536}
              className="h-[180px] w-full object-cover object-[center_24%]"
            />
          </div>
        </section>

        <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>Case Studies</h2>
            <span className="section-note">
              Real projects, real outcomes
            </span>
          </div>

          <div className="cards-2 grid">
            {studies.map((study) => (
              <CaseStudyCard key={study.id} study={study} />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Public Work</h2>
            <span className="section-note">
              Open source and published projects
            </span>
          </div>

          <div className="tiles">
            <a
              className="tile"
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">GitHub</span>
                <span className="tile-desc">
                  Public repositories, code samples, and contributions
                </span>
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
                <span className="tile-desc">
                  Articles on AI, automation, and technical topics
                </span>
              </div>
              <span className="badge">Read</span>
            </a>
            <a
              className="tile"
              href="/blog"
            >
              <div className="tile-meta">
                <span className="tile-title">Blog</span>
                <span className="tile-desc">
                  Technical writing and thought pieces
                </span>
              </div>
              <span className="badge">Visit</span>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Validation</h2>
            <span className="section-note">
              From clients and collaborators
            </span>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>Client Outcomes</h3>
              <ul className="list">
                <li>
                  Creator business: 87% reduction in manual content work
                </li>
                <li>
                  SaaS startup: 6 platform integrations shipped in 6 weeks
                </li>
                <li>
                  Agency: Admin time reduced from 30% to 8% of billable hours
                </li>
                <li>
                  Media site: Analytics latency reduced from 30+ minutes to ~5
                  seconds
                </li>
              </ul>
              <p style={{ marginTop: 12, fontSize: "0.9em", opacity: 0.8 }}>
                Detailed case studies available above.
              </p>
            </div>

            <div className="card">
              <h3>Working Style</h3>
              <ul className="list">
                <li>Clear project scope before starting</li>
                <li>Regular check-ins and progress updates</li>
                <li>Focus on practical solutions, not over-engineering</li>
                <li>Documentation and handoff included</li>
                <li>Remote-first, timezone-flexible</li>
              </ul>
              <a
                className="btn secondary"
                href="mailto:hello@maxpetrusenko.com?subject=Project+Inquiry"
                style={{ marginTop: 12 }}
              >
                Discuss Your Project
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Background</h2>
          </div>

          <div className="card">
            <h3>Technical Experience</h3>
            <div className="tags" style={{ marginTop: 12, marginBottom: 12 }}>
              <span className="badge">TypeScript</span>
              <span className="badge">Next.js</span>
              <span className="badge">React</span>
              <span className="badge">Node.js</span>
              <span className="badge">Cloudflare Workers</span>
              <span className="badge">API Design</span>
              <span className="badge">Automation</span>
              <span className="badge">AI Integration</span>
              <span className="badge">Edge Computing</span>
              <span className="badge">Full-Stack Development</span>
            </div>
            <p style={{ marginTop: 12 }}>
              I&apos;ve been building software and automation systems since
              2020, working with creators, startups, and small businesses. My
              focus is on practical solutions that save time and reduce
              friction—not on chasing trends or over-complicating things.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Get in Touch</h2>
          </div>

          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=Project+Inquiry"
            >
              Email Me
            </a>
            <Link className="btn secondary" href="/tech">
              See Services
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
