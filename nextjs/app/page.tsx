import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { FaqSection } from "@/components/shared/FaqSection";
import {
  generateWebPageSchema,
  generateWebSiteSchema,
  generateBreadcrumbSchema,
  generateProfessionalServiceSchema,
  generateTechServiceSchema,
  generateHomeFAQSchema,
  generateEnhancedPersonSchema,
  generateScheduleActionSchema,
  generateAggregateRatingSchema,
} from "@/lib/seo/structured-data";
import { fetchArticles, isLocalArticle } from "@/lib/cms/articles";
import { homeFaqEntries } from "@/lib/seo/home-faq";

export const runtime = "edge";

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
    "Max Petrusenko builds calm products and embodied experiences: AI automation for creators and founders, plus Tantra-informed somatic work by request.",
  ogType: "website",
  canonical: absoluteUrl("/"),
});

interface HomePageProps {
  searchParams?: Promise<{
    error?: string;
    error_code?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oauthError = params?.error;
  const oauthErrorCode = params?.error_code;

  if (
    oauthError &&
    (oauthError === "invalid_request" || oauthError === "access_denied" || oauthErrorCode === "bad_oauth_state")
  ) {
    redirect("/workspace/sign-in?error=oauth");
  }

  const articles = await fetchArticles();
  const localArticles = articles.filter((article) => isLocalArticle(article));
  const featuredArticles = (localArticles.length >= 3 ? localArticles : articles).slice(0, 3);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Max Petrusenko — Presence & Product",
          description: "AI automation for creators and founders, plus Tantra-informed somatic work by request.",
          url: "/",
        })}
      />
      <JsonLd type="WebSite" data={generateWebSiteSchema()} />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([{ name: "Home", url: "/" }])}
      />
      <JsonLd type="WebPage" data={generateProfessionalServiceSchema()} />
      <JsonLd type="ProfessionalService" data={generateTechServiceSchema()} />
      <JsonLd type="FAQPage" data={generateHomeFAQSchema()} />
      <JsonLd type="Person" data={generateEnhancedPersonSchema()} />
      <JsonLd type="AggregateRating" data={generateAggregateRatingSchema("all")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tantra")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("mindfold")} />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC05871.jpg"
            alt="Max Petrusenko hero portrait"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 36%" }}
            quality={88}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:grid md:grid-cols-2 md:gap-12 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(14,97,93,0.2)] px-4 py-1 text-xs font-semibold shiny-text">
              Open for Q2 projects
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 font-serif text-[clamp(2.4rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Systems for <span className="text-[0.92em] text-[var(--accent-spirit)]">scale</span>.<br />
              Presence for depth.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[440px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              I build AI automation for SaaS founders and hold somatic space for
              people ready to feel more. Two crafts, one practitioner.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="/tech">
                Book a strategy call &rarr;
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-tech)]" href="/proof">
                Explore my work
              </Link>
            </div>
          </div>
        </section>

      </div>

      <DirectAnswer
        schemaType="WebPage"
        showUi={false}
        question="Who is Max Petrusenko and what services does he offer?"
        answer="Max Petrusenko is a tech builder and somatic practitioner offering two distinct practices. For tech: AI automation consulting with Claude Code, n8n workflows, and ChatGPT integrations that saved one client $253k annually. For somatic: Tantra-informed private sessions for nervous-system regulation and embodied presence, scheduled by request. Text +1-786-543-6688 for availability."
        displayAnswer="Max Petrusenko works across two practices: AI automation for founders and private somatic sessions by request. Recent systems built with Claude Code, n8n, and ChatGPT saved one client $253k annually, while the somatic practice offers boundaries-first tantra and nervous system work by appointment."
      />

      {/* Two Paths dark zone */}
      <section className="dark-zone mt-8 py-16 px-4 md:py-20">
        <div className="absolute inset-0 z-0 opacity-35 mix-blend-screen">
          <Image
            src="/images/generated/home-hero-generated.jpg"
            alt=""
            fill
            sizes="100vw"
            quality={68}
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#121d2e_58%,#152438_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-mindfold)]">Two Paths</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Choose your entry point
          </h2>
          <p className="mt-2 max-w-[520px] text-[var(--dark-zone-muted)]">
            Both paths share the same foundation: clarity, precision, and deep
            attention to how systems actually work.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Link href="/tech" className="dark-zone-card card-stripe-tech group">
              <h3 className="font-serif text-[1.35rem] font-semibold text-[#e2e8f0]">AI Workflow Automation</h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--dark-zone-muted)]">
                Custom pipelines that eliminate repetitive ops. I audit your stack,
                identify bottlenecks, and build automations that save real hours
                every week.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Claude Code</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">n8n</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Make</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Custom Code</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--accent-tech)] transition group-hover:text-white">See case studies &rarr;</p>
            </Link>
            <Link href="/somatic" className="dark-zone-card card-stripe-spirit group">
              <h3 className="font-serif text-[1.35rem] font-semibold text-[#e2e8f0]">Somatic Bodywork</h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--dark-zone-muted)]">
                Breathwork, movement, and hands-on sessions that restore nervous
                system capacity. For founders who build fast and want to feel
                whole doing it.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Breathwork</span>
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Movement</span>
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Mindfold</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--accent-spirit)] transition group-hover:text-white">View approach &rarr;</p>
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {["$253k annual cost savings", "73% fewer production bugs", "4.9/5 client experience rating"].map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-[var(--dark-zone-text)]">
                {metric}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="container">
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
              <h2 className="text-2xl font-semibold text-[var(--ink)] md:text-3xl">Availability</h2>
              <p className="text-sm font-medium text-[var(--muted)]">Somatic work: by request. Tech consulting: remote worldwide.</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-spirit)]">Somatic Work</p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">Private sessions scheduled by request</p>
              </div>
              <div className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-tech)]">Tech Consulting</p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">Remote worldwide; in-person by request while traveling</p>
              </div>
              <div className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-mindfold)]">Contact</p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">hello@maxpetrusenko.com</p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20" style={{ background: "linear-gradient(145deg, #0e1520 0%, #152438 100%)" }}>
        <div className="container">
          <section className="ui-fade-up delay-3 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_48px_rgba(4,10,24,0.2)] backdrop-blur-[10px] md:p-8">
              <h2 className="text-2xl font-semibold text-[#e2e8f0] md:text-3xl">Featured Writing</h2>
              <p className="mt-2 text-sm text-[var(--dark-zone-muted)]">Recent articles on automation systems, product execution, and operator workflows.</p>
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
              <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_48px_rgba(4,10,24,0.2)] backdrop-blur-[10px]">
                <h3 className="text-2xl font-semibold text-[#e2e8f0]">Choose your lane</h3>
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
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="container space-y-8">
          <FaqSection items={homeFaqEntries} columns={2} />
          <EmailCapture />
        </div>
      </section>
    </>
  );
}
