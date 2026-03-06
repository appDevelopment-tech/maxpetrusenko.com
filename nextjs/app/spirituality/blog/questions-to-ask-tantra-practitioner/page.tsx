import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { RelatedReading } from "@/components/articles/RelatedReading";

export const metadata = generateMetadata({
  title: "5 Questions to Ask Before Booking a Tantra Practitioner",
  description:
    "A practical screening guide for choosing a tantra practitioner: consent process, boundaries, trauma literacy, hygiene, and integration support.",
  ogType: "article",
  canonical: absoluteUrl("/spirituality/blog/questions-to-ask-tantra-practitioner"),
  ogImage: "/images/article-covers/spirit-questions-screening.svg",
  keywords: [
    "how to choose tantra practitioner",
    "tantra boundaries",
    "trauma-informed tantra",
    "tantra practitioner safety",
  ],
});

export default function QuestionsToAskTantraPractitionerPage() {
  return (
    <>
      <JsonLd
        type="Article"
        data={generateArticleSchema({
          title: "5 Questions to Ask Before Booking a Tantra Practitioner",
          description:
            "A screening checklist for safety, boundaries, and professional quality before booking tantra work.",
          image: "/images/article-covers/spirit-questions-screening.svg",
          url: "/spirituality/blog/questions-to-ask-tantra-practitioner",
          datePublished: "2026-02-02",
          dateModified: "2026-02-02",
          author: "Max Petrusenko",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Spirituality", url: "/spirituality" },
          { name: "Blog", url: "/spirituality/blog" },
          { name: "Questions to Ask a Tantra Practitioner", url: "/spirituality/blog/questions-to-ask-tantra-practitioner" },
        ])}
      />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/spirituality/blog">← Back to Blog</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> Safety & Boundaries
            </div>
            <h1>5 Questions to Ask Before Booking a Tantra Practitioner</h1>
            <p className="article-subtitle">
              A good tantra session starts before touch begins. These questions help you
              identify professionalism, trauma literacy, and real boundary culture.
            </p>
            <div className="article-meta">
              <time>February 2, 2026</time>
              <span>•</span>
              <span>7 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/spirit-questions-screening.svg"
              alt="Calm mountain atmosphere representing grounded spiritual practice"
              width={1344}
              height={768}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              If a practitioner avoids clear answers about boundaries, consent, or process,
              that is already an answer. You do not need to guess your safety.
            </p>

            <h2>Question 1: How do you handle consent during the session?</h2>
            <p>
              Look for language like: "ongoing consent," "you can pause anytime," and
              "we check in during the session." Avoid practitioners who treat consent as a
              one-time form or who frame discomfort as something to "push through."
            </p>

            <h2>Question 2: What is your boundary process?</h2>
            <p>
              A professional practitioner should describe a concrete boundary map before the
              session starts: touch zones, off-limits areas, draping rules, and ways to change
              boundaries in real time.
            </p>

            <h2>Question 3: What training do you have in trauma-informed work?</h2>
            <p>
              Trauma literacy matters. Ask what they do when a client dissociates, freezes,
              becomes overwhelmed, or has a strong emotional release. "I trust intuition" is
              not enough on its own.
            </p>

            <h2>Question 4: What does your session structure look like?</h2>
            <p>
              Good structure is usually: arrival and conversation, boundary setting, grounding,
              bodywork, then integration. If the practitioner skips preparation and jumps straight
              into touch, quality usually drops.
            </p>

            <h2>Question 5: What support do you offer after the session?</h2>
            <p>
              Integration is part of the work. Ask whether they provide aftercare guidance,
              nervous-system practices, or post-session check-in options.
            </p>

            <h2>Red flags to treat seriously</h2>
            <ul>
              <li>Pressure to decide quickly or pay immediately without clarity</li>
              <li>Dismissive tone around boundaries</li>
              <li>No clear hygiene process or private session conditions</li>
              <li>Claims of "guaranteed healing" with no nuance</li>
              <li>Vague answers when you ask direct safety questions</li>
            </ul>

            <h2>Bottom line</h2>
            <p>
              A high-quality practitioner welcomes precise questions. If someone gets defensive
              when you ask about consent and boundaries, do not rationalize it.
            </p>

            <div className="article-cta">
              <h3>Want to ask me these questions directly?</h3>
              <p>
                Message me on WhatsApp and I will answer every item before you book.
              </p>
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%20have%20questions%20about%20boundaries%20and%20booking%20before%20a%20session."
                target="_blank"
                rel="noopener"
              >
                Ask on WhatsApp
              </a>
            </div>
          </div>
          <RelatedReading currentLink="/spirituality/blog/questions-to-ask-tantra-practitioner" />
</article>
      </div>
    </>
  );
}
