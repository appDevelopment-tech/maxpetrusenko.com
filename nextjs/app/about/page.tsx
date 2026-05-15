import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { brandedReferenceLinkCards } from "@/lib/brand/reference-pages";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "About Max Petrusenko",
  description: "About Max Petrusenko—tech builder and somatic practitioner.",
  ogType: "website",
  canonical: absoluteUrl("/about"),
});

export default function AboutPage() {
  return (
    <>
      <JsonLd type="Person" data={generatePersonSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "About Max Petrusenko",
          description: "Tech builder and somatic practitioner.",
          url: "/about",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ])}
      />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC04778.jpg"
            alt="Warm light at the Presence Atelier entrance"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            quality={85}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(210,163,93,0.24)] px-4 py-1 text-xs font-semibold text-[var(--accent-mindfold)]">
              About Max
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Presence and product, kept distinct.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[500px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              I build calm software systems for teams and hold private somatic work
              in a separate practice. Same operator. Different containers.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="/links">
                Open link hub
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-mindfold)]"
                href="mailto:hello@maxpetrusenko.com?subject=Hello"
                target="_blank"
                rel="noopener"
              >
                Contact Max
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="dark-zone mt-8 px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(210,163,93,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(14,97,93,0.12),transparent_30%),linear-gradient(145deg,#111826_0%,#1a2231_58%,#221a16_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-mindfold)]">Fast facts</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Two practices. One operating style.
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Technical delivery, private somatic work, and Mindfold all share the
            same bias toward clarity, pacing, and direct experience.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="dark-zone-card card-stripe-tech">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Tech</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Product shaping, automation builds, and internal systems for teams
                that want cleaner ops.
              </p>
            </div>
            <div className="dark-zone-card card-stripe-spirit">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Atelier</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Private tantra and somatic sessions with boundaries first and
                nervous-system pacing.
              </p>
            </div>
            <div className="dark-zone-card card-stripe-mindfold">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Mindfold</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Sensory subtraction journeys built for presence, trust, and deeper
                perception.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>Working together</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Tech</h3>
              <p>
                Product shaping, design/dev, automation. Calm UX and measurable
                outcomes.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn secondary" href="/tech">
                  See tech
                </Link>
              </div>
            </div>
            <div className="card">
              <h3>Spirituality</h3>
              <p>
                Sessions focused on regulation, boundaries, and depth.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn primary" href="/spirituality">
                  See spirituality
                </Link>
              </div>
            </div>
            <div className="card">
              <h3>Mindfold</h3>
              <p>Blindfolded presence journeys for perception and trust.</p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn secondary" href="/mindfold/events">
                  Visit
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Branded reference pages</h2>
            <span className="section-note">Direct routes for name-based search queries</span>
          </div>
          <div className="tiles">
            {brandedReferenceLinkCards.map((card) => (
              <Link key={card.href} className="tile" href={card.href}>
                <div className="tile-meta">
                  <span className="tile-title">{card.title}</span>
                  <span className="tile-desc">{card.description}</span>
                </div>
                <span className="badge">{card.badge}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
