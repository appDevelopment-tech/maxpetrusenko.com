import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Links",
  description: "All the ways to connect with Max Petrusenko—tech, spirituality, and mindfold.",
  ogType: "website",
  canonical: absoluteUrl("/links"),
});

export default function LinksPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Links - All my links in one place",
          description: "All the ways to connect with Max Petrusenko—tech, spirituality, and mindfold.",
          url: "/links",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Links", url: "/links" },
        ])}
      />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC05868.jpg"
            alt="Links and network atmosphere"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            quality={86}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(210,163,93,0.24)] px-4 py-1 text-xs font-semibold text-[var(--accent-mindfold)]">
              Link hub
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Everything worth opening. One page.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[500px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Tech work, Presence Atelier, and Mindfold routes. Start with the
              active offers, then branch into the rest.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="/spirituality">
                Open spirituality
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-tech)]" href="/tech">
                Open tech
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className="dark-zone mt-8 px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(210,163,93,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(14,97,93,0.12),transparent_30%),linear-gradient(145deg,#111826_0%,#191f2a_58%,#241e16_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-mindfold)]">Current focus</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Start with the live paths.
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            The fastest routes into current work, booking, and immersive events.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <a className="dark-zone-card card-stripe-spirit" href={siteConfig.externalLinks.atelier} target="_blank" rel="noopener">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Atelier sessions</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Tantra-informed somatic work by request through Presence Atelier.
              </p>
            </a>
            <a className="dark-zone-card card-stripe-spirit" href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____." target="_blank" rel="noopener">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">WhatsApp</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Fastest path for bookings, availability, and direct questions.
              </p>
            </a>
            <Link className="dark-zone-card card-stripe-mindfold" href="/mindfold/events">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Mindfold events</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Live sensory-subtraction journeys, dates, waivers, and updates.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>Tech & Work</h2>
            <span className="section-note">
              Open the routes you need most.
            </span>
          </div>
          <div className="tiles">
            <a
              className="tile"
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">GitHub</span>
                <span className="tile-desc">Projects and code.</span>
              </div>
              <span className="badge">Open</span>
            </a>
            <a
              className="tile"
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">LinkedIn</span>
                <span className="tile-desc">Profile and work history.</span>
              </div>
              <span className="badge">Connect</span>
            </a>
            <a
              className="tile"
              href={siteConfig.social.medium}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Medium</span>
                <span className="tile-desc">Writing and essays.</span>
              </div>
              <span className="badge">Read</span>
            </a>
            <a
              className="tile"
              href={siteConfig.externalLinks.gumroad}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Gumroad</span>
                <span className="tile-desc">Products and tools.</span>
              </div>
              <span className="badge">Visit</span>
            </a>
            <a
              className="tile"
              href="https://maxpetrusenko.notion.site/Portfolio-e521a73ef4bf41ccaf2e0098edd72c25"
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">FileMaker</span>
                <span className="tile-desc">FileMaker work / portfolio.</span>
              </div>
              <span className="badge">View</span>
            </a>
            <a
              className="tile"
              href="https://maxpetrusenko.gumroad.com/l/zrsxj"
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">X: Make Your Content Visible</span>
                <span className="tile-desc">Content visibility tool.</span>
              </div>
              <span className="badge">Open</span>
            </a>
            <a
              className="tile"
              href={siteConfig.externalLinks.patreon}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Subscribe to Shoutouts</span>
                <span className="tile-desc">Support and get shoutouts.</span>
              </div>
              <span className="badge">Join</span>
            </a>
            <a
              className="tile"
              href="https://substack.com/@cryptobase"
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Cryptobase Newsletter</span>
                <span className="tile-desc">Web3 insights.</span>
              </div>
              <span className="badge">Read</span>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Spirituality & Mindfold</h2>
          </div>
          <div className="tiles">
            <a
              className="tile"
              href={siteConfig.externalLinks.atelier}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Presence Atelier</span>
                <span className="tile-desc">Practice notes, FAQs, and inquiry context.</span>
              </div>
              <span className="badge spirit">Visit</span>
            </a>
            <a
              className="tile"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____."
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Join inquiry list</span>
                <span className="tile-desc">Send a few words about what you’re exploring.</span>
              </div>
              <span className="badge spirit">Message</span>
            </a>
            <Link className="tile" href="/mindfold/events">
              <div className="tile-meta">
                <span className="tile-title">Mindfold Events</span>
                <span className="tile-desc">Blindfolded presence journeys.</span>
              </div>
              <span className="badge mindfold">Explore</span>
            </Link>
            <a
              className="tile"
              href="mailto:hello@maxpetrusenko.com?subject=Inquiry"
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Email</span>
                <span className="tile-desc">
                  Prefer email? Reach out with your intention.
                </span>
              </div>
              <span className="badge spirit">Email</span>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Social</h2>
          </div>
          <div className="social" aria-label="Social links">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              aria-label="Instagram"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="16" height="16" rx="5" ry="5"></rect>
                <circle cx="12" cy="12" r="3.3"></circle>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href={siteConfig.social.linkedin}
              target="_blank"
              aria-label="LinkedIn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-2-2c-1.1 0-2 .9-2 2v6h-4v-6a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="11"></rect>
                <circle cx="4" cy="5" r="2"></circle>
              </svg>
            </a>
            <a href={siteConfig.social.github} target="_blank" aria-label="GitHub">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77 5.44 5.44 0 0 0 3.5 7.7c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <a href={siteConfig.social.twitter} target="_blank" aria-label="Twitter / X">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4l16 16M20 4L4 20"></path>
              </svg>
            </a>
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              aria-label="WhatsApp"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 19l-1 4 4-1a9 9 0 1 0-3-3z"></path>
                <path d="M16 12a4 4 0 0 1-4 4"></path>
                <path d="M12 16a4 4 0 0 1-4-4"></path>
              </svg>
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
