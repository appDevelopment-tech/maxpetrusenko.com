import Link from "next/link";
import Image from "next/image";
import { fetchArticles } from "@/lib/cms/articles";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: "Blog",
  description: `Articles and essays by ${siteConfig.author.name} on security, AI, automation, and systems.`,
  ogType: "website",
  canonical: absoluteUrl("/blog"),
});

export default async function BlogPage() {
  const articles = await fetchArticles();

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Blog",
          description: `Articles and essays by ${siteConfig.author.name} on security, AI, automation, and systems.`,
          url: "/blog",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ])}
      />

      <div className="container">
        <section className="hero" style={{ paddingBottom: 40 }}>
          <div className="hero-text" style={{ maxWidth: 700 }}>
            <div className="eyebrow">
              <span className="dot"></span> Blog
            </div>
            <h1>Articles & Essays</h1>
            <p>
              Writing on security, AI, automation, and systems. Originally
              published on Medium.
            </p>
          </div>
        </section>

        {articles.length > 0 ? (
          <section className="section">
            <div className="section-head">
              <h2>Latest Articles</h2>
              <span className="section-note">
                {articles.length} article{articles.length !== 1 ? "s" : ""} found
              </span>
            </div>
            <div className="article-list">
              {articles.map((article) => (
                <a
                  key={article.id}
                  className="article-card"
                  href={article.link}
                  target="_blank"
                  rel="noopener"
                >
                  <Image
                    className="article-thumb"
                    src={article.image}
                    alt={article.title}
                    width={400}
                    height={225}
                  />
                  <div className="article-body">
                    <span className="article-title">{article.title}</span>
                    <span className="article-sub">{article.excerpt}</span>
                    <div className="article-meta">
                      <span className="stat">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                      {article.tags.length > 0 && (
                        <span className="stat">{article.tags[0]}</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section className="section">
            <div className="card" style={{ textAlign: "center", padding: 60 }}>
              <h3>No articles found</h3>
              <p>
                Check back later for new content, or visit{" "}
                <a
                  href={siteConfig.social.medium}
                  target="_blank"
                  rel="noopener"
                  className="text-accent-spirit"
                >
                  Medium
                </a>{" "}
                directly.
              </p>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
