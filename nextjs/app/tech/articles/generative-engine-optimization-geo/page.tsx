import Link from "next/link";
import Image from "next/image";
import { RelatedReading } from "@/components/articles/RelatedReading";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateTechArticleSchema,
  generateBreadcrumbSchema,
  generateScheduleActionSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "GEO Framework and Roadmap for 2026",
  description:
    "Practical GEO framework and roadmap for 2026: entity clarity, citation-ready pages, internal linking, and the implementation sequence that turns impressions into qualified leads.",
  ogType: "article",
  canonical: absoluteUrl("/tech/articles/generative-engine-optimization-geo"),
  ogImage: "/images/article-covers/tech-geo-framework.svg",
  keywords: [
    "Generative Engine Optimization",
    "GEO",
    "AEO",
    "AI search",
    "citation strategy",
    "service business SEO",
  ],
});

export default function GEOArticle() {
  return (
    <>
      <JsonLd
        type="TechArticle"
        data={generateTechArticleSchema({
          headline: "GEO Framework and Roadmap for 2026",
          description:
            "A practical GEO framework and roadmap for service businesses: entity clarity, citation-ready pages, and conversion architecture.",
          image: "/images/article-covers/tech-geo-framework.svg",
          url: "/tech/articles/generative-engine-optimization-geo",
          datePublished: "2026-02-02",
          author: "Max Petrusenko",
          keywords: ["GEO", "AEO", "AI search", "citation strategy", "service business"],
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
          { name: "Generative Engine Optimization", url: "/tech/articles/generative-engine-optimization-geo" },
        ])}
      />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "GEO Framework and Roadmap for 2026",
          description:
            "How to build a GEO roadmap that gets cited by AI assistants and turns attention into qualified leads.",
          url: "/tech/articles/generative-engine-optimization-geo",
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
              <span className="dot"></span> AI Visibility Strategy
            </div>
            <h1>GEO Framework and Roadmap for 2026</h1>
            <p className="article-subtitle">
              GEO is not a trend label. It is operational search work for how people now
              discover answers in ChatGPT, Claude, Perplexity, and AI-enhanced search.
              If you need a GEO roadmap, this guide breaks the work into concrete steps you can execute weekly.
            </p>
            <div className="article-meta">
              <time>February 2, 2026</time>
              <span>•</span>
              <span>11 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/tech-geo-framework.svg"
              alt="Abstract generated visual for generative search strategy"
              width={1400}
              height={933}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              If your pages are discovered but not indexed, GEO starts with one hard truth:
              answer engines do not reward page count. They reward confidence. Confidence is
              created by clarity, evidence, and structure.
            </p>

            <h2>What GEO actually optimizes</h2>
            <p>
              Traditional SEO optimizes ranking positions. GEO optimizes source selection.
              Your page must be easy for AI systems to parse, trust, and cite.
            </p>
            <ul>
              <li><strong>Clarity:</strong> one page = one clear user intent</li>
              <li><strong>Evidence:</strong> metrics, examples, and verifiable claims</li>
              <li><strong>Structure:</strong> headings, lists, and schema that extract cleanly</li>
              <li><strong>Connection:</strong> internal links that establish topic hierarchy</li>
            </ul>

            <h2>The 5-layer GEO stack</h2>

            <h3>1. Entity layer</h3>
            <p>
              Make identity unambiguous: who you are, what you do, where you operate,
              and what outcomes you produce. Keep this consistent across homepage,
              about page, and social profiles.
            </p>

            <h3>2. Intent layer</h3>
            <p>
              Create pages mapped to real query clusters. For this site, that means
              dedicated pages for terms like <em>tantric massage ubud</em>,
              <em>AEO consultant</em>, and <em>OpenClaw install help</em>.
            </p>

            <h3>3. Evidence layer</h3>
            <p>
              Publish outcomes users can quote: savings, speed gains, bug reduction,
              rollout timelines, and implementation constraints.
            </p>

            <h3>4. Retrieval layer</h3>
            <p>
              Strengthen crawl priorities with a clean sitemap and homepage links to
              your money pages. Remove or noindex weak utility pages.
            </p>

            <h3>5. Conversion layer</h3>
            <p>
              Every high-intent page needs a direct next step: contact, booking,
              or a short qualification form.
            </p>

            <h2>Weekly GEO operating system</h2>
            <ol>
              <li>Pick one high-intent query and map the exact page to own it.</li>
              <li>Publish or upgrade the page with direct answer + proof + FAQ.</li>
              <li>Add 3-5 internal links from top pages to that page.</li>
              <li>Ensure it appears in sitemap and has canonical metadata.</li>
              <li>Request indexing only for pages that pass the quality threshold.</li>
            </ol>

            <h2>Quality threshold checklist (before indexing request)</h2>
            <ul>
              <li>Clear H1 aligned to one intent</li>
              <li>Strong opening paragraph that directly answers the query</li>
              <li>At least one concrete proof block (metric, case, or cited source)</li>
              <li>FAQ section handling common objections</li>
              <li>Internal links from homepage or a high-authority parent page</li>
              <li>Visible CTA with response expectation</li>
            </ul>

            <h2>Common GEO mistakes that slow indexing</h2>
            <ul>
              <li>Publishing many thin pages with overlapping intent</li>
              <li>Using external-only links on your own blog cards</li>
              <li>Sitemaps containing 404s or pages you do not want indexed</li>
              <li>Writing generic thought leadership with no proof</li>
            </ul>

            <h2>Where to start on this site</h2>
            <p>
              Prioritize pages tied to real demand first: <Link href="/tantra-massage-ubud">Tantra Massage Ubud</Link>,
              <Link href="/tech/articles/answer-engine-optimization-aeo"> AEO guide</Link>,
              and <Link href="/tech/case-studies"> measurable case studies</Link>.
              Then support them with blog articles that answer adjacent questions.
            </p>

            <div className="card" style={{ marginTop: 28 }}>
              <h3 style={{ marginBottom: 10 }}>Need help implementing GEO in production?</h3>
              <p>
                I work hands-on with founders and teams to turn scattered content into
                a clean citation system that drives qualified inbound.
              </p>
              <a
                className="btn primary"
                href="mailto:hello@maxpetrusenko.com?subject=GEO%20Implementation"
                style={{ marginTop: 14 }}
              >
                Book a GEO strategy session
              </a>
            </div>
          </div>
          <RelatedReading currentLink="/tech/articles/generative-engine-optimization-geo" />
</article>
      </div>
    </>
  );
}
