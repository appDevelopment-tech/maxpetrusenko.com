import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseStudyById, getCaseStudies, type CaseStudy } from "@/lib/cms/case-studies";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

interface CaseStudyPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

/**
 * Generate metadata for each case study dynamically
 */
export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { id } = await params;
  const study = getCaseStudyById(id);

  if (!study) {
    return {
      title: "Case Study Not Found",
    };
  }

  return createMetadata({
    title: `${study.title} - Case Study`,
    description: `${study.context} Outcomes: ${study.metrics?.map(m => m.value).join(", ") || "See results"}.`,
    ogType: "article",
    canonical: absoluteUrl(`/tech/case-studies/${id}`),
  });
}

/**
 * Generate FAQ schema for case studies (AI-extractable)
 */
function generateCaseStudyFAQ(study: CaseStudy) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What was the outcome of ${study.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": study.outcomes.join(" "),
        },
      },
      {
        "@type": "Question",
        "name": `What technologies were used in ${study.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": study.stack.join(", "),
        },
      },
      {
        "@type": "Question",
        "name": "How long did this project take?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": study.duration,
        },
      },
    ],
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { id } = await params;
  const study = getCaseStudyById(id);

  if (!study) {
    notFound();
  }

  // Get related case studies
  const allStudies = getCaseStudies();
  const relatedStudies = allStudies
    .filter((s) => s.id !== id)
    .slice(0, 3);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Tech", url: "/tech" },
    { name: "Case Studies", url: "/tech/case-studies" },
    { name: study.title, url: `/tech/case-studies/${id}` },
  ]);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: study.title,
          description: `${study.context} ${study.outcomes.join(" ")}`,
          url: `/tech/case-studies/${id}`,
        })}
      />
      <JsonLd type="BreadcrumbList" data={breadcrumbSchema} />
      <JsonLd type="FAQPage" data={generateCaseStudyFAQ(study)} />

      <div className="container">
        <article className="page">
          <section className="section" style={{ marginTop: 0 }}>
            <Link
              href="/tech/case-studies"
              className="btn sm secondary"
              style={{ marginBottom: 20, display: "inline-flex" }}
            >
              ← Back to Case Studies
            </Link>

            <header style={{ maxWidth: 900, margin: "0 auto" }}>
              <div className="pill-row" style={{ marginBottom: 16 }}>
                <span className="pill">CASE STUDY</span>
                <span className="pill">{study.industry}</span>
                <span className="pill">{study.duration}</span>
              </div>

              <h1 className="text-display" style={{ marginBottom: 16 }}>
                {study.title}
              </h1>

              <p
                className="text-xl text-muted"
                style={{ marginBottom: 12 }}
              >
                <strong>{study.client}</strong> · {study.industry}
              </p>

              <p
                className="text-lg"
                style={{ marginBottom: 32, lineHeight: 1.6 }}
              >
                {study.context}
              </p>
            </header>

            {/* Metrics Block - Key for SEO */}
            {study.metrics && study.metrics.length > 0 && (
              <section
                style={{
                  maxWidth: 900,
                  margin: "40px auto",
                  padding: "32px",
                  background: "linear-gradient(135deg, rgba(15, 126, 169, 0.08) 0%, rgba(14, 97, 93, 0.04) 100%)",
                  borderRadius: "20px",
                  border: "1px solid rgba(15, 126, 169, 0.15)",
                }}
              >
                <h2 style={{ marginBottom: 20, textAlign: "center" }}>Key Outcomes</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 20,
                  }}
                >
                  {study.metrics.map((metric, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(255, 255, 255, 0.9)",
                        padding: "20px",
                        borderRadius: "16px",
                        textAlign: "center",
                        boxShadow: "0 4px 12px rgba(12, 17, 21, 0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--accent-tech)",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        {metric.label}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: 700,
                          color: "var(--ink)",
                        }}
                      >
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Detailed Breakdown */}
            <section style={{ maxWidth: 700, margin: "0 auto" }}>
              <div className="card" style={{ marginBottom: 24 }}>
                <h3>The Challenge</h3>
                <p className="text-muted">{study.context}</p>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3>My Role</h3>
                <p className="text-muted">{study.role}</p>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3>Actions Taken</h3>
                <ol style={{ paddingLeft: 20, marginTop: 16 }}>
                  {study.actions.map((action, idx) => (
                    <li key={idx} style={{ marginBottom: 12 }}>
                      {action}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3>Outcomes</h3>
                <ul style={{ marginTop: 16, paddingLeft: 20 }}>
                  {study.outcomes.map((outcome, idx) => (
                    <li key={idx} style={{ marginBottom: 8 }}>
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3>Stack</h3>
                <div className="tags" style={{ marginTop: 16 }}>
                  {study.stack.map((item, idx) => (
                    <span key={idx} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section
              style={{
                maxWidth: 700,
                margin: "40px auto 0",
                textAlign: "center",
              }}
            >
              <div className="card" style={{ padding: 40 }}>
                <h2 style={{ marginBottom: 16 }}>Need Similar Results?</h2>
                <p className="text-muted" style={{ marginBottom: 24 }}>
                  If you&apos;re facing similar challenges, let&apos;s talk. I can
                  help you achieve measurable outcomes with AI automation and
                  thoughtful software development.
                </p>
                <div className="hero-actions" style={{ justifyContent: "center" }}>
                  <a
                    className="btn primary"
                    href="mailto:hello@maxpetrusenko.com?subject=Case%20Study%20Inquiry%3A%20{encodeURIComponent(study.title)}"
                  >
                    Discuss Your Project
                  </a>
                  <Link className="btn secondary" href="/tech/case-studies">
                    View All Studies
                  </Link>
                </div>
              </div>
            </section>

            {/* Related Case Studies */}
            {relatedStudies.length > 0 && (
              <section style={{ maxWidth: 900, margin: "60px auto 0" }}>
                <div className="section-head">
                  <h2>Related Case Studies</h2>
                </div>
                <div className="tiles">
                  {relatedStudies.map((related) => (
                    <Link
                      key={related.id}
                      className="tile"
                      href={`/tech/case-studies/${related.id}`}
                    >
                      <div className="tile-meta">
                        <span className="tile-title">{related.title}</span>
                        <span className="tile-desc">
                          {related.client} · {related.duration}
                        </span>
                      </div>
                      <span className="badge">View</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </section>
        </article>
      </div>
    </>
  );
}
