import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchArticleBySlug, fetchArticles, getRelatedArticles } from "@/lib/cms/articles";
import { siteConfig } from "@/config/site";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

/**
 * Generate metadata for each article dynamically
 */
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
    ogImage: article.image,
    ogType: "article",
    canonical: absoluteUrl(`/blog/${slug}`),
    keywords: article.tags,
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Get related articles based on tags
  const relatedArticles = await getRelatedArticles(slug, article.tags, 3);

  // Generate structured data
  const articleSchema = generateArticleSchema({
    title: article.title,
    description: article.excerpt,
    image: article.image,
    url: `/blog/${slug}`,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: siteConfig.author.name,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: article.title, url: `/blog/${slug}` },
  ]);

  return (
    <>
      <JsonLd type="Article" data={articleSchema} />
      <JsonLd type="BreadcrumbList" data={breadcrumbSchema} />

      <div className="container">
        <article className="page">
          <section className="section" style={{ marginTop: 0 }}>
            <Link
              href="/blog"
              className="btn sm secondary"
              style={{ marginBottom: 20, display: "inline-flex" }}
            >
              ← Back to Blog
            </Link>

            <header style={{ maxWidth: 800, margin: "0 auto" }}>
              <div className="pill-row" style={{ marginBottom: 16 }}>
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                    className="pill"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              <h1 className="text-display" style={{ marginBottom: 16 }}>
                {article.title}
              </h1>

              <p
                className="text-xl text-muted"
                style={{ marginBottom: 24, lineHeight: 1.6 }}
              >
                {article.excerpt}
              </p>

              <div
                className="article-meta"
                style={{ fontSize: 14, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}
              >
                <span>By {siteConfig.author.name}</span>
                <span>·</span>
                <span>
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Recently"}
                </span>
              </div>
            </header>

            {article.image && (
              <div style={{ maxWidth: 900, margin: "40px auto" }}>
                <Image
                  src={article.image}
                  alt={article.title}
                  width={900}
                  height={500}
                  style={{ borderRadius: "var(--radius)" }}
                  priority
                />
              </div>
            )}

            <div
              className="card"
              style={{ maxWidth: 800, margin: "40px auto", padding: 32 }}
            >
              <p>
                This article was originally published on Medium. Continue reading
                there to access the full content.
              </p>
              <a
                href={article.link}
                target="_blank"
                rel="noopener"
                className="btn primary"
                style={{ marginTop: 16, display: "inline-flex" }}
              >
                Read Full Article on Medium →
              </a>
            </div>

            {relatedArticles.length > 0 && (
              <section
                className="section"
                style={{ maxWidth: 900, margin: "60px auto 0" }}
              >
                <div className="section-head">
                  <h2>Related Articles</h2>
                </div>
                <div className="article-list">
                  {relatedArticles.map((related) => (
                    <a
                      key={related.id}
                      className="article-card"
                      href={related.link}
                      target="_blank"
                      rel="noopener"
                    >
                      <Image
                        className="article-thumb"
                        src={related.image}
                        alt={related.title}
                        width={400}
                        height={225}
                      />
                      <div className="article-body">
                        <span className="article-title">{related.title}</span>
                        <span className="article-sub">{related.excerpt}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </section>
        </article>
      </div>
    </>
  );
}
