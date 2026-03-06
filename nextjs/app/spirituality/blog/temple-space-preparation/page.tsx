import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { RelatedReading } from "@/components/articles/RelatedReading";

export const metadata = generateMetadata({
  title: "How I Prepare the Temple Space for Tantra Sessions",
  description:
    "A behind-the-scenes view of how session environment, scent, sound, temperature, and pacing affect nervous-system safety and session quality.",
  ogType: "article",
  canonical: absoluteUrl("/spirituality/blog/temple-space-preparation"),
  ogImage: "/images/article-covers/spirit-temple-space.svg",
  keywords: [
    "session preparation tantra",
    "somatic safety container",
    "tantra session environment",
  ],
});

export default function TempleSpacePreparationPage() {
  return (
    <>
      <JsonLd
        type="Article"
        data={generateArticleSchema({
          title: "How I Prepare the Temple Space for Tantra Sessions",
          description:
            "The practical environment standards that make deep somatic work safer and more effective.",
          image: "/images/article-covers/spirit-temple-space.svg",
          url: "/spirituality/blog/temple-space-preparation",
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
          { name: "Temple Space Preparation", url: "/spirituality/blog/temple-space-preparation" },
        ])}
      />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/spirituality/blog">← Back to Blog</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> Behind the Scenes
            </div>
            <h1>How I Prepare the Temple Space for Tantra Sessions</h1>
            <p className="article-subtitle">
              Space preparation is not aesthetics. It is nervous-system engineering.
              Small environmental decisions directly affect safety, trust, and depth.
            </p>
            <div className="article-meta">
              <time>February 2, 2026</time>
              <span>•</span>
              <span>6 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/spirit-temple-space.svg"
              alt="Temple-like natural setting in Bali"
              width={1600}
              height={900}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              People often ask what makes one session feel transformative and another just
              "nice." The difference is usually the container: environmental clarity +
              relational safety + pacing discipline.
            </p>

            <h2>1) Environment baseline before client arrival</h2>
            <ul>
              <li>Clean surfaces, fresh linens, and reset scent profile</li>
              <li>Stable room temperature (not too cold for down-regulation)</li>
              <li>Low visual noise: no clutter, no aggressive color contrast</li>
              <li>Phone and alert silence for uninterrupted presence</li>
            </ul>

            <h2>2) Sound and rhythm</h2>
            <p>
              Sound should support breath, not dominate it. I use low-intensity ambient audio
              and adjust volume downward when emotional processing begins.
            </p>

            <h2>3) Entry protocol</h2>
            <p>
              The first 5-10 minutes shape the whole session. I never rush the arrival.
              We orient, hydrate, settle, then establish boundaries before any bodywork starts.
            </p>

            <h2>4) Boundary map is part of space setup</h2>
            <p>
              "Safe container" is not only room design. It is explicit communication:
              off-limits zones, touch pressure, draping, and pause language.
            </p>

            <h2>5) Why this matters physiologically</h2>
            <p>
              A dysregulated nervous system scans for threat. Environmental coherence reduces
              scanning load, allowing the body to shift from protective mode into restorative mode.
            </p>

            <h2>6) Post-session reset</h2>
            <p>
              After each session I reset the room fully. Reusing energetic and physical setup
              without reset degrades quality over time.
            </p>

            <h2>Simple checklist clients can use anywhere</h2>
            <ul>
              <li>Does the space feel orderly and private?</li>
              <li>Is consent discussed clearly before touch?</li>
              <li>Do you feel rushed at any point?</li>
              <li>Is there time for integration before leaving?</li>
            </ul>

            <div className="article-cta">
              <h3>Want to book in this exact setup?</h3>
              <p>
                I currently run sessions in Ubud with this boundaries-first container.
              </p>
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%20want%20to%20book%20a%20session%20in%20your%20Ubud%20space."
                target="_blank"
                rel="noopener"
              >
                Book via WhatsApp
              </a>
            </div>
          </div>
          <RelatedReading currentLink="/spirituality/blog/temple-space-preparation" />
</article>
      </div>
    </>
  );
}
