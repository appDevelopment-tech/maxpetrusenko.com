import Link from "next/link";
import Image from "next/image";
import { RelatedReading } from "@/components/articles/RelatedReading";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateTechArticleSchema,
  generateBreadcrumbSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Is SEO Dead in 2026? No - It Split Into Search + Answers",
  description:
    "SEO is not dead in 2026. It split into classic search optimization and answer-engine visibility. Learn the practical operating model for both.",
  ogType: "article",
  canonical: absoluteUrl("/tech/articles/seo-is-dead"),
  ogImage: "/images/article-covers/tech-seo-split.png",
  keywords: [
    "SEO is dead",
    "AEO",
    "GEO",
    "AI search",
    "content strategy",
    "technical SEO",
  ],
});

export default function SEOIsDeadArticle() {
  return (
    <>
      <JsonLd
        type="TechArticle"
        data={generateTechArticleSchema({
          headline: "Is SEO Dead in 2026? No - It Split Into Search + Answers",
          description:
            "Why SEO still works, what changed with AI answers, and how to run a dual strategy.",
          image: "/images/article-covers/tech-seo-split.svg",
          url: "/tech/articles/seo-is-dead",
          datePublished: "2026-02-02",
          author: "Max Petrusenko",
          keywords: ["SEO", "AEO", "GEO", "AI search", "content strategy"],
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
          { name: "SEO Is Dead", url: "/tech/articles/seo-is-dead" },
        ])}
      />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Is SEO Dead in 2026? No - It Split Into Search + Answers",
          description: "A practical model for balancing rankings, citations, and conversion.",
          url: "/tech/articles/seo-is-dead",
          datePublished: "2026-02-02",
        })}
      />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/tech/articles">← Back to Tech Articles</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> Search Strategy
            </div>
            <h1>Is SEO Dead in 2026? No. It Split Into Search + Answers.</h1>
            <p className="article-subtitle">
              The phrase "SEO is dead" trends every year. What is actually dead is
              relying on rankings alone. Today, visibility comes from both classical
              Google search and AI-generated answers.
            </p>
            <div className="article-meta">
              <time>February 2, 2026</time>
              <span>•</span>
              <span>9 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/tech-seo-split.svg"
              alt="Generated visual for modern search and AI visibility"
              width={1400}
              height={933}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              If your traffic stalled, the issue is usually not that SEO stopped working.
              The issue is that user behavior changed faster than your content model.
              People now validate decisions through search, AI assistants, social proof,
              and direct recommendations in the same session.
            </p>

            <h2>What still works from classic SEO</h2>
            <ul>
              <li>Strong technical crawlability (clean URLs, fast pages, stable uptime)</li>
              <li>Clear topical pages with unique intent</li>
              <li>Internal linking that reinforces page importance</li>
              <li>Original evidence (case studies, comparisons, test results)</li>
            </ul>

            <h2>What changed</h2>
            <ul>
              <li>Users ask multi-step questions instead of typing one keyword</li>
              <li>AI systems summarize sources before the click</li>
              <li>Authority is measured through consistency and verifiable facts</li>
              <li>Thin "thought pieces" are ignored more aggressively</li>
            </ul>

            <h2>The dual-engine model</h2>
            <p>
              Build content for both engines simultaneously:
            </p>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", margin: "1.5rem 0" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Channel</th>
                  <th style={{ padding: "10px" }}>Goal</th>
                  <th style={{ padding: "10px" }}>Winning asset</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px" }}><strong>Search results</strong></td>
                  <td style={{ padding: "10px" }}>Rank + earn click</td>
                  <td style={{ padding: "10px" }}>Focused service/content page</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px" }}><strong>AI answers</strong></td>
                  <td style={{ padding: "10px" }}>Be cited as source</td>
                  <td style={{ padding: "10px" }}>Structured, fact-rich explainer</td>
                </tr>
                <tr>
                  <td style={{ padding: "10px" }}><strong>Conversion</strong></td>
                  <td style={{ padding: "10px" }}>Turn trust into inquiry</td>
                  <td style={{ padding: "10px" }}>Case study + direct CTA</td>
                </tr>
              </tbody>
            </table>

            <h2>How this applies to your site</h2>
            <p>
              For a personal brand, the best lift usually comes from three clusters:
            </p>
            <ol>
              <li><strong>Demand capture pages:</strong> pages like <Link href="/spirituality">Tantra-Informed Somatic Work</Link></li>
              <li><strong>Authority pages:</strong> pages like <Link href="/tech/case-studies">case studies with hard outcomes</Link></li>
              <li><strong>Question pages:</strong> articles that answer high-intent implementation queries</li>
            </ol>

            <h2>Quick self-audit</h2>
            <ul>
              <li>Can each indexed page be explained in one sentence?</li>
              <li>Does each page include at least one proof element?</li>
              <li>Are your most important pages linked from the homepage or /tech?</li>
              <li>Do your blog cards point to your own URLs first?</li>
            </ul>

            <h2>Bottom line</h2>
            <p>
              SEO is not dead. Commodity content is. Teams that publish fewer,
              stronger pages with clear outcomes are still winning both rankings and
              answer-engine citations.
            </p>

            <div className="card" style={{ marginTop: 28 }}>
              <h3 style={{ marginBottom: 10 }}>Want a 30-minute visibility teardown?</h3>
              <p>
                I can map your pages into keep / merge / noindex buckets and give
                you an execution plan for the next 30 days.
              </p>
              <a
                className="btn primary"
                href="mailto:hello@maxpetrusenko.com?subject=SEO%20teardown"
                style={{ marginTop: 14 }}
              >
                Request teardown
              </a>
            </div>
          </div>
          <RelatedReading currentLink="/tech/articles/seo-is-dead" />
</article>
      </div>
    </>
  );
}
