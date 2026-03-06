import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateTechArticleSchema, generateBreadcrumbSchema, generateScheduleActionSchema, generateTechPersonSchema } from "@/lib/seo/structured-data";
import { RelatedReading } from "@/components/articles/RelatedReading";

export const metadata = generateMetadata({
  title: "Generative AI Score for Websites - What AI Engines Value",
  description: "How AI answer engines like ChatGPT, Claude, and Perplexity evaluate and score websites. Learn the factors that influence AI citation, attribution, and recommendation in 2025.",
  ogType: "article",
  canonical: absoluteUrl("/tech/articles/generative-ai-score-websites"),
  ogImage: "/images/article-covers/tech-generative-ai-score.svg",
  keywords: ["AI score", "website scoring", "AEO", "GEO", "AI evaluation", "answer engines", "ChatGPT", "Claude", "Perplexity"],
});

export default function GenerativeAIScoreArticle() {
  return (
    <>
      <JsonLd
        type="TechArticle"
        data={generateTechArticleSchema({
          headline: "Generative AI Score for Websites - What AI Engines Value",
          description: "How AI answer engines like ChatGPT, Claude, and Perplexity evaluate and score websites. Learn the factors that influence AI citation, attribution, and recommendation in 2025.",
          image: "/images/article-covers/tech-generative-ai-score.svg",
          url: "/tech/articles/generative-ai-score-websites",
          datePublished: "2025-01-28",
          author: "Max Petrusenko",
          keywords: ["AI score", "website scoring", "AEO", "GEO", "AI evaluation", "answer engines", "ChatGPT", "Claude", "Perplexity"],
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
          { name: "Generative AI Score for Websites", url: "/tech/articles/generative-ai-score-websites" },
        ])}
      />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Generative AI Score for Websites - What AI Engines Value",
          description: "How AI answer engines like ChatGPT, Claude, and Perplexity evaluate and score websites. Learn the factors that influence AI citation and attribution.",
          url: "/tech/articles/generative-ai-score-websites",
          datePublished: "2025-01-28",
        })}
      />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/tech">Back to Tech</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> AI Search Optimization
            </div>
            <h1>Generative AI Score for Websites</h1>
            <p className="article-subtitle">
              How AI answer engines evaluate and score websites. Understanding the factors
              that influence whether ChatGPT, Claude, Perplexity, and other AI engines cite,
              recommend, or trust your content.
            </p>
            <div className="article-meta">
              <time>January 28, 2025</time>
              <span>•</span>
              <span>10 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/tech-generative-ai-score.svg"
              alt="Prompt-based cover for generative AI scoring article"
              width={1344}
              height={768}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              As search shifts from blue links to AI-generated answers, a new metric has emerged:
              your "Generative AI Score" — how likely AI engines are to cite, trust, and
              recommend your website. Unlike traditional SEO scores, this metric measures
              how well your content performs when fed into large language models.
            </p>

            <h2>What is a Generative AI Score?</h2>
            <p>
              A Generative AI Score (or AI Answer Score) measures how well your website performs
              as a source for AI-powered answer engines. When ChatGPT, Claude, Perplexity, or
              Google AI Overviews generates an answer, it needs to:
            </p>
            <ul>
              <li><strong>Find your content</strong> — Is it in their training data or accessible via web search?</li>
              <li><strong>Understand your content</strong> — Is it structured clearly for extraction?</li>
              <li><strong>Trust your content</strong> — Is your expertise verifiable and authoritative?</li>
              <li><strong>Cite your content</strong> — Do you provide attribution-friendly formatting?</li>
            </ul>

            <p>
              Your AI Score determines whether you appear in AI-generated answers, and with
              proper optimization, you can significantly increase your visibility.
            </p>

            <h2>The Four Pillars of AI Scoring</h2>
            <p>
              AI engines evaluate websites using a multi-factor framework. Understanding these
              factors helps you optimize your site for AI citation.
            </p>

            <h3>1. Discoverability Score (25%)</h3>
            <p>
              Can AI engines find your content when they need it?
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Weight</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Sitemap Coverage</strong></td>
                  <td>High</td>
                  <td>Comprehensive sitemap with all important pages</td>
                </tr>
                <tr>
                  <td><strong>Crawlability</strong></td>
                  <td>High</td>
                  <td>No blocks in robots.txt, clean internal linking</td>
                </tr>
                <tr>
                  <td><strong>AI Guidance Files</strong></td>
                  <td>Medium</td>
                  <td>llm.txt or similar directing AI crawlers</td>
                </tr>
                <tr>
                  <td><strong>Site Speed</strong></td>
                  <td>Low</td>
                  <td>Fast loading helps complete crawls</td>
                </tr>
                <tr>
                  <td><strong>Mobile-Friendly</strong></td>
                  <td>Low</td>
                  <td>Responsive design for complete content access</td>
                </tr>
              </tbody>
            </table>

            <h3>2. Content Structure Score (30%)</h3>
            <p>
              How easily can AI extract meaning from your content?
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Weight</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Headings Structure</strong></td>
                  <td>High</td>
                  <td>Logical H1-H6 hierarchy for content outline</td>
                </tr>
                <tr>
                  <td><strong>JSON-LD Schema</strong></td>
                  <td>High</td>
                  <td>Structured data marking key entities and facts</td>
                </tr>
                <tr>
                  <td><strong>Clear Language</strong></td>
                  <td>Medium</td>
                  <td>Unambiguous phrasing, defined terms</td>
                </tr>
                <tr>
                  <td><strong>Content Length</strong></td>
                  <td>Low</td>
                  <td>Sufficient depth for comprehensive answers</td>
                </tr>
                <tr>
                  <td><strong>Multimedia Alt Text</strong></td>
                  <td>Low</td>
                  <td>Descriptive alt text for images and video</td>
                </tr>
              </tbody>
            </table>

            <h3>3. Authority & Trust Score (30%)</h3>
            <p>
              Does AI trust your content enough to cite it?
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Weight</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Entity Verification</strong></td>
                  <td>High</td>
                  <td>Knowledge Graph presence, verified identity</td>
                </tr>
                <tr>
                  <td><strong>Backlink Profile</strong></td>
                  <td>High</td>
                  <td>Quality citations from authoritative sources</td>
                </tr>
                <tr>
                  <td><strong>Content Freshness</strong></td>
                  <td>Medium</td>
                  <td>Regular updates with current information</td>
                </tr>
                <tr>
                  <td><strong>Social Proof</strong></td>
                  <td>Medium</td>
                  <td>Reviews, testimonials, follower counts</td>
                </tr>
                <tr>
                  <td><strong>Domain Age</strong></td>
                  <td>Low</td>
                  <td>Older domains may have established authority</td>
                </tr>
              </tbody>
            </table>

            <h3>4. Attribution & Citation Score (15%)</h3>
            <p>
              How easy is it for AI to cite you correctly?
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Weight</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Author Attribution</strong></td>
                  <td>High</td>
                  <td>Clear bylines, author schema markup</td>
                </tr>
                <tr>
                  <td><strong>Publication Dates</strong></td>
                  <td>High</td>
                  <td>Last updated and published dates</td>
                </tr>
                <tr>
                  <td><strong>Citation Format</strong></td>
                  <td>Medium</td>
                  <td>Concise quotable text blocks</td>
                </tr>
                <tr>
                  <td><strong>Original Sources</strong></td>
                  <td>Medium</td>
                  <td>Links to primary sources, data attribution</td>
                </tr>
                <tr>
                  <td><strong>Contact Info</strong></td>
                  <td>Low</td>
                  <td>Verified contact for fact-checking</td>
                </tr>
              </tbody>
            </table>

            <h2>Self-Assessment Checklist</h2>
            <p>
              Use this checklist to evaluate your website's AI-readiness:
            </p>
            <ul>
              <li><strong>Discoverability:</strong>
                <ul>
                  <li>Do I have a comprehensive XML sitemap?</li>
                  <li>Is my robots.txt file blocking AI crawlers?</li>
                  <li>Do I have an llm.txt or similar AI guidance file?</li>
                  <li>Are my pages internally linked well?</li>
                </ul>
              </li>
              <li><strong>Content Structure:</strong>
                <ul>
                  <li>Do I use proper heading hierarchy (H1-H6)?</li>
                  <li>Have I added JSON-LD structured data to key pages?</li>
                  <li>Is my writing clear and unambiguous?</li>
                  <li>Do I provide enough depth for comprehensive answers?</li>
                </ul>
              </li>
              <li><strong>Authority & Trust:</strong>
                <ul>
                  <li>Is my brand/entity verified in knowledge graphs?</li>
                  <li>Do authoritative sites link to my content?</li>
                  <li>Do I regularly update my content?</li>
                  <li>Can users verify my claims and expertise?</li>
                </ul>
              </li>
              <li><strong>Attribution:</strong>
                <ul>
                  <li>Are authors clearly identified on all content?</li>
                  <li>Do I include publication and last-modified dates?</li>
                  <li>Do I cite primary sources for data claims?</li>
                  <li>Is contact information available for verification?</li>
                </ul>
              </li>
            </ul>

            <h2>Improving Your AI Score</h2>
            <h3>Quick Wins</h3>
            <ul>
              <li><strong>Add JSON-LD structured data</strong> — Start with Person, Organization, and Article schemas</li>
              <li><strong>Create an llm.txt file</strong> — Direct AI crawlers on how to cite your content</li>
              <li><strong>Fix heading hierarchy</strong> — Ensure logical H1-H6 structure throughout</li>
              <li><strong>Add author bios</strong> — Clear attribution for all content pieces</li>
              <li><strong>Include dates</strong> — Published and last-modified on all articles</li>
            </ul>

            <h3>Medium-Term Investments</h3>
            <ul>
              <li><strong>Build entity authority</strong> — Get verified in knowledge graphs, build brand mentions</li>
              <li><strong>Earn quality backlinks</strong> — Focus on authoritative sources in your niche</li>
              <li><strong>Content freshness</strong> — Regular updates to keep information current</li>
              <li><strong>Sitemap optimization</strong> — Include all important pages, proper priority</li>
            </ul>

            <h3>Long-Term Strategy</h3>
            <ul>
              <li><strong>Thought leadership</strong> — Original research, data, and insights</li>
              <li><strong>Community building</strong> — Engaged audience, social proof</li>
              <li><strong>Technical excellence</strong> — Fast site, proper SEO, good UX</li>
              <li><strong>Brand consistency</strong> — Clear identity across all platforms</li>
            </ul>

            <hr className="article-divider" />

            <h2>Frequently Asked Questions</h2>

            <details className="faq-item">
              <summary>How is AI Score different from SEO?</summary>
              <p>
                Traditional SEO focuses on ranking in blue link search results. AI Score measures
                how well your content performs as a source for AI-generated answers. The overlap
                includes technical SEO and authority, but AI Score prioritizes structured data,
                clear attribution, and extractable meaning.
              </p>
            </details>

            <details className="faq-item">
              <summary>Which AI engines use these scoring factors?</summary>
              <p>
                ChatGPT, Claude (Anthropic), Perplexity, Google AI Overviews, and Bing Copilot
                all use similar frameworks for evaluating content sources. The exact weightings vary,
                but discoverability, structure, authority, and attribution are universal concerns.
              </p>
            </details>

            <details className="faq-item">
              <summary>How can I check my current AI Score?</summary>
              <p>
                There is no official "AI Score" metric yet, but you can evaluate yourself against
                the framework above. Tools like Google Search Console, analytics for AI referrer
                traffic, and manual testing with AI prompts can give you insights.
              </p>
            </details>

            <details className="faq-item">
              <summary>Does this replace traditional SEO?</summary>
              <p>
                No. AI optimization complements traditional SEO. Technical SEO, backlinks, and
                authority still matter. But as AI engines become more common, optimizing for
                AI citation becomes increasingly important for visibility.
              </p>
            </details>
          </div>

          <footer className="article-footer">
            <div className="article-tags">
              <strong>Tags:</strong>
              <span>AEO</span>
              <span>GEO</span>
              <span>AI Score</span>
              <span>Answer Engines</span>
              <span>ChatGPT</span>
              <span>Claude</span>
            </div>
          </footer>
          <RelatedReading currentLink="/tech/articles/generative-ai-score-websites" />
</article>
      </div>
    </>
  );
}