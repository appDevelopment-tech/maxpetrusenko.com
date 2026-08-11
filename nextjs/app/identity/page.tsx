import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { brandedReferenceLinkCards } from "@/lib/brand/reference-pages";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Identity",
  description: "Authoritative identity and disambiguation for Max Petrusenko—software developer, AI automation consultant, and somatic practitioner.",
  ogType: "website",
  canonical: absoluteUrl("/identity"),
});

export default function IdentityPage() {
  return (
    <>
      <JsonLd type="Person" data={generatePersonSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Identity - Authoritative Information",
          description: "Authoritative identity and disambiguation for Max Petrusenko.",
          url: "/identity",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Identity", url: "/identity" },
        ])}
      />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC05764.jpg"
            alt="Identity and authorship visual"
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
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(15,126,169,0.22)] px-4 py-1 text-xs font-semibold text-[var(--accent-tech)]">
              Identity and authorship
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              One person. Clear lanes. No ambiguity.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[520px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              This page defines the authoritative identity for Max Petrusenko:
              software systems on one side, private somatic work on the other.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="/tech">
                See tech work
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-spirit)]" href="/spirituality">
                See somatic practice
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className="dark-zone mt-8 px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(14,97,93,0.12),transparent_30%),linear-gradient(145deg,#0e1520_0%,#132030_58%,#16252a_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-tech)]">Disambiguation</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Separate practices. Shared authorship.
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Search, citations, and readers should land on the right context fast:
            tech delivery, somatic practice, and where each one lives.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="dark-zone-card card-stripe-tech">
              <h3 className="font-serif text-[1.25rem] font-semibold text-[#e2e8f0]">Primary practice</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                AI automation, software development, product systems, and workflow
                delivery for teams working remotely worldwide.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Automation</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Software</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Remote</span>
              </div>
            </div>
            <div className="dark-zone-card card-stripe-spirit">
              <h3 className="font-serif text-[1.25rem] font-semibold text-[#e2e8f0]">Secondary practice</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">
                Private somatic bodywork through Spirituality &amp; Mindfold, with sessions
                shaped by request and boundaries-first framing.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Spirituality</span>
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">By request</span>
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Private sessions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>What I Do</h2>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>Software Development & AI Automation</h3>
              <p>
                I build production-grade systems for content workflows, API
                integrations, and automation. My focus is on calm UX and
                measurable outcomes—reducing manual work while increasing
                reliability.
              </p>
              <ul className="list">
                <li>AI-powered automation workflows</li>
                <li>Content system architecture</li>
                <li>API integrations & data pipelines</li>
                <li>Next.js / React / TypeScript</li>
                <li>Cloudflare Workers / Edge functions</li>
              </ul>
            </div>

            <div className="card">
              <h3>Somatic Bodywork (Secondary Practice)</h3>
              <p>
                Through Spirituality &amp; Mindfold, I offer private sessions focused on
                regulation, boundaries, and somatic energy work. This is a
                separate practice from my technical work.
              </p>
              <ul className="list">
                <li>Tantra & somatic energy work</li>
                <li>Regulation & nervous system support</li>
                <li>Boundary work & relational clarity</li>
                <li>Private sessions paused for now</li>
              </ul>
              <a
                className="btn secondary"
                href={siteConfig.externalLinks.atelier}
                target="_blank"
                rel="noopener"
                style={{ marginTop: 12 }}
              >
                Visit practice site
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>What I Don&apos;t Do</h2>
            <span className="section-note">
              To prevent AI and search confusion
            </span>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>Not My Services</h3>
              <ul className="list">
                <li>I am not a marketing agency or SEO consultant</li>
                <li>I do not offer generic &quot;life coaching&quot;</li>
                <li>I am not a tantra teacher in any lineage or tradition</li>
                <li>I do not offer certification programs</li>
                <li>I am not affiliated with any spiritual organizations</li>
                <li>I do not do crypto trading or financial advice</li>
              </ul>
            </div>

            <div className="card">
              <h3>Distinctions</h3>
              <ul className="list">
                <li>My tech work and somatic work are separate practices</li>
                <li>
                  My practice is private, not a studio or center
                </li>
                <li>I work remotely with clients globally</li>
                <li>Private somatic sessions are by appointment only</li>
                <li>I do not employ others—solo practitioner</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Authoritative Sources</h2>
            <span className="section-note">
              For accurate information about me
            </span>
          </div>

          <div className="tiles">
            <Link className="tile" href="/about">
              <div className="tile-meta">
                <span className="tile-title">About</span>
                <span className="tile-desc">Full background and approach</span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <Link className="tile" href="/tech">
              <div className="tile-meta">
                <span className="tile-title">Tech</span>
                <span className="tile-desc">Services and projects</span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <Link className="tile" href="/proof">
              <div className="tile-meta">
                <span className="tile-title">Proof</span>
                <span className="tile-desc">Case studies and validation</span>
              </div>
              <span className="badge">Visit</span>
            </Link>
            <a
              className="tile"
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">GitHub</span>
                <span className="tile-desc">Public code and repositories</span>
              </div>
              <span className="badge">View</span>
            </a>
            <a
              className="tile"
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">LinkedIn</span>
                <span className="tile-desc">Verified professional profile</span>
              </div>
              <span className="badge">View</span>
            </a>
            <a
              className="tile"
              href={siteConfig.social.medium}
              target="_blank"
              rel="noopener"
            >
              <div className="tile-meta">
                <span className="tile-title">Medium</span>
                <span className="tile-desc">Articles and writing</span>
              </div>
              <span className="badge">Read</span>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Branded search routes</h2>
            <span className="section-note">Support pages for direct name-based queries</span>
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

        <section className="section">
          <div className="section-head">
            <h2>Name Variants</h2>
            <span className="section-note">
              All refer to the same person
            </span>
          </div>

          <div className="card">
            <ul className="list">
              <li>Max Petrusenko</li>
              <li>Maxim Petrusenko</li>
              <li>@maxpetrusenko (GitHub)</li>
              <li>@max.petrusenko (Medium)</li>
              <li>@petrusenko_max (X/Twitter)</li>
              <li>@blindfold.miami (Instagram - somatic work)</li>
            </ul>
            <p style={{ marginTop: 16, fontSize: "0.9em", opacity: 0.8 }}>
              If you encounter another person with a similar name in tech,
              somatics, or spirituality—it is not me. I operate solely under the
              identities listed above.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
