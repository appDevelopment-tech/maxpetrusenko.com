import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getLocalArticles } from "@/lib/cms/articles";

const ARTICLES = [
  {
    href: "/spirituality/articles/tantra-trauma-ptsd",
    title: "Tantra Massage for Trauma & PTSD",
    excerpt:
      "How trauma-informed somatic touch supports nervous system regulation, emotional processing, and long-term integration.",
    image: "/images/article-covers/spirit-trauma-ptsd.svg",
    category: "Trauma & Nervous System",
  },
  {
    href: "/spirituality/blog/what-to-expect-first-tantra-session",
    title: "What to Expect in Your First Tantra Session",
    excerpt:
      "A practical first-timer guide: booking, boundaries, consent, pacing, and aftercare in real sessions.",
    image: "/images/article-covers/spirit-first-session.svg",
    category: "First Session Guide",
  },
  {
    href: "/spirituality/blog/questions-to-ask-tantra-practitioner",
    title: "Questions to Ask Before Booking a Tantra Practitioner",
    excerpt:
      "How to screen for professional standards, trauma awareness, and explicit boundary practices.",
    image: "/images/article-covers/spirit-questions-screening.svg",
    category: "Safety",
  },
  {
    href: "/spirituality/blog/tantra-vs-regular-massage",
    title: "Tantra vs Regular Massage",
    excerpt:
      "What is different in intention, pacing, nervous-system orientation, and integration expectations.",
    image: "/images/article-covers/spirit-vs-massage.svg",
    category: "Education",
  },
  {
    href: "/spirituality/blog/temple-space-preparation",
    title: "How Temple Space Preparation Affects Session Quality",
    excerpt:
      "The environmental details that directly influence safety, down-regulation, and quality of embodied work.",
    image: "/images/article-covers/spirit-temple-space.svg",
    category: "Practice Notes",
  },
];

export const metadata = generateMetadata({
  title: "Spirituality Articles",
  description:
    "Spirituality and somatic practice articles by Max Petrusenko: tantra boundaries, trauma-aware touch, and practical session preparation.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality/articles"),
  keywords: [
    "tantra session preparation",
    "somatic healing",
    "tantra boundaries",
    "trauma-informed bodywork",
    "nervous system regulation",
  ],
});

export default function SpiritualityArticlesIndexPage() {
  const localSpiritualityArticles = getLocalArticles()
    .filter((article) => article.link.startsWith("/spirituality/"))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Spirituality Articles",
          description:
            "Articles on tantra, somatic practice, and nervous-system regulation from real sessions by request.",
          url: "/spirituality/articles",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Spirituality", url: "/spirituality" },
          { name: "Articles", url: "/spirituality/articles" },
        ])}
      />

      <div className="container">
        <article className="page">
          <section className="section ui-fade-up delay-2" style={{ marginTop: 0 }}>
            <Link href="/spirituality" className="btn sm secondary" style={{ marginBottom: 20, display: "inline-flex" }}>
              ← Back to Spirituality
            </Link>

            <header style={{ maxWidth: 860, margin: "0 auto" }}>
              <div className="eyebrow">
                <span className="dot"></span> Spirituality &amp; Mindfold Writing
              </div>
              <h1 className="text-display" style={{ marginBottom: 12 }}>
                Spirituality Articles
              </h1>
              <p className="text-xl text-muted" style={{ marginBottom: 0 }}>
                Practical writing from real session work by request: boundaries,
                consent, nervous-system literacy, and preparation that actually helps.
              </p>
            </header>
            <div className="ambient-band" style={{ maxWidth: 920, margin: "24px auto 0", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(12,17,21,0.09)" }}>
              <Image
                src="/images/DSC05764.jpg"
                alt="Somatic atmosphere"
                width={1600}
                height={900}
                style={{ width: "100%", height: 180, objectFit: "cover", objectPosition: "center" }}
              />
            </div>

            <div className="article-list" style={{ maxWidth: 920, margin: "32px auto 0" }}>
              {localSpiritualityArticles.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="section-head" style={{ marginBottom: 16 }}>
                    <h2>Featured On-Site</h2>
                    <span className="section-note">Canonical articles published here.</span>
                  </div>
                  <div className="article-list" style={{ marginBottom: 24 }}>
                    {localSpiritualityArticles.map((article) => (
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
              {ARTICLES.map((article) => (
                <Link key={article.href} href={article.href} className="article-card">
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
                      <span className="stat">{article.category}</span>
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
