import Link from "next/link";
import Image from "next/image";
import {
  detectTopicSlugFromArticleSlug,
  getLocalArticlesByTag,
  getRelatedLocalArticles,
  getTopicGroupBySlug,
} from "@/lib/cms/articles";

interface RelatedReadingProps {
  currentLink: string;
  title?: string;
  note?: string;
}

export function RelatedReading({
  currentLink,
  title = "Related Reading",
  note,
}: RelatedReadingProps) {
  // Check if this article is in the Bridge cluster
  const slug = currentLink.split("/").pop() ?? "";
  const topicSlug = detectTopicSlugFromArticleSlug(slug);
  const topicGroup = topicSlug ? getTopicGroupBySlug(topicSlug) : null;
  const isBridge = topicGroup?.series === "Bridge";

  // Bridge articles get cross-cluster recommendations (tech + spirituality + bridge)
  const related = isBridge
    ? [
        ...getLocalArticlesByTag("Bridge", 3),
        ...getLocalArticlesByTag("Tech", 2),
        ...getLocalArticlesByTag("Spirituality", 2),
      ]
        .filter(
          (a, idx, arr) =>
            a.link !== currentLink && arr.findIndex((b) => b.id === a.id) === idx
        )
        .slice(0, 3)
    : getRelatedLocalArticles(currentLink);

  if (related.length === 0) {
    return null;
  }

  return (
    <section className="section" style={{ marginTop: 48 }}>
      <div className="section-head">
        <h2>{title}</h2>
        {note ? <span className="section-note">{note}</span> : null}
      </div>
      <div className="article-list">
        {related.map((article) => (
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
    </section>
  );
}
