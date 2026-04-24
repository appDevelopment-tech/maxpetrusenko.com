import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Bot, Globe, MapPin, Sparkles, Trees } from "lucide-react";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { EmailCaptureInline } from "@/components/forms/EmailCaptureInline";
import { FaqSection } from "@/components/shared/FaqSection";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { fetchArticles, isLocalArticle } from "@/lib/cms/articles";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateTechServiceSchema,
  generateTechFAQSchema,
  generateScheduleActionSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Tech",
  description: "AI automation consultant specializing in Claude Code, n8n workflows, and ChatGPT integrations. Available remotely worldwide and in-person in Miami, Ubud Bali, and globally while traveling.",
  ogType: "website",
  canonical: absoluteUrl("/tech"),
});

export default async function TechPage() {
  const articles = await fetchArticles();
  const techArticles = articles.filter((article) =>
    article.link.startsWith("/tech/") ||
    article.tags.some((tag) => tag.toLowerCase() === "tech")
  );
  const recentArticles = (techArticles.length >= 3 ? techArticles : articles).slice(0, 3);
  const featuredOperatorApps = [
    {
      title: "Agent Persona",
      href: "https://agent-persona.org",
      image: "/images/tech-apps/agent-persona.png",
      alt: "Agent Persona homepage with AI personality hiring workflow",
      eyebrow: "Agent operations",
      description:
        "Hiring surface for personality-led agents and operator roles. Clear conversion path, sharper positioning, and an AI-native funnel that turns curiosity into qualified leads.",
      tags: ["Hiring", "Lead Flow", "AI Product"],
      icon: Bot,
    },
    {
      title: "SMM Agent",
      href: "https://smmagent.app",
      image: "/images/tech-apps/smm-agent.png",
      alt: "SMM Agent landing page with AI social media positioning",
      eyebrow: "Social ops",
      description:
        "Operator-facing layer for source-backed drafts, reply queues, schedules, model-key controls, and approval-aware publishing across the social product stack.",
      tags: ["Social AI", "Replies", "Scheduling"],
      icon: Sparkles,
    },
  ];
  const recentProductApps = [
    {
      title: "ClawPoster",
      href: "https://clawposter.app",
      image: "/images/tech-apps/clawposter.png",
      alt: "ClawPoster AI social publishing command center",
      description:
        "AI social publishing agent with source-backed drafts, platform-native adaptation, model-key controls, schedules, replies, and multi-brand publishing operations.",
      tags: ["AI Social", "Agents", "Publishing", "Next.js"],
    },
    {
      title: "OpenClaw Factory",
      href: "https://software-factory.maxpetrusenko.com",
      image: "/images/tech-apps/openclaw-factory.png",
      alt: "OpenClaw Factory agent workspace with tickets and preview panel",
      description:
        "Agentic software factory with Athena orchestration, live ticket planning, multi-agent worktrees, health telemetry, preview controls, and a factory event stream.",
      tags: ["Software Factory", "Athena", "Multi-Agent", "Telemetry"],
    },
    {
      title: "CollabBoard",
      href: "https://colabboard.maxpetrusenko.com",
      image: "/images/tech-apps/collabboard.png",
      alt: "CollabBoard realtime collaborative whiteboard login screen",
      description:
        "Realtime collaborative whiteboard with multi-user sync, AI board commands, React and Vite UI, Konva canvas, and Firebase-backed presence.",
      tags: ["Realtime", "Konva", "Firebase", "AI Commands"],
    },
    {
      title: "AI Math Tutor",
      href: "https://aitutor.maxpetrusenko.com",
      image: "/images/tech-apps/ai-math-tutor.png",
      alt: "AI Math Tutor landing page with tutor avatar",
      description:
        "Realtime voice tutoring stack with FastAPI WebSockets, pluggable STT and LLM providers, Cartesia speech, and switchable 2D SVG or 3D Three.js avatars.",
      tags: ["Voice AI", "FastAPI", "Three.js", "Deepgram"],
    },
  ];

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Tech - Calm, outcome-first products",
          description: "I build tools and experiences for creators and founders.",
          url: "/tech",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
        ])}
      />
      <JsonLd
        type="ProfessionalService"
        data={generateTechServiceSchema()}
      />
      <JsonLd
        type="FAQPage"
        data={generateTechFAQSchema()}
      />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      {/* Hero portrait background */}
      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/tech-portrait.jpg"
            alt="Max Petrusenko in studio"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            quality={92}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(15,126,169,0.2)] px-4 py-1 text-xs font-semibold text-[var(--accent-tech)]">
              Open for automation builds
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Calm systems for faster delivery.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[460px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              I build AI automation, internal tools, and operator workflows for
              founders and teams who want less drag and more momentum.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]"
                href="mailto:hello@maxpetrusenko.com?subject=Tech%20collab"
              >
                Book a strategy call &rarr;
              </a>
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
        question="What AI automation services does Max Petrusenko offer?"
        answer="Max Petrusenko helps founders and teams ship AI automations and internal tools in weeks, not months. His work focuses on Claude Code, n8n, and custom agent pipelines that reduce ops load, speed delivery, and replace fragile SaaS workflows. Engagements are hands-on, outcome-driven, and production-ready. A recent Claude Code implementation saved $253k annually with 3x faster feature delivery."
        displayAnswer="Max Petrusenko designs and ships AI automations, internal tools, and agent workflows for founders and teams. Core work centers on Claude Code, n8n, and custom pipelines built to cut ops load, speed delivery, and replace brittle manual workflows."
      />

      <section className="dark-zone mt-8 py-16 px-4 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#121d2e_58%,#152438_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-tech)]">Tech focus</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Build the system, not another bottleneck
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Product shaping, automation delivery, and workflow design for teams that
            want cleaner ops and faster shipping.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="dark-zone-card card-stripe-tech">
              <h3 className="font-serif text-[1.35rem] font-semibold text-[#e2e8f0]">Current highlights</h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--dark-zone-muted)]">
                Operator-focused products and delivery systems already in use.
              </p>
              <div className="mt-4 grid gap-3">
                <a
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20"
                  href="https://maxpetrusenko.gumroad.com/l/zrsxj"
                  target="_blank"
                  rel="noopener"
                >
                  <p className="text-sm font-semibold text-[#e2e8f0]">Make Your Content Visible on X</p>
                  <p className="mt-1 text-sm text-[var(--dark-zone-muted)]">Visibility tooling for creators.</p>
                </a>
                <a
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20"
                  href="https://maxpetrusenko.notion.site/Portfolio-e521a73ef4bf41ccaf2e0098edd72c25"
                  target="_blank"
                  rel="noopener"
                >
                  <p className="text-sm font-semibold text-[#e2e8f0]">FileMaker Builds</p>
                  <p className="mt-1 text-sm text-[var(--dark-zone-muted)]">Custom systems for ops and media.</p>
                </a>
              </div>
            </div>

            <div className="dark-zone-card card-stripe-tech">
              <h3 className="font-serif text-[1.35rem] font-semibold text-[#e2e8f0]">Core services</h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--dark-zone-muted)]">
                Hands-on implementation across product, automation, and delivery.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Claude Code</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">n8n</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">ChatGPT API</span>
                <span className="rounded-md bg-[rgba(15,126,169,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-tech)]">Internal Tools</span>
              </div>
              <p className="mt-4 text-sm text-[var(--dark-zone-muted)]">
                Best for: product shaping, workflow automation, and calm execution.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {["$253k annual savings", "3x faster delivery", "73% fewer production bugs"].map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-[var(--dark-zone-text)]">
                {metric}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="container space-y-8">
          {/* Email capture for tech updates */}
          <section className="section ui-fade-up delay-3">
            <EmailCaptureInline
              source="tech-page"
              headline="Get automation tips & updates"
              subtitle="Drop your email for Claude Code guides, n8n workflows, and automation insights."
              buttonText="Subscribe"
            />
          </section>

          {/* Services Overview - AI-extractable service details */}
          <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>Services Overview</h2>
            <span className="section-note">
              Clear pricing, flexible delivery, global availability
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Claude Code Setup</h3>
              <ul className="list" style={{ marginTop: 12, marginBottom: 16 }}>
                <li>Sub-agent configuration</li>
                <li>Custom skills development</li>
                <li>Workflow integration</li>
                <li>Team training</li>
              </ul>
              <p className="text-sm text-muted">
                <strong>Delivery:</strong> Remote worldwide, 1-3 weeks
              </p>
              <p className="text-sm text-muted">
                <strong>Pricing:</strong> Project-based or retainer
              </p>
            </div>
            <div className="card">
              <h3>n8n Automation</h3>
              <ul className="list" style={{ marginTop: 12, marginBottom: 16 }}>
                <li>Workflow design & build</li>
                <li>API integrations</li>
                <li>Custom node development</li>
                <li>Error handling & monitoring</li>
              </ul>
              <p className="text-sm text-muted">
                <strong>Delivery:</strong> Remote worldwide, 2-6 weeks
              </p>
              <p className="text-sm text-muted">
                <strong>Pricing:</strong> Per-workflow or monthly
              </p>
            </div>
            <div className="card">
              <h3>ChatGPT Integration</h3>
              <ul className="list" style={{ marginTop: 12, marginBottom: 16 }}>
                <li>API integration</li>
                <li>Prompt engineering</li>
                <li>RAG implementation</li>
                <li>Fine-tuning</li>
              </ul>
              <p className="text-sm text-muted">
                <strong>Delivery:</strong> Remote worldwide, 2-8 weeks
              </p>
              <p className="text-sm text-muted">
                <strong>Pricing:</strong> Project-based
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
            <p className="text-muted">
              <strong>Availability:</strong> Remote worldwide · In-person in Miami FL, Ubud Bali · Currently traveling: Dubai → Athens → Lisbon
            </p>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=Tech%20collab"
              style={{ marginTop: 12 }}
            >
              Get Started
            </a>
          </div>
          </section>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20" style={{ background: "linear-gradient(145deg, #0e1520 0%, #152438 100%)" }}>
        <div className="container space-y-8">
          <section className="section">
          <div className="section-head">
            <h2 className="!text-[#e2e8f0]">AI & Automation Services</h2>
            <span className="section-note !text-[var(--dark-zone-muted)]">Specialized expertise for modern builders.</span>
          </div>
          <div className="cards-3 grid">
            <div className="card card-with-actions">
              <h3>Claude Code</h3>
              <p>
                Setup and optimization for development teams. Sub-agent
                configuration, custom skills, workflow integration, and
                multi-agent systems.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <a
                  className="btn secondary"
                  href="/tech/articles/claude-code-setup"
                >
                  Read guide
                </a>
              </div>
            </div>
            <div className="card card-with-actions">
              <h3>n8n Automation</h3>
              <p>
                Workflow automation connecting your tools. API integrations,
                data pipelines, custom nodes. From simple triggers to complex
                multi-step flows.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <a
                  className="btn secondary"
                  href="https://n8n.io"
                  target="_blank"
                  rel="noopener"
                >
                  About n8n
                </a>
              </div>
            </div>
            <div className="card card-with-actions">
              <h3>ChatGPT Integration</h3>
              <p>
                Integrate OpenAI's API into your products. Custom prompts,
                function calling, RAG with vector databases, fine-tuning for
                domain expertise.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <a
                  className="btn secondary"
                  href="mailto:hello@maxpetrusenko.com?subject=ChatGPT%20integration"
                  target="_blank"
                  rel="noopener"
                >
                  Discuss
                </a>
              </div>
            </div>
          </div>
          </section>

          <section className="section">
          <div className="section-head">
            <h2 className="!text-[#e2e8f0]">Location & Availability</h2>
            <span className="section-note !text-[var(--dark-zone-muted)]">Remote-first with in-person options.</span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3 className="flex items-center gap-2"><Globe size={18} /> Remote / Global</h3>
              <p>
                I work with clients worldwide via remote collaboration. Claude
                Code setup, n8n workflows, and automation consulting can all be
                done entirely remotely.
              </p>
            </div>
            <div className="card">
              <h3 className="flex items-center gap-2"><MapPin size={18} /> Miami, Florida</h3>
              <p>
                Seasonal base (March-June, August-December). Available for
                in-person consulting, team training, and onsite automation setup
                in Miami and South Florida.
              </p>
            </div>
            <div className="card">
              <h3 className="flex items-center gap-2"><Trees size={18} /> Ubud, Bali</h3>
              <p>
                Seasonal base (June-August). Combine automation work with a trip
                to Bali. In-person consulting available on the island.
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-[var(--dark-zone-muted)]">
            Currently traveling: Dubai → Athens → Lisbon.{" "}
            <a
              href="mailto:hello@maxpetrusenko.com?subject=Location%20check"
            >
              Contact for current location.
            </a>
          </p>
          </section>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="container space-y-8">
          <Testimonials type="tech" />

          <section className="section">
            <div className="section-head">
              <h2>Featured surfaces</h2>
              <span className="section-note">Bigger product cards. Real screens. Clear positioning.</span>
            </div>
            <div className="feature-showcase-grid">
              {featuredOperatorApps.map((app) => {
                const Icon = app.icon;
                return (
                  <a
                    key={app.title}
                    className="feature-showcase-card"
                    href={app.href}
                    target="_blank"
                    rel="noopener"
                  >
                    <div className="feature-showcase-media">
                      <Image
                        className="feature-showcase-image"
                        src={app.image}
                        alt={app.alt}
                        width={1200}
                        height={751}
                      />
                    </div>
                    <div className="feature-showcase-body">
                      <div className="feature-showcase-topline">
                        <span className="feature-showcase-icon">
                          <Icon size={17} />
                        </span>
                        <span className="feature-showcase-eyebrow">{app.eyebrow}</span>
                      </div>
                      <div className="feature-showcase-copy">
                        <h3>{app.title}</h3>
                        <p>{app.description}</p>
                      </div>
                      <div className="feature-showcase-meta">
                        {app.tags.map((tag) => (
                          <span key={tag} className="stat">{tag}</span>
                        ))}
                      </div>
                      <span className="feature-showcase-link">
                        Open app
                        <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          <section className="section">
          <div className="section-head">
            <h2>Recent work</h2>
            <span className="section-note">Product + build shipped recently.</span>
          </div>
          <div className="article-list">
            <a
              className="article-card"
              href="https://unfollow-x.com/"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://i.imgur.com/8Fyi9QL.png"
                alt="Unfollow X"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">Unfollow X</span>
                <span className="article-sub">
                  Chrome extension for authority curation on X/Twitter.
                  Automated clean-ups, safe ops.
                </span>
                <div className="article-meta">
                  <span className="stat">Live</span>
                  <span className="stat">Product Hunt featured</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href="https://soundvista.netlify.app/"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://i.imgur.com/xfiHYPl.png"
                alt="SoundVista"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">SoundVista</span>
                <span className="article-sub">
                  Audio exploration MVP. Clean UI, fast search, polished
                  delivery.
                </span>
                <div className="article-meta">
                  <span className="stat">MVP</span>
                  <span className="stat">Fast search</span>
                </div>
              </div>
            </a>
            {recentProductApps.map((app) => (
              <a
                key={app.title}
                className="article-card"
                href={app.href}
                target="_blank"
                rel="noopener"
              >
                <Image
                  className="article-thumb"
                  src={app.image}
                  alt={app.alt}
                  width={400}
                  height={225}
                />
                <div className="article-body">
                  <span className="article-title">{app.title}</span>
                  <span className="article-sub">{app.description}</span>
                  <div className="article-meta">
                    {app.tags.map((tag) => (
                      <span key={tag} className="stat">{tag}</span>
                    ))}
                  </div>
                </div>
              </a>
            ))}
            <a
              className="article-card"
              href="https://lobby-app-5048e.web.app/"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://i.imgur.com/xfiHYPl.png"
                alt="SoundVista Waitlist"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">SoundVista Waitlist</span>
                <span className="article-sub">
                  Collecting early users for the next iteration. Signal demand
                  and shape the roadmap.
                </span>
                <div className="article-meta">
                  <span className="stat">Waitlist</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href="http://icanotes.com/"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80"
                alt="ICANotes"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">ICANotes (Backend)</span>
                <span className="article-sub">
                  Full-time backend engineering: clinical documentation
                  platform.
                </span>
                <div className="article-meta">
                  <span className="stat">Live platform</span>
                </div>
              </div>
            </a>
            <div className="article-card">
              <Image
                className="article-thumb"
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80"
                alt="Blog automation in progress"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">Blog Automation (In progress)</span>
                <span className="article-sub">
                  Automating blog generation: text, images, formatting,
                  hyperlinks, SEO + geo.
                </span>
                <div className="article-meta">
                  <span className="stat">In progress</span>
                </div>
              </div>
            </div>
            <a
              className="article-card"
              href="https://immigrateful.co"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80"
                alt="Immigrateful immigration platform"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">Immigrateful</span>
                <span className="article-sub">
                  Immigration news platform with Wix + Velo frontend, Node.js RSS automation,
                  ChatGPT content rewriting, and WhatsApp approval workflows.
                </span>
                <div className="article-meta">
                  <span className="stat">Live</span>
                  <span className="stat">Wix + Velo</span>
                  <span className="stat">AI automation</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href="https://geo-analyzer.com"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80"
                alt="GEO Analyzer dashboard"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">Geo-Analyzer</span>
                <span className="article-sub">
                  AI-powered GEO readiness scanner. Scores websites for AI recommendation
                  visibility using OpenAI GPT-5.2, with real-time reports and email delivery.
                </span>
                <div className="article-meta">
                  <span className="stat">Live</span>
                  <span className="stat">Next.js</span>
                  <span className="stat">OpenAI</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href="https://x.com/petrusenko_max/status/1953516625161834824"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://pbs.twimg.com/media/GxxJBKwW4AAUxYs?format=jpg&name=900x900"
                alt="Claude Code sub-agents results"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">Claude Code Sub-Agents in Production</span>
                <span className="article-sub">
                  Gave Claude AI write access to production code. $253k saved annually,
                  3x faster delivery, 73% fewer bugs. Zero regressions across 127 PRs.
                </span>
                <div className="article-meta">
                  <span className="stat">Featured</span>
                  <span className="stat">Anthropic</span>
                  <span className="stat">Vercel</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=900&q=80"
                alt="GitHub"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">GitHub</span>
                <span className="article-sub">Projects, code, experiments.</span>
                <div className="article-meta">
                  <span className="stat">Code</span>
                </div>
              </div>
            </a>
          </div>
          </section>

          <section className="section">
          <div className="section-head">
            <h2>Ways to collaborate</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Product & UX</h3>
              <p>
                Shape the right thing to build, align user value, and design flows
                that stay calm.
              </p>
            </div>
            <div className="card">
              <h3>Build & Ship</h3>
              <p>
                Ship MVPs and iterative releases with clean UI and reliable
                delivery.
              </p>
            </div>
            <div className="card">
              <h3>Automation</h3>
              <p>
                Connect tools, remove repetitive tasks, keep teams in flow.
              </p>
            </div>
          </div>
          </section>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20" style={{ background: "linear-gradient(145deg, #0e1520 0%, #152438 100%)" }}>
        <div className="container space-y-8">
          <section className="section">
          <div className="section-head">
            <h2 className="!text-[#e2e8f0]">Recent articles</h2>
            <span className="section-note !text-[var(--dark-zone-muted)]">Security, automation, and systems. Also published on Medium.</span>
          </div>
          <div className="article-list">
            {recentArticles.map((article) => {
              const isLocal = isLocalArticle(article);
              const card = (
                <>
                  <Image
                    className="article-thumb"
                    src={article.image || "/images/og-default.svg"}
                    alt={article.title}
                    width={400}
                    height={225}
                  />
                  <div className="article-body">
                    <span className="article-title">{article.title}</span>
                    <span className="article-sub">{article.excerpt}</span>
                    <div className="article-meta">
                      <span className="stat">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                      {article.tags.length > 0 && (
                        <span className="stat">{article.tags[0]}</span>
                      )}
                    </div>
                  </div>
                </>
              );

              return isLocal ? (
                <Link key={article.id} className="article-card" href={article.link}>
                  {card}
                </Link>
              ) : (
                <a
                  key={article.id}
                  className="article-card"
                  href={article.link}
                  target="_blank"
                  rel="noopener"
                >
                  {card}
                </a>
              );
            })}
          </div>
          </section>

          <section className="section">
          <div className="section-head">
            <h2 className="!text-[#e2e8f0]">Implementation playbooks</h2>
            <span className="section-note !text-[var(--dark-zone-muted)]">High-intent guides for teams shipping AI systems.</span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>OpenClaw installs</h3>
              <p>
                Secure setup sequence, environment hardening, and rollout guardrails.
              </p>
              <Link className="btn secondary" href="/tech/articles/openclaw-installation-playbook" style={{ marginTop: 12 }}>
                Read playbook
              </Link>
            </div>
            <div className="card">
              <h3>Generative Engine Optimization</h3>
              <p>
                Practical GEO system: entity clarity, citation structure, conversion flow.
              </p>
              <Link className="btn secondary" href="/tech/articles/generative-engine-optimization-geo" style={{ marginTop: 12 }}>
                Read framework
              </Link>
            </div>
            <div className="card">
              <h3>AEO + search strategy</h3>
              <p>
                How to combine classic SEO and answer-engine visibility without content bloat.
              </p>
              <Link className="btn secondary" href="/tech/articles/answer-engine-optimization-aeo" style={{ marginTop: 12 }}>
                Read guide
              </Link>
            </div>
          </div>
          </section>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="container">
          <section className="section">
          <div className="section-head">
            <h2>Frequently Asked Questions</h2>
          </div>
          <FaqSection
            columns={3}
            items={[
              {
                question: "What AI tools do you specialize in?",
                answer:
                  "Claude Code for development automation, n8n for workflow orchestration, ChatGPT API for product integrations. I also work with complementary tools like vector databases and automation platforms.",
              },
              {
                question: "How does Claude Code compare to GitHub Copilot?",
                answer:
                  "Claude Code is a CLI agent that can read your entire codebase, run commands, execute tests, and make architectural decisions. Copilot provides inline suggestions. Claude Code is more autonomous and capable of multi-step reasoning.",
              },
              {
                question: "What can I automate with n8n?",
                answer:
                  "Almost anything: content scheduling, lead management, data sync between tools, AI-powered workflows, document processing, custom API integrations. If it has an API, n8n can connect it.",
              },
              {
                question: "Do you offer training for teams?",
                answer:
                  "Yes. I can train your team on AI tooling best practices, set up workflows, and create documentation. Training is customized to your stack and use cases.",
              },
              {
                question: "What's your pricing model?",
                answer:
                  "One-time setups (Claude Code configuration, simple automations) start at project-based pricing. Ongoing retainers for complex systems and team support. Contact hello@maxpetrusenko.com with your requirements.",
              },
              {
                question: "Can you help with product strategy too?",
                answer:
                  "Yes. I offer product & UX consulting to shape what to build, not just how. Calm, outcome-first product definition before a line of code is written.",
              },
            ]}
          />
          </section>
        </div>
      </section>
    </>
  );
}
