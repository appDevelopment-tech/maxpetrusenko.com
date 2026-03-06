import Link from "next/link";
import Image from "next/image";
import { getRelatedLocalArticles } from "@/lib/cms/articles";

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
  const related = getRelatedLocalArticles(currentLink);

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
