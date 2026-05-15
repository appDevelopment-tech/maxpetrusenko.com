import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { RelatedReading } from "@/components/articles/RelatedReading";

export const metadata = generateMetadata({
  title: "What Is Kyo-tai? A Two-Body Somatic Practice",
  description:
    "Kyo-tai is Max Petrusenko's name for a two-body somatic practice that blends contact improvisation, bodywork, pressure, rhythm, and energetic transmission inside a consent-led container.",
  ogType: "article",
  canonical: absoluteUrl("/spirituality/blog/what-is-kyo-tai"),
  ogImage: "/images/article-covers/spirit-kyo-tai.svg",
  keywords: [
    "Kyo-tai",
    "somatic practice",
    "contact improvisation",
    "bodywork",
    "energy work",
    "private practice",
  ],
});

export default function WhatIsKyoTaiArticle() {
  return (
    <>
      <JsonLd
        type="Article"
        data={generateArticleSchema({
          title: "What Is Kyo-tai? A Two-Body Somatic Practice",
          description:
            "A practical definition of Kyo-tai as a two-body somatic practice shaped by contact, bodywork, and energetic listening.",
          image: "/images/article-covers/spirit-kyo-tai.svg",
          url: "/spirituality/blog/what-is-kyo-tai",
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
          { name: "What Is Kyo-tai?", url: "/spirituality/blog/what-is-kyo-tai" },
        ])}
      />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/spirituality/blog">← Back to Blog</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> Modality
            </div>
            <h1>What Is Kyo-tai? A Two-Body Somatic Practice</h1>
            <p className="article-subtitle">
              Kyo-tai is my term for a two-body practice where contact, pressure,
              rhythm, and energetic transmission create one shared listening
              system. It is not a routine massage and not a performance. It is
              relational bodywork with clear intensity, clear consent, and clear
              purpose.
            </p>
            <div className="article-meta">
              <time>March 6, 2026</time>
              <span>•</span>
              <span>7 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/spirit-kyo-tai.svg"
              alt="Abstract visual for Kyo-tai two-body somatic practice"
              width={1200}
              height={630}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              People often ask whether Kyo-tai is a style of massage, a contact
              improvisation practice, or an energetic ritual. The honest answer is
              that it borrows from all three but sits cleanly inside none of them.
              Kyo-tai is the name I use for a specific two-body modality in my work.
            </p>

            <h2>What the name means in my practice</h2>
            <p>
              I use <strong>Kyo-tai</strong> as a practice name rather than as a
              claim about some fixed classical term. For me, <strong>tai</strong>{" "}
              points to the body, form, and direct physical intelligence of the
              session. <strong>Kyo</strong> points to the shared field that appears
              when two bodies stop operating as separate performers and begin
              listening as one moving system.
            </p>
            <p>
              That is the core idea: two bodies, one field of attention.
            </p>

            <h2>How it differs from standard massage</h2>
            <ul>
              <li>The body is not treated as a passive surface.</li>
              <li>Pressure and leverage are used to wake response, not only relax tissue.</li>
              <li>Rhythm matters as much as technique.</li>
              <li>Contact becomes dialog rather than sequence.</li>
              <li>Energetic intensity is guided, not randomly amplified.</li>
            </ul>

            <h2>How contact improvisation shows up</h2>
            <p>
              Contact improvisation teaches weight sharing, listening through
              pressure, and letting movement emerge from relationship instead of
              choreography. Kyo-tai carries those principles into a more focused
              bodywork container. Instead of dancing for expression, we use the
              same relational intelligence to work with tension, breath, charge,
              trust, and transmission.
            </p>

            <h2>What happens energetically</h2>
            <p>
              In Kyo-tai, the goal is not vague spirituality. The goal is stronger
              signal. When two regulated bodies organize around the same rhythm,
              intention, and contact, charge moves more clearly. That may feel like
              heat, trembling, emotion, pressure release, or a sudden drop into
              stillness.
            </p>
            <p>
              I think of it as creating enough coherence that stronger energies can
              move through the system without becoming chaos.
            </p>

            <h2>Why boundaries matter more when intensity rises</h2>
            <p>
              Stronger energy is only useful when the container is stronger too.
              That means explicit agreements about pressure, pace, clothing,
              off-limits areas, and stop signals. Kyo-tai is not "anything goes."
              It works because the boundaries are more defined, not less.
            </p>

            <h2>Who this practice is for</h2>
            <ul>
              <li>People who want more than soothing touch.</li>
              <li>People who can stay present while intensity increases.</li>
              <li>Creators, founders, movers, and seekers who respond well to embodied feedback.</li>
              <li>Clients looking for a practice that is intimate, non-routine, and highly relational.</li>
            </ul>

            <h2>Who it is not for</h2>
            <ul>
              <li>Anyone wanting a generic spa massage.</li>
              <li>Anyone hoping ambiguity will replace consent.</li>
              <li>Anyone in a highly unstable or dysregulated state who needs gentler pacing first.</li>
            </ul>

            <h2>Bottom line</h2>
            <p>
              Kyo-tai is my name for a body-based relational practice where two
              bodies organize into one listening system so stronger energy can move
              safely, clearly, and with purpose. If tantra massage is often about
              softening and opening, Kyo-tai can be the deeper edge where pressure,
              contact, and coherence create faster change.
            </p>

            <div className="card" style={{ marginTop: 28 }}>
              <h3 style={{ marginBottom: 10 }}>Want to feel whether this is for you?</h3>
              <p>
                Message me with your experience level, what kind of intensity you
                respond well to, and whether you want a gentler or stronger first
                session.
              </p>
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20Kyo-tai.%20My%20experience%20with%20bodywork%20is%20____.%20I%20usually%20respond%20better%20to%20____%20intensity."
                target="_blank"
                rel="noopener"
                style={{ marginTop: 14 }}
              >
                Ask about Kyo-tai
              </a>
            </div>
          </div>

          <RelatedReading currentLink="/spirituality/blog/what-is-kyo-tai" />
        </article>
      </div>
    </>
  );
}
