import Link from "next/link";
import Image from "next/image";
import { fetchArticles, isLocalArticle } from "@/lib/cms/articles";
import { brandedReferenceLinkCards } from "@/lib/brand/reference-pages";
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

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC05764.jpg"
            alt="Editorial blog atmosphere"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            quality={86}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(210,163,93,0.24)] px-4 py-1 text-xs font-semibold text-[var(--accent-mindfold)]">
              Writing archive
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Articles, essays, and usable systems thinking.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[520px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Writing on security, AI, automation, and architecture. Published here
              for fast loading, clean citation, and durable access.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="/blog/topics">
                Open topic index
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-tech)]"
                href={mediumUrl}
                target="_blank"
                rel="noopener"
              >
                Medium @{mediumHandle}
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="dark-zone mt-8 px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(210,163,93,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(15,126,169,0.1),transparent_30%),linear-gradient(145deg,#111826_0%,#181f2b_58%,#241f17_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-mindfold)]">Editorial focus</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Built for citation, not scrollbait.
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            On-site articles for speed and attribution, plus external essays where the
            context fits better.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="dark-zone-card card-stripe-tech">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">On site</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                {localArticles.length} article{localArticles.length !== 1 ? "s" : ""} published directly here for fast access and clean quoting.
              </p>
            </div>
            <div className="dark-zone-card card-stripe-mindfold">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">External archive</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                {externalArticles.length} piece{externalArticles.length !== 1 ? "s" : ""} published off-site when platform reach or format matters.
              </p>
            </div>
            <div className="dark-zone-card card-stripe-tech">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Core topics</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Security, AI, automation, systems design, and practical operating notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>Branded reference routes</h2>
            <span className="section-note">Direct pages for name + service intent</span>
          </div>
          <div className="cards-3 grid">
            {brandedReferenceLinkCards.map((card) => (
              <Link key={card.href} className="card card-with-actions" href={card.href}>
                <div className="eyebrow">{card.badge}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="card-actions-spacer"></div>
                <div className="hero-actions" style={{ marginTop: 12 }}>
                  <span className="btn secondary sm">Open</span>
                </div>
              </Link>
            ))}
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
