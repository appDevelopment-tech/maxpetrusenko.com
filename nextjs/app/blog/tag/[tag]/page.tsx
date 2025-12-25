import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchArticlesByTag, getAllTags } from "@/lib/cms/articles";
import { siteConfig } from "@/config/site";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

interface TagPageProps {
  params: Promise<{
    tag: string;
  }>;
}

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

/**
 * Generate metadata for each tag page dynamically
 */
export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag).replace(/-/g, " ");

  return createMetadata({
    title: `Articles tagged "${decodedTag}"`,
    description: `Browse all articles tagged with "${decodedTag}" on ${siteConfig.name}.`,
    ogType: "website",
    canonical: absoluteUrl(`/blog/tag/${tag}`),
  });
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const articles = await fetchArticlesByTag(tag);

  if (articles.length === 0) {
    notFound();
  }

  const decodedTag = decodeURIComponent(tag).replace(/-/g, " ");

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: `Tag: ${decodedTag}`, url: `/blog/tag/${tag}` },
  ]);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: `Articles tagged "${decodedTag}"`,
          description: `Browse all articles tagged with "${decodedTag}".`,
          url: `/blog/tag/${tag}`,
        })}
      />
      <JsonLd type="BreadcrumbList" data={breadcrumbSchema} />

      <div className="container">
        <section className="hero" style={{ paddingBottom: 40 }}>
          <div className="hero-text" style={{ maxWidth: 700 }}>
            <div className="eyebrow">
              <span className="dot"></span> Tag
            </div>
            <h1>#{decodedTag}</h1>
            <p>
              {articles.length} article{articles.length !== 1 ? "s" : ""} tagged
              with &quot;{decodedTag}&quot;
            </p>
          </div>
        </section>

        <section className="section">
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

        <section className="section">
          <Link
            href="/blog"
            className="btn secondary"
            style={{ display: "inline-flex" }}
          >
            ← Back to Blog
          </Link>
        </section>
      </div>
    </>
  );
}
