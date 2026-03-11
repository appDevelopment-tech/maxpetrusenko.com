import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { MouseTrackingGradient } from "@/components/motion/MouseTrackingGradient";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateProfessionalServiceSchema,
  generateTechServiceSchema,
  generateHomeFAQSchema,
  generateEnhancedPersonSchema,
  generateScheduleActionSchema,
  generateAggregateRatingSchema,
} from "@/lib/seo/structured-data";
import { fetchArticles, isLocalArticle } from "@/lib/cms/articles";

const StackAnalysisLeadMagnet = dynamic(
  () =>
    import("@/components/forms/StackAnalysisLeadMagnet").then(
      (mod) => mod.StackAnalysisLeadMagnet
    ),
  {
    loading: () => (
      <div className="rounded-[24px] border border-[rgba(12,17,21,0.09)] bg-white/88 p-6 shadow-[0_15px_40px_rgba(12,17,21,0.08)] md:p-8">
        <h3 className="text-2xl font-semibold">Send Me Your Stack</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Loading form...
        </p>
      </div>
    ),
  }
);

const EmailCapture = dynamic(
  () => import("@/components/forms/EmailCapture").then((mod) => mod.EmailCapture)
);

export const metadata = generateMetadata({
  title: "Max Petrusenko — Presence & Product",
  description:
    "Max Petrusenko builds calm products and embodied experiences: AI automation for creators and founders, plus tantra massage and somatic energy work in Ubud and Miami.",
  ogType: "website",
  canonical: absoluteUrl("/"),
});

export default async function HomePage() {
  const articles = await fetchArticles();
  const localArticles = articles.filter((article) => isLocalArticle(article));
  const featuredArticles = (localArticles.length >= 3 ? localArticles : articles).slice(0, 3);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Max Petrusenko — Presence & Product",
          description: "AI automation for creators and founders, plus tantra massage and somatic energy work in Ubud and Miami.",
          url: "/",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([{ name: "Home", url: "/" }])}
      />
      <JsonLd type="ProfessionalService" data={generateProfessionalServiceSchema()} />
      <JsonLd type="ProfessionalService" data={generateTechServiceSchema()} />
      <JsonLd type="FAQPage" data={generateHomeFAQSchema()} />
      <JsonLd type="Person" data={generateEnhancedPersonSchema()} />
      <JsonLd type="AggregateRating" data={generateAggregateRatingSchema("all")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tantra")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("mindfold")} />

      <div className="hero-image-section ui-immersive-hero ui-fade-up delay-1">
        <div className="hero-image-overlay"></div>
        <Image
          src="/images/DSC05871.jpg"
          alt="Max Petrusenko hero portrait"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 36%" }}
          quality={88}
        />
        <div className="hero-image-content">
          <h2>Presence + Product</h2>
          <p>AI systems and embodied practice, built with precision</p>
        </div>
      </div>

      <div className="container">
        <DirectAnswer
          schemaType="WebPage"
          question="Who is Max Petrusenko and what services does he offer?"
          answer="Max Petrusenko is a tech builder and somatic practitioner offering two distinct services. For tech: AI automation consulting with Claude Code, n8n workflows, and ChatGPT integrations that saved one client $253k annually. For somatic: professional tantra massage and energy work in Ubud, Bali and Miami, Florida with 4.9/5 ratings. WhatsApp +1-786-543-6688 for bookings."
          displayAnswer="Max Petrusenko works across two practices: AI automation for founders and private somatic sessions in Ubud and Miami. Recent systems built with Claude Code, n8n, and ChatGPT saved one client $253k annually, while the somatic practice offers boundaries-first tantra and nervous system work by appointment."
        />
      </div>

      <section className="px-4 pb-8 pt-2 md:px-6 md:pb-12">
        <div className="ui-fade-up delay-1 mx-auto max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#070b12] text-white shadow-[0_36px_90px_rgba(4,10,24,0.42)]">
          <div className="relative">
            {/* Mouse-tracking gradient overlay */}
            <MouseTrackingGradient
              color1="rgba(111, 170, 255, 0.12)"
              color2="rgba(95, 227, 188, 0.08)"
              color3="rgba(210, 163, 93, 0.06)"
              intensity={80}
            />
            <div className="hero-grid-motion absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(111,170,255,0.26),transparent_45%),radial-gradient(circle_at_88%_4%,rgba(95,227,188,0.24),transparent_40%),linear-gradient(145deg,#070b12_0%,#0a1220_58%,#0b1623_100%)]" />
            <Image
              src="/images/generated/home-hero-generated.jpg"
              alt="Abstract AI workspace atmosphere"
              fill
              sizes="(max-width: 1024px) 100vw, 1100px"
              quality={68}
              className="hero-bg-image opacity-45"
            />
            <div className="hero-orb hero-orb-left" />
            <div className="hero-orb hero-orb-right" />
            <div className="hero-scan-line" />
            <div className="relative grid gap-10 px-6 pb-10 pt-10 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:pb-14 md:pt-14">
              <div className="ui-fade-up delay-2">
                <p className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/85 animate-pulse-glow">
                  Presence + Product
                </p>
                <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                  Calm execution for products and people.
                </h1>
                <p className="mt-5 max-w-2xl text-base text-slate-200/90 md:text-lg">
                  One operator across two disciplines: shipping AI systems for founders and facilitating embodied somatic sessions in Ubud and Miami.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link className="btn-sheen rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100" href="/tech">
                    Explore Tech Services
                  </Link>
                  <a
                    className="btn-sheen rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session."
                    target="_blank"
                    rel="noopener"
                  >
                    Book Somatic Session
                  </a>
                  <Link className="btn-sheen rounded-xl border border-cyan-200/30 bg-cyan-100/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-100/20" href="/mindfold/events">
                    View Mindfold Events
                  </Link>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {["$253k annual cost savings", "73% fewer production bugs", "4.9/5 client experience rating"].map((metric, index) => (
                    <div key={metric} className={`metric-chip delay-${index + 2} rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-100/95 backdrop-blur`}>
                      {metric}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="floating-card delay-2 rounded-3xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Tech Path</p>
                  <h2 className="mt-2 text-2xl font-semibold">AI Automation</h2>
                  <p className="mt-2 text-sm text-slate-200/90">Claude Code execution, n8n architecture, and conversion-focused product systems.</p>
                  <div className="mock-dashboard mt-4">
                    <div className="mock-line w-[86%]" />
                    <div className="mock-line w-[60%]" />
                    <div className="mock-bars">
                      <span style={{ height: "28%" }} />
                      <span style={{ height: "45%" }} />
                      <span style={{ height: "62%" }} />
                      <span style={{ height: "40%" }} />
                      <span style={{ height: "70%" }} />
                    </div>
                  </div>
                  <Link className="mt-4 inline-flex text-sm font-semibold text-cyan-100 hover:text-white" href="/tech/case-studies">
                    See case studies →
                  </Link>
                </div>
                <div className="floating-card delay-3 rounded-3xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/90">Somatic Path</p>
                  <h2 className="mt-2 text-2xl font-semibold">Embodied Sessions</h2>
                  <p className="mt-2 text-sm text-slate-200/90">Boundaries-first tantra and nervous system work with private booking in Bali and South Florida.</p>
                  <Link className="mt-4 inline-flex text-sm font-semibold text-amber-100 hover:text-white" href="/somatic">
                    View approach →
                  </Link>
                </div>
                <div className="floating-card delay-4 rounded-3xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/90">Follow</p>
                  <h2 className="mt-2 text-2xl font-semibold">Live Notes & Builds</h2>
                  <p className="mt-2 text-sm text-slate-200/90">Build logs, automation experiments, and field updates from sessions and events.</p>
                  <a className="mt-4 inline-flex text-sm font-semibold text-emerald-100 hover:text-white" href={siteConfig.social.twitter} target="_blank" rel="noopener">
                    Follow on X →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-8">
        <section className="ui-fade-up delay-2 rounded-[24px] border border-[rgba(12,17,21,0.09)] bg-white/85 p-6 shadow-[0_15px_40px_rgba(12,17,21,0.08)] md:p-8">
          <div className="ambient-band mb-5 overflow-hidden rounded-2xl border border-[rgba(12,17,21,0.08)]">
            <Image
              src="/images/generated/home-ambient-somatic.jpg"
              alt="Calm ambient background visual"
              width={1536}
              height={1024}
              sizes="(max-width: 768px) 100vw, 960px"
              className="h-[120px] w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--ink)] md:text-3xl">Area Served</h2>
            <p className="text-sm font-medium text-[var(--muted)]">In person: Ubud + South Florida. Remote: worldwide.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-spirit)]">Primary Base</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">Ubud, Gianyar Regency, Bali, Indonesia</p>
            </div>
            <div className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-tech)]">Secondary Base</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">Miami-Fort Lauderdale, Florida, United States</p>
            </div>
            <div className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-mindfold)]">Business Address</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">917 SW 18th Ct, Fort Lauderdale, FL 33315, US</p>
            </div>
          </div>
        </section>

        <section className="ui-fade-up delay-3 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[rgba(12,17,21,0.09)] bg-white/88 p-6 shadow-[0_15px_40px_rgba(12,17,21,0.08)] md:p-8">
            <h2 className="text-2xl font-semibold md:text-3xl">Featured Writing</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Recent articles on automation systems, product execution, and operator workflows.</p>
            <div className="mt-6 grid gap-4">
              {featuredArticles.map((article) => {
                const card = (
                  <>
                    <Image
                      className="h-[130px] w-full rounded-xl object-cover"
                      src={article.image || "/images/og-default.svg"}
                      alt={article.title}
                      width={560}
                      height={320}
                    />
                    <div>
                      <p className="text-base font-semibold text-[var(--ink)]">{article.title}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{article.excerpt}</p>
                    </div>
                  </>
                );

                return isLocalArticle(article) ? (
                  <Link
                    key={article.id}
                    href={article.link}
                    className="grid gap-3 rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4 transition hover:border-[rgba(14,97,93,0.2)] hover:shadow-[0_12px_28px_rgba(12,17,21,0.08)]"
                  >
                    {card}
                  </Link>
                ) : (
                  <a
                    key={article.id}
                    href={article.link}
                    target="_blank"
                    rel="noopener"
                    className="grid gap-3 rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4 transition hover:border-[rgba(14,97,93,0.2)] hover:shadow-[0_12px_28px_rgba(12,17,21,0.08)]"
                  >
                    {card}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <StackAnalysisLeadMagnet source="home-hero" />
            <div className="rounded-[24px] border border-[rgba(12,17,21,0.09)] bg-white/88 p-6 shadow-[0_15px_40px_rgba(12,17,21,0.08)]">
              <h3 className="text-2xl font-semibold">Choose your lane</h3>
              <div className="mt-4 grid gap-3">
                <Link href="/tech" className="rounded-xl border border-[rgba(12,17,21,0.09)] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[rgba(15,126,169,0.3)]">
                  Tech consulting and delivery
                </Link>
                <Link href="/spirituality" className="rounded-xl border border-[rgba(12,17,21,0.09)] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[rgba(14,97,93,0.3)]">
                  Somatic and tantra resources
                </Link>
                <a
                  href={siteConfig.externalLinks.atelier}
                  target="_blank"
                  rel="noopener"
                  className="rounded-xl border border-[rgba(12,17,21,0.09)] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[rgba(210,163,93,0.35)]"
                >
                  Presence Atelier (subdomain)
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <EmailCapture />
    </>
  );
}
