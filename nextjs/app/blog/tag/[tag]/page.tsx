import Link from "next/link";
import Image from "next/image";
import { fetchArticlesByTag } from "@/lib/cms/articles";
import {
  resolveMissingBlogTagRedirect,
  shouldIndexBlogTagPage,
} from "@/lib/cms/legacy-blog-compat";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

interface TagPageProps {
  params: Promise<{
    tag: string;
  }>;
}

// Edge runtime for Cloudflare Pages compatibility
export const runtime = "edge";

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const articles = await fetchArticlesByTag(tag);
  const decodedTag = decodeURIComponent(tag).replace(/-/g, " ");

  return createMetadata({
    title: `Articles tagged "${decodedTag}"`,
    description: `Articles and essays tagged with "${decodedTag}".`,
    canonical: absoluteUrl(`/blog/tag/${tag}`),
    noindex: !shouldIndexBlogTagPage(articles.length),
  });
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const articles = await fetchArticlesByTag(tag);

  if (articles.length === 0) {
    const legacyRedirect = resolveMissingBlogTagRedirect(tag);
    if (legacyRedirect) {
      permanentRedirect(legacyRedirect);
    }
    notFound();
  }

  const decodedTag = decodeURIComponent(tag).replace(/-/g, " ");

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: `Articles tagged "${decodedTag}"`,
          description: `Articles and essays tagged with "${decodedTag}".`,
          url: `/blog/tag/${tag}`,
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: decodedTag, url: `/blog/tag/${tag}` },
        ])}
      />

      <div className="container">
        <section className="hero" style={{ paddingBottom: 40 }}>
          <div className="hero-text" style={{ maxWidth: 700 }}>
            <div className="eyebrow">
              <span className="dot"></span> Tag
            </div>
            <h1>#{decodedTag}</h1>
            <p>
              {articles.length} article{articles.length !== 1 ? "s" : ""} tagged with "{decodedTag}"
            </p>
            <Link href="/blog" className="btn sm secondary" style={{ marginTop: 16 }}>
              ← Back to all articles
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="article-list">
            {articles.map((article) => {
              const isLocal = article.link.startsWith("/");

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
                      <span className={`platform-badge ${isLocal ? "internal" : "external"}`}>
                        {isLocal ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Full Article
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            Medium
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </>
              );

              return (
                isLocal ? (
                  <Link key={article.id} className="article-card" href={article.link}>
                    {cardContent}
                  </Link>
                ) : (
                  <a
                    key={article.id}
                    className="article-card article-card--external"
                    href={article.link}
                    target="_blank"
                    rel="noopener"
                  >
                    {cardContent}
                  </a>
                )
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
