import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CircleX } from "lucide-react";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateTechServiceSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "n8n Automation Consultant - Workflow Design & API Integration",
  description: "Automate your business with n8n. Custom workflow design, API integrations, data pipelines. Connect any tool with any API. Remote worldwide.",
  ogType: "website",
  canonical: absoluteUrl("/n8n-automation"),
});

export default function N8nAutomationPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "n8n Automation Consultant - Workflow Design & API Integration",
          description: "Automate your business with n8n. Custom workflow design, API integrations, data pipelines.",
          url: "/n8n-automation",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "n8n Automation", url: "/n8n-automation" },
        ])}
      />
      <JsonLd type="ProfessionalService" data={generateTechServiceSchema()} />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/tech-portrait.jpg"
            alt="Max Petrusenko in studio"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            quality={90}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(15,126,169,0.2)] px-4 py-1 text-xs font-semibold text-[var(--accent-tech)]">
              Open for n8n automation work
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Connect every tool. Remove repetitive work.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[460px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Your tools already have APIs. n8n connects them into reliable workflows for lead capture, content distribution, AI steps, and ops automation.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <a className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="mailto:hello@maxpetrusenko.com?subject=n8n%20Automation&body=Hi%20Max%2C%20I%20want%20to%20automate%20____.%20Current%20tools%3A%20____.">
                Tell Me What to Automate
              </a>
              <Link className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-tech)]" href="/tech/articles/n8n-workflow-automation">
                See n8n Examples
              </Link>
            </div>
          </div>
        </section>
      </div>

      <DirectAnswer
        showUi={false}
        question="What does an n8n automation consultant do?"
        answer="An n8n automation consultant designs and builds custom workflow automations using n8n, connecting your tools and APIs to eliminate manual work. Services include workflow design, API integrations, custom node development, error handling, and monitoring. Typical automations save 10-20 hours per week on repetitive tasks. Available remote worldwide."
      />

      <section className="dark-zone mt-8 py-16 px-4 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#121d2e_58%,#152438_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-tech)]">n8n focus</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Reliable workflows wired into the tools you already use
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Lead routing, content distribution, document handling, and AI-powered automations with monitoring and error recovery.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {["Any API or webhook", "10 to 20 hours saved weekly", "Monitoring and handoff included"].map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-[var(--dark-zone-text)]">
                {metric}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>The Problem: Your Team is Drowning in Repetitive Work</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CircleX size={18} /> Manual Data Entry Between Tools</h3>
              <p style={{ color: "var(--muted)" }}>Leads from your form need to go to CRM, Slack, and a spreadsheet. Someone copy-pastes every time. Errors happen. Opportunities are lost.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CircleX size={18} /> Content Scheduling is a Full-Time Job</h3>
              <p style={{ color: "var(--muted)" }}>You have great content but posting across LinkedIn, X, Instagram, and your blog takes hours. Formatting, scheduling, analytics—each platform separately.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CircleX size={18} /> AI Workflows Aren&apos;t Connected</h3>
              <p style={{ color: "var(--muted)" }}>You use ChatGPT or Claude for content, but there's no pipeline: draft → review → optimize → schedule → post. Each step is manual.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>The Solution: Custom n8n Workflows That Run 24/7</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Workflow Design & Architecture</h3>
              <p style={{ color: "var(--muted)" }}>I map your current processes, identify automation opportunities, and design reliable workflows with error handling, retries, and monitoring. Systems that don't break when one API is down.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>API Integration (Any Tool)</h3>
              <p style={{ color: "var(--muted)" }}>If it has an API, n8n can connect it. I've built integrations with Airtable, Notion, Google Workspace, Slack, CRM platforms, payment processors, custom APIs, and AI services.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Custom Node Development</h3>
              <p style={{ color: "var(--muted)" }}>n8n has 400+ nodes, but sometimes you need something custom. I build TypeScript nodes that connect to your specific tools or implement unique business logic.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>AI-Powered Workflows</h3>
              <p style={{ color: "var(--muted)" }}>Connect n8n to OpenAI, Anthropic, or local LLMs. Automate content generation, summarization, classification, and data enrichment with AI as a workflow step.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>Real Automations I've Built</h2>
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px" }}>Content Distribution Pipeline</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>
                <strong>Source:</strong> Notion → <strong>Process:</strong> AI rewrite, format per platform, schedule → <strong>Destinations:</strong> LinkedIn, X, Instagram, Blog
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                Saves ~8 hours/week. AI optimizes content for each platform's style and character limits.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px" }}>Lead Capture & Enrichment</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>
                <strong>Trigger:</strong> Form submission → <strong>Enrich:</strong> Clearbit API + LinkedIn → <strong>Route:</strong> CRM by lead score → <strong>Notify:</strong> Slack for high-value leads
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                Sales team responds 4x faster to high-value leads. Zero manual data entry.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px" }}>Document Processing with AI</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>
                <strong>Trigger:</strong> Email attachment → <strong>Extract:</strong> Text + metadata → <strong>AI:</strong> Summarize + classify → <strong>Route:</strong> Google Drive folder by category
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                Processes 500+ documents/week. 95% classification accuracy with fine-tuned prompts.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px" }}>Social Media Monitoring</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>
                <strong>Trigger:</strong> Scheduled → <strong>Fetch:</strong> X/LinkedIn API → <strong>Analyze:</strong> Sentiment + engagement → <strong>Alert:</strong> Slack for spikes → <strong>Log:</strong> Airtable dashboard
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                Real-time brand monitoring. Catches opportunities and issues within minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Offer Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>What You Get</h2>
          <div className="card" style={{ padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>n8n Automation Package</h3>
            <div style={{ marginBottom: "24px" }}>
              <div className="list" style={{ marginLeft: 0 }}>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Process mapping and automation audit</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Custom workflow design (1-3 workflows)</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> API integration setup</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Error handling and monitoring</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Documentation and handoff</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> 30-day support and tweaks</li>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "8px" }}>Delivery: 2-4 weeks, remote worldwide</div>
              <div style={{ fontSize: "14px", color: "var(--muted)" }}>Pricing: Per-workflow or package, starts at $1,500</div>
            </div>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=n8n%20Automation&body=Hi%20Max%2C%20I%20want%20to%20automate%3A%20____.%20Current%20tools%3A%20____.%20Timeline%3A%20____."
              style={{ width: "100%", textAlign: "center" }}
            >
              Tell Me What to Automate
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>What tools can n8n integrate with?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                n8n has 400+ native integrations including Airtable, Notion, Google Workspace, Slack, CRM platforms, payment processors, and social media. If a tool has an API or webhook, n8n can connect to it even without a native node.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>Do I need n8n Cloud or self-hosting?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                Both work. n8n Cloud is easier to start with (free tier available). Self-hosting gives you more control and no workflow limits. I can work with either setup based on your preferences and data sensitivity.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>What if a workflow breaks?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                I build workflows with error handling: retries for transient failures, fallback paths, error notifications to Slack/email, and logging. You'll know if something stops working and why.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>Can you connect AI tools like ChatGPT?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                Yes. n8n has native nodes for OpenAI, Anthropic, and can connect to any LLM API. I build AI-powered workflows for content generation, summarization, classification, and data enrichment.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>How long does automation setup take?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                Simple workflows (1-2 integrations): 1 week. Complex multi-step workflows with AI: 2-4 weeks. I'll give you a timeline estimate after understanding your requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 px-4" style={{ textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "560px" }}>
          <h2 style={{ marginBottom: "16px" }}>What Repetitive Task Do You Hate?</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            Tell me what you're doing manually. I'll tell you if it can be automated and give you a price. No commitment.
          </p>
          <a
            className="btn primary"
            href="mailto:hello@maxpetrusenko.com?subject=n8n%20Automation%20Discovery"
            style={{ fontSize: "16px", padding: "16px 32px" }}
          >
            Describe Your Workflow
          </a>
        </div>
      </section>
    </>
  );
}
