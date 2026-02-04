import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { fetchArticleBySlug } from "@/lib/cms/articles";
import { sanitizeMediumHtml, estimateReadTimeMinutes } from "@/lib/api/medium";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Edge runtime for Cloudflare Pages compatibility
export const runtime = "edge";

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  return createMetadata({
    title: article.title,
    description: article.excerpt,
    ogType: "article",
    canonical: article.link.startsWith("/")
      ? absoluteUrl(article.link)
      : absoluteUrl(`/blog/${slug}`),
    ogImage: article.image || "/images/og-default.svg",
    keywords: article.tags,
    noindex: false,
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // If this is a local article (spirituality/tech), redirect to its canonical URL
  if (article.link.startsWith("/") && !article.link.startsWith(`/blog/${slug}`)) {
    redirect(article.link);
  }

  const readTime = estimateReadTimeMinutes(article.content || "");
  const sanitizedContent = sanitizeMediumHtml(article.content || "");
  const isLocalArticle = article.link.startsWith("/");

  // Determine canonical URL for structured data
  const canonicalUrl = isLocalArticle
    ? absoluteUrl(article.link)
    : absoluteUrl(`/blog/${slug}`);

  // Extract date for display
  const publishDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  return (
    <>
      <JsonLd
        type="Article"
        data={generateArticleSchema({
          title: article.title,
          description: article.excerpt,
          image: article.image || "/images/og-default.svg",
          url: canonicalUrl,
          datePublished: article.publishedAt || new Date().toISOString(),
          dateModified: article.publishedAt || new Date().toISOString(),
          author: article.author.name || "Max Petrusenko",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: article.title, url: `/blog/${slug}` },
        ])}
      />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/blog">← Back to Blog</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span>{" "}
              {article.tags[0] || "Article"}
            </div>
            <h1>{article.title}</h1>
            <p className="article-subtitle">{article.excerpt}</p>
            <div className="article-meta">
              <time>{publishDate}</time>
              <span>•</span>
              <span>{readTime} min read</span>
              <span>•</span>
              <span>By {article.author.name || "Max Petrusenko"}</span>
            </div>
          </header>

          {article.image && (
            <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
              <Image
                src={article.image}
                alt={article.title}
                width={1344}
                height={768}
                style={{ borderRadius: "var(--radius)" }}
                priority
              />
            </div>
          )}

          {/* Article content with prose styling */}
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {!isLocalArticle && article.link && (
            <footer className="article-footer" style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
              <p className="text-muted" style={{ marginBottom: 16 }}>
                This article was originally published on{" "}
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener"
                  className="text-accent-spirit"
                >
                  Medium
                </a>.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"))}`}
                    className="tag"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </footer>
          )}
        </article>
      </div>
    </>
  );
}
