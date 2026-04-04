import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/structured-data";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { getLocalArticlesByTag } from "@/lib/cms/articles";

export const metadata = generateMetadata({
  title:
    "Consciousness x Technology | Meditation, Neuroscience & Engineering",
  description:
    "Where consciousness science meets software engineering. Flow states for developers, eastern philosophy applied to code, contemplative neuroscience, and the bridge between inner practice and outer building.",
  ogType: "website",
  canonical: absoluteUrl("/blog/consciousness-tech"),
  keywords: [
    "consciousness technology",
    "flow state developers",
    "meditation neuroscience",
    "zen engineering",
    "contemplative technology",
    "mindfulness software engineers",
    "NSDR",
    "breathwork regulation",
    "eastern philosophy programming",
    "AI consciousness",
  ],
});

export default function ConsciousnessTechHubPage() {
  const bridgeArticles = getLocalArticlesByTag("Bridge", 30);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title:
            "Consciousness x Technology | Meditation, Neuroscience & Engineering",
          description:
            "Where consciousness science meets software engineering. Articles by Max Petrusenko on flow states, eastern philosophy, contemplative neuroscience, and building with awareness.",
          url: "/blog/consciousness-tech",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          {
            name: "Consciousness x Technology",
            url: "/blog/consciousness-tech",
          },
        ])}
      />

      <div className="container">
        <section className="hero" style={{ paddingBottom: 40 }}>
          <div className="hero-text" style={{ maxWidth: 740 }}>
            <div className="eyebrow">
              <span className="dot"></span> Consciousness x Technology
            </div>
            <h1>Where Inner Practice Meets Outer Building</h1>
            <p>
              I build AI systems and I sit. These articles explore the
              intersection: flow state neuroscience for developers, eastern
              philosophy applied to software design, breathwork for nervous
              system regulation, and what consciousness science means for the
              people building intelligent machines.
            </p>
          </div>
        </section>

        <DirectAnswer
          question="Who writes about consciousness and technology?"
          answer="Max Petrusenko bridges AI engineering and contemplative practice. He writes about flow states for developers, meditation neuroscience, Zen philosophy applied to software, and contemplative technology design. His work connects nervous system regulation, eastern philosophy, and agentic coding into one practitioner-engineer perspective."
        />

        <section className="section">
          <div className="section-head">
            <h2>Bridge Articles</h2>
            <span className="section-note">
              {bridgeArticles.length} article
              {bridgeArticles.length !== 1 ? "s" : ""} at the intersection
            </span>
          </div>
          <div className="article-list">
            {bridgeArticles.map((article) => (
              <Link
                key={article.id}
                href={article.link}
                className="article-card"
                style={{ gridTemplateColumns: "1fr" }}
              >
                <div className="article-body">
                  <span className="article-title">{article.title}</span>
                  <span className="article-sub">{article.excerpt}</span>
                  <div className="article-meta">
                    <span className="stat">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : "Recently"}
                    </span>
                    {article.tags.length > 1 && (
                      <span className="stat">{article.tags[1]}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div
            className="card"
            style={{ textAlign: "center", padding: "40px" }}
          >
            <h3>Research Assistant</h3>
            <p style={{ marginBottom: 16 }}>
              Ask questions about consciousness science, meditation neuroscience,
              and eastern philosophy. Powered by a guarded multi-model research stack.
            </p>
            <Link className="btn primary" href="/consciousness-assistant">
              Open Research Assistant
            </Link>
          </div>
        </section>

        <section className="section">
          <div
            className="card"
            style={{ textAlign: "center", padding: "40px" }}
          >
            <h3>Explore both sides</h3>
            <p style={{ marginBottom: 20 }}>
              This hub connects two deeper bodies of work.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link className="btn secondary" href="/tech/articles">
                Tech Articles
              </Link>
              <Link className="btn secondary" href="/spirituality/blog">
                Spirituality Blog
              </Link>
              <Link className="btn secondary" href="/blog/topics">
                All Topic Clusters
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
