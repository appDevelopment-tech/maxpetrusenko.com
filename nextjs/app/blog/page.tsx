import Link from "next/link";
import Image from "next/image";
import { fetchArticles, isLocalArticle } from "@/lib/cms/articles";
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
  const localArticles = articles.filter((article) => isLocalArticle(article));
  const externalArticles = articles.filter((article) => !isLocalArticle(article));
  const mediumUrl = siteConfig.social.medium ?? "https://medium.com/@max.petrusenko";
  const mediumHandle = mediumUrl.replace("https://medium.com/@", "");

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

      <div className="hero-image-section ui-immersive-hero ui-fade-up delay-1">
        <div className="hero-image-overlay"></div>
        <Image
          src="/images/DSC05764.jpg"
          alt="Editorial blog atmosphere"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
          quality={86}
        />
        <div className="hero-image-content">
          <h2>Blog</h2>
          <p>Articles, essays, and field notes</p>
        </div>
      </div>

      <div className="container">
        <section className="hero ui-fade-up delay-2" style={{ paddingBottom: 40 }}>
          <div className="hero-text" style={{ maxWidth: 700 }}>
            <div className="eyebrow">
              <span className="dot"></span> Blog
            </div>
            <h1>Articles & Essays by Max Petrusenko</h1>
            <p>
              Writing on security, AI, automation, and systems. Articles are
              published directly on this site for fast loading and easy citation.
            </p>
            <p className="text-muted" style={{ marginTop: 10 }}>
              Archive also on{" "}
              <a href={mediumUrl} target="_blank" rel="noopener" className="text-accent-tech">
                Medium @{mediumHandle}
              </a>
            </p>
            <div style={{ marginTop: 14 }}>
              <Link className="btn sm secondary" href="/blog/topics">
                Open Topic Index
              </Link>
            </div>
          </div>
        </section>
        <section className="ui-fade-up delay-3">
          <div className="ambient-band overflow-hidden rounded-[24px] border border-[rgba(12,17,21,0.09)]">
            <Image
              src="/images/generated/home-ambient-somatic.jpg"
              alt="Editorial ambient texture"
              width={1536}
              height={1024}
              className="h-[180px] w-full object-cover"
            />
          </div>
        </section>

        {articles.length > 0 ? (
          <>
            {localArticles.length > 0 && (
              <section className="section">
                <div className="section-head">
                  <h2>On-site Articles</h2>
                  <span className="section-note">
                    {localArticles.length} article{localArticles.length !== 1 ? "s" : ""} published here
                  </span>
                </div>
                <div className="article-list">
                  {localArticles.map((article) => {
                    const cardContent = (
                      <>
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
                            <span className="platform-badge internal">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Full Article
                            </span>
                          </div>
                        </div>
                      </>
                    );

                    return (
                      <Link key={article.id} className="article-card" href={article.link}>
                        {cardContent}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="section">
              <div className="section-head">
                <h2>Medium Archive</h2>
                <span className="section-note">
                  {externalArticles.length} article{externalArticles.length !== 1 ? "s" : ""} on Medium
                </span>
              </div>
              {externalArticles.length > 0 ? (
                <div className="article-list">
                  {externalArticles.map((article) => {
                    const cardContent = (
                      <>
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
                            <span className="platform-badge external">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                              </svg>
                              Medium
                            </span>
                          </div>
                        </div>
                      </>
                    );

                    return (
                      <a
                        key={article.id}
                        className="article-card article-card--external"
                        href={article.link}
                        target="_blank"
                        rel="noopener"
                      >
                        {cardContent}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                  <h3>Medium archive is temporarily unavailable</h3>
                  <p className="text-muted">
                    Visit{" "}
                    <a href={mediumUrl} target="_blank" rel="noopener" className="text-accent-tech">
                      Medium @{mediumHandle}
                    </a>{" "}
                    directly to browse the archive.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="section">
            <div className="card" style={{ textAlign: "center", padding: 60 }}>
              <h3>No articles found</h3>
              <p>
                Check back later for new content, or visit{" "}
                <a
                  href={mediumUrl}
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
