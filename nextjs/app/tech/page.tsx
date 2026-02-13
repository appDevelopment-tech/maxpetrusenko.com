import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { EmailCaptureInline } from "@/components/forms/EmailCaptureInline";
import { Testimonials } from "@/components/testimonials/Testimonials";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateTechServiceSchema,
  generateTechFAQSchema,
  generateScheduleActionSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "AI Automation Consultant | Claude Code • n8n • ChatGPT",
  description: "$253k saved annually for a SaaS startup. Claude Code setup, n8n workflows, ChatGPT integrations. Remote worldwide, in-person Miami and Ubud.",
  ogType: "website",
  ogImage: "/images/og-tech.png",
  canonical: absoluteUrl("/tech"),
});

export default function TechPage() {
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

      {/* Hero image section */}
      <div className="hero-image-section">
        <div className="hero-image-overlay"></div>
        <Image
          src="/images/tech-portrait.jpg"
          alt="Max Petrusenko in studio"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "50% 30%" }}
          quality={92}
        />
        <div className="hero-image-content">
          <h1>Calm, outcome-first products</h1>
          <p>AI automation, product strategy, and systems for creators and founders.</p>
        </div>
      </div>

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Tech & Product
            </div>
            <h1>Calm, outcome-first products</h1>
            <p>
              I build tools and experiences for creators and founders: visibility,
              automation, and clear UX that feels calm.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/links">
                All links
              </Link>
              <a
                className="btn secondary"
                href="mailto:hello@maxpetrusenko.com?subject=Tech%20collab"
                target="_blank"
                rel="noopener"
              >
                Contact
              </a>
            </div>
            <div className="hero-cta-note">
              Best for: product shaping, design/dev, and workflow automation.
            </div>
          </div>

          <div className="hero-card">
            <h3>Current highlights</h3>
            <div className="tiles">
              <a
                className="tile"
                href="https://maxpetrusenko.gumroad.com/l/zrsxj"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">Make Your Content Visible on X</span>
                  <span className="tile-desc">
                    Visibility tooling for creators.
                  </span>
                </div>
                <span className="badge">Open</span>
              </a>
              <a
                className="tile"
                href="https://maxpetrusenko.notion.site/Portfolio-e521a73ef4bf41ccaf2e0098edd72c25"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">FileMaker Builds</span>
                  <span className="tile-desc">
                    Custom systems for ops and media.
                  </span>
                </div>
                <span className="badge">View</span>
              </a>
            </div>
          </div>
        </section>

        {/* Email capture for tech updates */}
        <section className="section">
          <EmailCaptureInline
            source="tech-page"
            headline="Get automation tips & updates"
            subtitle="Drop your email for Claude Code guides, n8n workflows, and automation insights."
            buttonText="Subscribe"
          />
        </section>

        {/* Services Overview - AI-extractable service details */}
        <section className="section">
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

        <section className="section">
          <div className="section-head">
            <h2>AI & Automation Services</h2>
            <span className="section-note">Specialized expertise for modern builders.</span>
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

        <Testimonials type="tech" />

        <section className="section">
          <div className="section-head">
            <h2>Location & Availability</h2>
            <span className="section-note">Remote-first with in-person options.</span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>🌍 Remote / Global</h3>
              <p>
                I work with clients worldwide via remote collaboration. Claude
                Code setup, n8n workflows, and automation consulting can all be
                done entirely remotely.
              </p>
            </div>
            <div className="card">
              <h3>📍 Miami, Florida</h3>
              <p>
                Seasonal base (March-June, August-December). Available for
                in-person consulting, team training, and onsite automation setup
                in Miami and South Florida.
              </p>
            </div>
            <div className="card">
              <h3>🏝️ Ubud, Bali</h3>
              <p>
                Seasonal base (June-August). Combine automation work with a trip
                to Bali. In-person consulting available on the island.
              </p>
            </div>
          </div>
          <p className="text-muted text-sm mt-4 text-center">
            Currently traveling: Dubai → Athens → Lisbon.{" "}
            <a
              href="mailto:hello@maxpetrusenko.com?subject=Location%20check"
            >
              Contact for current location.
            </a>
          </p>
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

        <section className="section">
          <div className="section-head">
            <h2>Recent articles</h2>
            <span className="section-note">Security, automation, and systems. Also published on Medium.</span>
          </div>
          <div className="article-list">
            <a
              className="article-card"
              href="https://medium.com/p/65b991356c25"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*uSx3Al0UcKOBhxpIey3hAw.png"
                alt="Claude skills article cover"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">
                  Unleash Your Inner Wizard: Claude Skills
                </span>
                <span className="article-sub">
                  41K presentations · 8.7K views · 5.4K reads
                </span>
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
                    8.7K
                  </span>
                  <span className="stat">—</span>
                  <span className="stat">8 min</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href="https://medium.com/p/0faac1248080"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*uSx3Al0UcKOBhxpIey3hAw.png"
                alt="Claude code article cover"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">
                  Claude Code: The AI Developer&apos;s Secret Weapon
                </span>
                <span className="article-sub">47K views · AI-assisted dev</span>
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
                    47K
                  </span>
                  <span className="stat">—</span>
                  <span className="stat">6 min</span>
                </div>
              </div>
            </a>
            <a
              className="article-card"
              href="https://medium.com/p/99c594d458b5"
              target="_blank"
              rel="noopener"
            >
              <Image
                className="article-thumb"
                src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*8Ggv_is-3TE87N5nLIMfhA.jpeg"
                alt="GrapheneOS phone cover"
                width={400}
                height={225}
              />
              <div className="article-body">
                <span className="article-title">
                  The Smartphone That Makes Police Officers Sweat
                </span>
                <span className="article-sub">249K views · GrapheneOS privacy</span>
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
                    249K
                  </span>
                  <span className="stat">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15V5a2 2 0 0 0-2-2H7l-4 4v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
                      <path d="M3 7h2a2 2 0 0 0 2-2V3"></path>
                    </svg>
                    26K
                  </span>
                  <span className="stat">6 min</span>
                </div>
              </div>
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Implementation playbooks</h2>
            <span className="section-note">High-intent guides for teams shipping AI systems.</span>
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

        <section className="section">
          <div className="section-head">
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>What AI tools do you specialize in?</h3>
              <p>
                Claude Code for development automation, n8n for workflow
                orchestration, ChatGPT API for product integrations. I also
                work with complementary tools like vector databases and automation
                platforms.
              </p>
            </div>
            <div className="card">
              <h3>How does Claude Code compare to GitHub Copilot?</h3>
              <p>
                Claude Code is a CLI agent that can read your entire codebase,
                run commands, execute tests, and make architectural decisions.
                Copilot provides inline suggestions. Claude Code is more
                autonomous and capable of multi-step reasoning.
              </p>
            </div>
            <div className="card">
              <h3>What can I automate with n8n?</h3>
              <p>
                Almost anything: content scheduling, lead management, data sync
                between tools, AI-powered workflows, document processing, custom
                API integrations. If it has an API, n8n can connect it.
              </p>
            </div>
            <div className="card">
              <h3>Do you offer training for teams?</h3>
              <p>
                Yes. I can train your team on AI tooling best practices, set up
                workflows, and create documentation. Training is customized to
                your stack and use cases.
              </p>
            </div>
            <div className="card">
              <h3>What's your pricing model?</h3>
              <p>
                One-time setups (Claude Code configuration, simple automations)
                start at project-based pricing. Ongoing retainers for complex
                systems and team support. Contact hello@maxpetrusenko.com with
                your requirements.
              </p>
            </div>
            <div className="card">
              <h3>Can you help with product strategy too?</h3>
              <p>
                Yes. I offer product & UX consulting to shape what to build, not
                just how. Calm, outcome-first product definition before a line
                of code is written.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
