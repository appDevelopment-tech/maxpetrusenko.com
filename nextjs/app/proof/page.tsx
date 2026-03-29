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

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/tech-portrait.jpg"
            alt="Proof and case studies visual"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            quality={88}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(15,126,169,0.2)] px-4 py-1 text-xs font-semibold text-[var(--accent-tech)]">
              Proof and validation
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Public evidence. Not vague claims.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[500px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Case studies, shipped systems, and public artifacts that show what was
              built, how it worked, and what changed.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="/tech/case-studies">
                Browse case studies
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-tech)]"
                href={siteConfig.social.github}
                target="_blank"
                rel="noopener"
              >
                Open GitHub
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="dark-zone mt-8 px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#121d2e_58%,#152438_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-tech)]">Validation</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            What changed matters more than what shipped.
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            A compact index of outcomes, public work, and references you can audit.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[`${studies.length} case studies`, "Production systems", "Public GitHub work", "Outcome-first delivery"].map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-[var(--dark-zone-text)]">
                {metric}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
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
