import Link from "next/link";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { HiddenKeywords } from "@/components/seo/HiddenKeywords";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";
import { getCaseStudies, type CaseStudy } from "@/lib/cms/case-studies";

export const metadata = generateMetadata({
  title: "Case Studies",
  description: "Detailed case studies showing outcomes from AI automation and software development projects. Real results, no fluff.",
  ogType: "website",
  canonical: absoluteUrl("/tech/case-studies"),
});

function CaseStudyDetail({ study }: { study: CaseStudy }) {
  return (
    <div id={study.id} className="card" style={{ scrollMarginTop: 80 }}>
      <h3>{study.title}</h3>
      <p style={{ fontSize: "0.9em", opacity: 0.8, marginBottom: 16 }}>
        <strong>{study.client}</strong> · {study.industry} · {study.duration}
      </p>

      <div style={{ marginBottom: 20 }}>
        <h4>Context</h4>
        <p>{study.context}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h4>My Role</h4>
        <p>{study.role}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h4>Actions Taken</h4>
        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
          {study.actions.map((action, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              {action}
            </li>
          ))}
        </ol>
      </div>

      {study.metrics && study.metrics.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4>Outcomes</h4>
          <div className="tags" style={{ marginTop: 8 }}>
            {study.metrics.map((metric, idx) => (
              <span key={idx} className="badge" style={{ fontSize: "0.9em" }}>
                <strong>{metric.label}:</strong> {metric.value}
              </span>
            ))}
          </div>
          <ul style={{ marginTop: 12, paddingLeft: 20 }}>
            {study.outcomes.map((outcome, idx) => (
              <li key={idx}>{outcome}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h4>Stack</h4>
        <div className="tags" style={{ marginTop: 8 }}>
          {study.stack.map((item, idx) => (
            <span key={idx} className="badge">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CaseStudiesPage() {
  const studies = getCaseStudies();

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Case Studies - Project Outcomes",
          description:
            "Detailed case studies from AI automation and software development projects.",
          url: "/tech/case-studies",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Case Studies", url: "/tech/case-studies" },
        ])}
      />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Case Studies
            </div>
            <h1>Real Projects, Real Outcomes</h1>
            <p>
              Detailed case studies from my work in AI automation and software
              development. No marketing fluff—just context, actions, and results.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/tech/ai-automation">
                Services
              </Link>
              <a
                className="btn secondary"
                href="mailto:hello@maxpetrusenko.com?subject=Project%20Inquiry"
              >
                Discuss Your Project
              </a>
            </div>
          </div>

          <div className="hero-card">
            <h3>Summary</h3>
            <ul className="list">
              <li>{studies.length} detailed case studies</li>
              <li>Cross-industry experience</li>
              <li>Measurable outcomes</li>
              <li>Production systems deployed</li>
            </ul>
            <Link
              className="btn secondary"
              href="/proof"
              style={{ marginTop: 12, padding: "8px 16px", fontSize: "0.9em" }}
            >
              View Proof Index
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>All Case Studies</h2>
            <span className="section-note">
              Click to view detailed case study with metrics
            </span>
          </div>

          <div className="tiles">
            {studies.map((study) => (
              <Link
                key={study.id}
                className="tile"
                href={`/tech/case-studies/${study.id}`}
                style={{ textDecoration: "none" }}
              >
                <div className="tile-meta">
                  <span className="tile-title">{study.title}</span>
                  <span className="tile-desc">
                    {study.client} · {study.duration}
                  </span>
                </div>
                <span className="badge">View</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Detailed Breakdowns</h2>
            <span className="section-note">
              Click any case study to see the full details
            </span>
          </div>

          <div className="cards-3 grid">
            {studies.map((study) => (
              <Link
                key={study.id}
                className="card card-with-actions"
                href={`/tech/case-studies/${study.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <h3>{study.title}</h3>
                <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                  {study.client} · {study.industry}
                </p>
                {study.metrics && study.metrics.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="tags">
                      {study.metrics.slice(0, 2).map((metric, idx) => (
                        <span key={idx} className="badge" style={{ fontSize: "0.85em" }}>
                          {metric.label}: {metric.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="card-actions-spacer"></div>
                <div style={{ marginTop: "auto", paddingTop: 12 }}>
                  <span className="btn sm secondary" style={{ fontSize: "0.9em" }}>
                    View Details →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Work With Me</h2>
          </div>

          <div className="cards-3 grid">
            <div className="card">
              <h3>Similar Projects</h3>
              <p>
                If you&apos;re facing challenges like the ones in these case
                studies, I can help. We&apos;ll start with a discovery call to
                understand your context.
              </p>
            </div>

            <div className="card">
              <h3>Process</h3>
              <p>
                Discovery → Design → Build → Deploy. Each project is scoped
                clearly with defined outcomes. No surprises, no scope creep.
              </p>
            </div>

            <div className="card">
              <h3>Get Started</h3>
              <p>
                Email me with your project details. I&apos;ll respond within 24
                hours with initial thoughts and next steps.
              </p>
              <a
                className="btn secondary"
                href="mailto:hello@maxpetrusenko.com?subject=Project%20Inquiry"
                style={{ marginTop: 12 }}
              >
                hello@maxpetrusenko.com
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Quick Links</h2>
          </div>

          <div className="tiles">
            <Link className="tile" href="/tech/ai-automation">
              <div className="tile-meta">
                <span className="tile-title">AI Automation Services</span>
                <span className="tile-desc">
                  Content automation, API integrations, workflows
                </span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <Link className="tile" href="/tech">
              <div className="tile-meta">
                <span className="tile-title">Tech Overview</span>
                <span className="tile-desc">
                  All services and capabilities
                </span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <Link className="tile" href="/proof">
              <div className="tile-meta">
                <span className="tile-title">Proof Index</span>
                <span className="tile-desc">
                  Validation and public work
                </span>
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
          </div>
        </section>

        {/* Hidden keywords for SEO */}
        <HiddenKeywords
          service="AI automation case studies"
          locations={["Remote", "Worldwide", "Global"]}
          variants={[
            "automation case studies",
            "AI automation projects",
            "API integration examples",
            "workflow automation examples",
            "Claude Code case study",
            "n8n workflow examples",
            "content automation case study",
          ]}
          modifiers={["examples", "projects", "portfolio", "work"]}
        />
      </div>
    </>
  );
}
