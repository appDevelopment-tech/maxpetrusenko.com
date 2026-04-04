import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getLocalArticles, getLocalArticlesByTag, sortArticlesByDateDesc } from "@/lib/cms/articles";

export const metadata = generateMetadata({
  title: "Spirituality Blog | Tantra & Somatic Articles",
  description: "Articles on tantra massage, somatic energy work, trauma release, and conscious touch in Ubud, Bali. Learn what to expect and how to prepare for your session.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality/blog"),
});

export default function SpiritualityBlogPage() {
  const canonicalPosts = sortArticlesByDateDesc(
    getLocalArticles().filter((a) => a.link.startsWith("/spirituality/blog/"))
  );
  const clusterPosts = getLocalArticlesByTag("Spirituality", 24);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Spirituality Blog | Tantra & Somatic Articles",
          description: "Articles on tantra massage, somatic energy work, and trauma release in Ubud, Bali.",
          url: "/spirituality/blog",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Spirituality", url: "/spirituality" },
          { name: "Blog", url: "/spirituality/blog" },
        ])}
      />

      <div className="container">
        <section className="hero" style={{ paddingBottom: 40 }}>
          <div className="hero-text" style={{ maxWidth: 700 }}>
            <div className="eyebrow">
              <span className="dot"></span> Spirituality Blog
            </div>
            <h1>Articles on Tantra & Somatic Work</h1>
            <p>
              Educational resources on tantra massage, somatic energy work, trauma
              release, and conscious presence. Written from my practice in Ubud, Bali.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Featured Articles</h2>
            <span className="section-note">
              {canonicalPosts.length} canonical article{canonicalPosts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="article-list">
            {canonicalPosts.map((post) => (
              <Link
                key={post.id}
                className="article-card"
                href={post.link}
              >
                <Image
                  className="article-thumb"
                  src={post.image || "/images/og-default.svg"}
                  alt={post.title}
                  width={400}
                  height={225}
                />
                <div className="article-body">
                  {post.tags.length > 0 && (
                    <span className="article-category">{post.tags[0]}</span>
                  )}
                  <span className="article-title">{post.title}</span>
                  <span className="article-sub">{post.excerpt}</span>
                  <div className="article-meta">
                    <span>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : "Recently"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {clusterPosts.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>All Spirituality Topics</h2>
              <span className="section-note">
                {clusterPosts.length} articles across tantra, somatic work, and more.
              </span>
            </div>
            <div className="article-list">
              {clusterPosts.map((article) => (
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
        )}

        <section className="section">
          <div className="card" style={{ textAlign: "center", padding: "40px" }}>
            <h3>Need deeper reading first?</h3>
            <p style={{ marginBottom: 14 }}>
              Browse the full spirituality article library before booking.
            </p>
            <Link className="btn secondary" href="/spirituality/articles" style={{ marginBottom: 18 }}>
              Open Spirituality Articles
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="card" style={{ textAlign: "center", padding: "40px" }}>
            <h3>Ready to Book a Session?</h3>
            <p style={{ marginBottom: 20 }}>
              Professional tantra massage in Ubud, Bali. Available year-round with fast WhatsApp response.
            </p>
            <a
              className="btn primary"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
              target="_blank"
              rel="noopener"
            >
              Book via WhatsApp
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
