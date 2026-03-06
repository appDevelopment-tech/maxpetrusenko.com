import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Spirituality Blog | Tantra & Somatic Articles",
  description: "Articles on tantra massage, somatic energy work, trauma release, and conscious touch in Ubud, Bali. Learn what to expect and how to prepare for your session.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality/blog"),
});

const BLOG_POSTS = [
  {
    slug: "what-is-kyo-tai",
    title: "What Is Kyo-tai? A Two-Body Somatic Practice",
    excerpt: "Kyo-tai is my name for a two-body practice that blends contact, pressure, rhythm, and energetic transmission into one listening system.",
    image: "/images/og-default.svg",
    date: "2026-03-06",
    readTime: "7 min read",
    category: "Modality",
  },
  {
    slug: "kyo-tai-session-what-happens",
    title: "What Happens in a Kyo-tai Session",
    excerpt: "A practical walkthrough of consent, pacing, pressure, energetic intensity, and integration inside a Kyo-tai session.",
    image: "/images/og-default.svg",
    date: "2026-03-06",
    readTime: "6 min read",
    category: "Session Guide",
  },
  {
    slug: "what-to-expect-first-tantra-session",
    title: "What to Expect in Your First Tantra Massage Session",
    excerpt: "Nervous about your first tantra session? This guide walks you through everything from arrival to integration, so you can feel prepared and at ease.",
    image: "/images/article-covers/spirit-first-session.svg",
    date: "2026-02-02",
    readTime: "6 min read",
    category: "Beginner's Guide",
  },
  {
    slug: "questions-to-ask-tantra-practitioner",
    title: "5 Questions to Ask Before Booking a Tantra Massage",
    excerpt: "Not all tantra practitioners are the same. Here are the essential questions to ask to ensure safety, professionalism, and alignment.",
    image: "/images/article-covers/spirit-questions-screening.svg",
    date: "2026-02-02",
    readTime: "7 min read",
    category: "Safety & Boundaries",
  },
  {
    slug: "tantra-vs-regular-massage",
    title: "Tantra vs. Regular Massage: What's the Difference?",
    excerpt: "Understanding the key differences between tantra massage and traditional spa massage. Learn about nervous system work, energy awareness, and conscious presence.",
    image: "/images/article-covers/spirit-vs-massage.svg",
    date: "2026-02-02",
    readTime: "8 min read",
    category: "Educational",
  },
  {
    slug: "temple-space-preparation",
    title: "How I Prepare the Temple Space for Tantra Sessions",
    excerpt: "A behind-the-scenes look at how I create a sacred, safe container for tantra work in Ubud. From temperature to scent to energetic clearing.",
    image: "/images/article-covers/spirit-temple-space.svg",
    date: "2026-02-02",
    readTime: "6 min read",
    category: "Behind the Scenes",
  },
];

export default function SpiritualityBlogPage() {
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
            <h2>Latest Articles</h2>
            <span className="section-note">
              {BLOG_POSTS.length} article{BLOG_POSTS.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="article-list">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                className="article-card"
                href={`/spirituality/blog/${post.slug}`}
              >
                <Image
                  className="article-thumb"
                  src={post.image}
                  alt={post.title}
                  width={400}
                  height={225}
                />
                <div className="article-body">
                  <span className="article-category">{post.category}</span>
                  <span className="article-title">{post.title}</span>
                  <span className="article-sub">{post.excerpt}</span>
                  <div className="article-meta">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

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
