import Link from "next/link";
import Image from "next/image";
import { fetchTopicClusters } from "@/lib/cms/articles";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

export const runtime = "edge";

export const metadata: Metadata = generateMetadata({
  title: "Blog Topic Index",
  description:
    "Topic hub with all AI, GEO/SEO, tooling, somatic, and tantra article clusters published on maxpetrusenko.com.",
  ogType: "website",
  canonical: absoluteUrl("/blog/topics"),
});

export default async function BlogTopicsPage() {
  const clusters = await fetchTopicClusters();
  const totalArticles = clusters.reduce((sum, cluster) => sum + cluster.articles.length, 0);
  const itemList = clusters.flatMap(({ articles }) =>
    articles.map((article) => ({
      name: article.title,
      url: article.link,
    }))
  );

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Blog Topic Index",
          description:
            "Topic hub with all AI, GEO/SEO, tooling, somatic, and tantra article clusters published on maxpetrusenko.com.",
          url: "/blog/topics",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: "Topic Index", url: "/blog/topics" },
        ])}
      />
      <JsonLd
        type="ItemList"
        data={generateItemListSchema(itemList, {
          name: "Blog Topic Cluster Articles",
          description:
            "Canonical index of topic-cluster articles for AI, GEO, SEO, automation, somatic work, and tantra.",
        })}
      />

      <div className="container">
        <section className="hero ui-fade-up delay-2" style={{ paddingBottom: 28 }}>
          <div className="hero-text" style={{ maxWidth: 780 }}>
            <div className="eyebrow">
              <span className="dot"></span> Crawl Hub
            </div>
            <h1>Blog Topic Index</h1>
            <p>
              Central link map for article clusters. This page exists to strengthen crawl discovery and
              make topic navigation faster for humans and search systems.
            </p>
            <p className="text-muted">
              {clusters.length} topic clusters • {totalArticles} cluster articles
            </p>
            <div style={{ marginTop: 12 }}>
              <Link className="btn sm secondary" href="/blog">
                ← Back to Blog
              </Link>
            </div>
          </div>
        </section>
        <section className="ui-fade-up delay-3">
          <div className="ambient-band overflow-hidden rounded-[24px] border border-[rgba(12,17,21,0.09)]">
            <Image
              src="/images/DSC04778.jpg"
              alt="Topic map atmosphere"
              width={1400}
              height={900}
              className="h-[170px] w-full object-cover"
            />
          </div>
        </section>

        <section className="section ui-fade-up delay-3" style={{ paddingTop: 0 }}>
          <div className="card">
            <h2 style={{ marginBottom: 12 }}>Jump to Topic</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {clusters.map(({ topic, articles }) => (
                <a
                  key={topic.slug}
                  href={`#topic-${topic.slug}`}
                  className="tag"
                  style={{ textDecoration: "none" }}
                >
                  {topic.label} ({articles.length})
                </a>
              ))}
            </div>
          </div>
        </section>

        {clusters.map(({ topic, articles }) => (
          <section key={topic.slug} id={`topic-${topic.slug}`} className="section" style={{ paddingTop: 10 }}>
            <div className="section-head">
              <h2>{topic.label}</h2>
              <span className="section-note">
                {articles.length} pages • {topic.series}
              </span>
            </div>
            <div className="card">
              <ul className="list" style={{ marginTop: 0 }}>
                {articles.map((article) => (
                  <li key={article.id}>
                    <Link href={article.link}>{article.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
