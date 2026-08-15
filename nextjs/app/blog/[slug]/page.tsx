import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import {
  detectTopicSlugFromArticleSlug,
  fetchArticleBySlug,
  fetchArticlesByTopicSlug,
  getTopicGroupBySlug,
} from "@/lib/cms/articles";
import {
  resolveBlogArticleRedirect,
  resolveLegacyBlogSlugRedirect,
} from "@/lib/cms/legacy-blog-compat";
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

  const isCanonicalOnBlog = article.link.startsWith(`/blog/${slug}`);
  const canonicalUrl = article.link.startsWith("/")
    ? absoluteUrl(article.link)
    : article.link;

  return createMetadata({
    title: article.title,
    description: article.excerpt,
    ogType: "article",
    canonical: canonicalUrl,
    ogImage: article.image || "/images/og-home.png",
    keywords: article.tags,
    noindex: !isCanonicalOnBlog,
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    const legacyRedirect = resolveLegacyBlogSlugRedirect(slug);
    if (legacyRedirect) {
      permanentRedirect(legacyRedirect);
    }
    notFound();
  }

  const canonicalRedirect = resolveBlogArticleRedirect(slug, article.link);
  if (canonicalRedirect) {
    permanentRedirect(canonicalRedirect);
  }

  const readTime = estimateReadTimeMinutes(article.content || "");
  const sanitizedContent = sanitizeMediumHtml(article.content || "");
  const isLocalArticle = article.link.startsWith("/");
  const heroImage = article.image || "/images/og-default.svg";
  const topicSlug = detectTopicSlugFromArticleSlug(article.slug);
  const topicGroup = topicSlug ? getTopicGroupBySlug(topicSlug) : null;
  const siblingArticles = topicSlug
    ? (await fetchArticlesByTopicSlug(topicSlug))
        .filter((item) => item.slug !== article.slug)
        .slice(0, 8)
    : [];

  // Determine canonical URL for structured data
  const canonicalUrl = isLocalArticle
    ? absoluteUrl(article.link)
    : article.link;

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
          image: heroImage,
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
          <nav className="article-nav ui-fade-up delay-1" style={{ marginBottom: 24 }}>
            <Link href="/blog">← Back to Blog</Link>
          </nav>

          <header className="article-header ui-fade-up delay-2">
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

          <div className="ui-fade-up delay-3" style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src={heroImage}
              alt={article.title}
              width={1344}
              height={768}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          {/* Article content with prose styling */}
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {topicGroup && siblingArticles.length > 0 && (
            <section
              className="article-footer"
              style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--border)" }}
            >
              <h3 style={{ marginBottom: 8 }}>More in {topicGroup.label}</h3>
              <p className="text-muted" style={{ marginBottom: 14 }}>
                Related perspectives in this topic cluster:
              </p>
              <ul className="list" style={{ marginTop: 0 }}>
                {siblingArticles.map((item) => (
                  <li key={item.id}>
                    <Link href={item.link}>{item.title}</Link>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 12 }}>
                <Link href={`/blog/topics#topic-${topicGroup.slug}`}>View full {topicGroup.label} index</Link>
              </p>
            </section>
          )}

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
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </footer>
          )}
        </article>
      </div>
    </>
  );
}
