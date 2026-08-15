import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { RelatedReading } from "@/components/articles/RelatedReading";

export const metadata = generateMetadata({
  title: "What Happens in a Kyo-tai Session",
  description:
    "A practical guide to a Kyo-tai session: consent, pressure, pacing, energetic intensity, and integration in Max Petrusenko's two-body somatic practice.",
  ogType: "article",
  canonical: absoluteUrl("/spirituality/blog/kyo-tai-session-what-happens"),
  ogImage: "/images/article-covers/spirit-kyo-tai-session.png",
  keywords: [
    "Kyo-tai session",
    "somatic session",
    "bodywork",
    "consent",
    "pressure work",
  ],
});

export default function KyoTaiSessionArticle() {
  return (
    <>
      <JsonLd
        type="Article"
        data={generateArticleSchema({
          title: "What Happens in a Kyo-tai Session",
          description:
            "A practical walkthrough of what happens before, during, and after a Kyo-tai session.",
          image: "/images/article-covers/spirit-kyo-tai-session.svg",
          url: "/spirituality/blog/kyo-tai-session-what-happens",
          datePublished: "2026-03-06",
          dateModified: "2026-03-06",
          author: "Max Petrusenko",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Spirituality", url: "/spirituality" },
          { name: "Blog", url: "/spirituality/blog" },
          { name: "What Happens in a Kyo-tai Session", url: "/spirituality/blog/kyo-tai-session-what-happens" },
        ])}
      />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/spirituality/blog">← Back to Blog</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> Session Guide
            </div>
            <h1>What Happens in a Kyo-tai Session</h1>
            <p className="article-subtitle">
              Kyo-tai works best when the intensity is strong but the structure is
              stronger. Here is how I pace a session so pressure, energy, and trust
              build together instead of fighting each other.
            </p>
            <div className="article-meta">
              <time>March 6, 2026</time>
              <span>•</span>
              <span>6 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/spirit-kyo-tai-session.svg"
              alt="Abstract visual for a Kyo-tai session guide"
              width={1200}
              height={630}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              A Kyo-tai session is not built on surprise. It is built on
              calibration. We want enough precision that stronger energetic and
              physical exchange becomes useful instead of overwhelming.
            </p>

            <h2>1. We set the container first</h2>
            <p>
              Before the session starts, we clarify three things: your intention,
              your current nervous-system state, and your boundaries. I want to know
              whether you need challenge, grounding, release, or clearer contact
              with your body.
            </p>

            <h2>2. We agree on intensity</h2>
            <p>
              Kyo-tai can involve deep pressure, leverage, held contact, and strong
              energetic focus. That does not mean force for its own sake. It means
              we choose a level of intensity that creates signal without making your
              system shut down.
            </p>

            <h2>3. Contact becomes communication</h2>
            <p>
              Once the session begins, I track breath, tone, resistance, and how
              your body gives or withholds weight. Rather than applying a fixed
              routine, I use pressure and rhythm to find where your system starts
              speaking back.
            </p>

            <h2>4. The two-body system forms</h2>
            <p>
              This is the distinct Kyo-tai moment. Instead of "practitioner acts,
              client receives," both bodies begin organizing inside one shared
              rhythm. This is where energetic transmission often becomes stronger:
              more heat, more charge, more release, more clarity.
            </p>

            <h2>5. We regulate as we go</h2>
            <p>
              Strong sessions are not just about pushing deeper. They are about
              moving between activation and settling. I slow things down when the
              system needs digestion and increase pressure when the body is ready to
              meet more.
            </p>

            <h2>6. Integration matters</h2>
            <p>
              We do not end at peak intensity. We land. The last part of the
              session lets the nervous system register what happened and organize it
              into something useful. That may include stillness, breath, tea, or a
              short reflection on what moved most clearly.
            </p>

            <h2>What people often feel</h2>
            <ul>
              <li>Deep muscular release</li>
              <li>Heat and current moving through the body</li>
              <li>Unexpected emotion surfacing cleanly</li>
              <li>A stronger sense of groundedness after the session</li>
              <li>A clearer feeling of inner yes/no boundaries</li>
            </ul>

            <h2>Bottom line</h2>
            <p>
              A Kyo-tai session is intense because it is coherent. Two bodies build
              enough shared organization that stronger physical and energetic signal
              can move through the session without losing clarity.
            </p>
          </div>

          <RelatedReading currentLink="/spirituality/blog/kyo-tai-session-what-happens" />
        </article>
      </div>
    </>
  );
}
