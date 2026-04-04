import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { siteConfig } from "@/config/site";
import { getLocalArticles, getLocalArticlesByTag, sortArticlesByDateDesc } from "@/lib/cms/articles";

export const metadata = generateMetadata({
  title: "Tech Articles",
  description:
    "Technical guides by Max Petrusenko on OpenClaw installs, AEO, GEO, Claude Code, n8n, and AI product implementation.",
  ogType: "website",
  canonical: absoluteUrl("/tech/articles"),
  keywords: [
    "OpenClaw install",
    "AEO",
    "GEO",
    "AI automation",
    "Claude Code",
    "n8n workflows",
    "ChatGPT integration",
  ],
});

export default function TechArticlesIndexPage() {
  const mediumUrl = siteConfig.social.medium ?? "https://medium.com/@max.petrusenko";
  const localTechArticles = sortArticlesByDateDesc(
    getLocalArticles().filter((article) => article.link.startsWith("/tech/articles/"))
  ).slice(0, 3);
  const techClusterArticles = getLocalArticlesByTag("Tech", 24);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Tech Articles",
          description:
            "Technical guides by Max Petrusenko on AI agents, RAG, agentic coding, AEO, GEO, and production AI systems.",
          url: "/tech/articles",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
        ])}
      />

      <div className="container">
        <article className="page">
          <section className="section ui-fade-up delay-2" style={{ marginTop: 0 }}>
            <Link href="/tech" className="btn sm secondary" style={{ marginBottom: 20, display: "inline-flex" }}>
              ← Back to Tech
            </Link>

            <header style={{ maxWidth: 860, margin: "0 auto" }}>
              <div className="eyebrow">
                <span className="dot"></span> Technical Writing
              </div>
              <h1 className="text-display" style={{ marginBottom: 12 }}>
                Tech Articles
              </h1>
              <p className="text-xl text-muted" style={{ marginBottom: 18 }}>
                Practical implementation notes from client work: AI agents, RAG pipelines,
                agentic coding, AEO, GEO, and production AI systems.
              </p>
              <p className="text-muted" style={{ marginBottom: 0 }}>
                Medium archive: <a href={mediumUrl} target="_blank" rel="noopener">{mediumUrl}</a>
              </p>
            </header>
            <div className="ambient-band" style={{ maxWidth: 920, margin: "24px auto 0", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(12,17,21,0.09)" }}>
              <Image
                src="/images/generated/home-automation-portrait.png"
                alt="Automation visual"
                width={1024}
                height={1536}
                style={{ width: "100%", height: 180, objectFit: "cover", objectPosition: "center 28%" }}
              />
            </div>

            <div className="article-list" style={{ maxWidth: 920, margin: "32px auto 0" }}>
              {localTechArticles.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="section-head" style={{ marginBottom: 16 }}>
                    <h2>Featured On-Site</h2>
                    <span className="section-note">Canonical tech guides published here.</span>
                  </div>
                  <div className="article-list" style={{ marginBottom: 24 }}>
                    {localTechArticles.map((article) => (
                      <Link key={article.id} href={article.link} className="article-card">
                        <Image
                          className="article-thumb"
                          src={article.image || "/images/og-default.svg"}
                          alt={article.title}
                          width={400}
                          height={225}
                        />
                        <div className="article-body">
                          <span className="article-title">{article.title}</span>
                          <span className="article-sub">{article.excerpt}</span>
                          <div className="article-meta">
                            <span className="stat">
                              {article.publishedAt
                                ? new Date(article.publishedAt).toLocaleDateString()
                                : "Recently"}
                            </span>
                            {article.tags.length > 0 && (
                              <span className="stat">{article.tags[0]}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ gridColumn: "1 / -1" }}>
                <div className="section-head" style={{ marginBottom: 16 }}>
                  <h2>All Tech Topics</h2>
                  <span className="section-note">{techClusterArticles.length} articles across AI, RAG, agents, and more.</span>
                </div>
              </div>
              {techClusterArticles.map((article) => (
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
                      {article.tags.length > 0 && (
                        <span className="stat">{article.tags[0]}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
