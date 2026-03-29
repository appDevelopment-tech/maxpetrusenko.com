import Image from "next/image";
import Link from "next/link";
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
  title: "AI Workflow Automation - ChatGPT & Claude Integration Services",
  description: "Automate with AI: content pipelines, data enrichment, document processing. ChatGPT, Claude, n8n integrations that save time.",
  ogType: "website",
  canonical: absoluteUrl("/ai-workflow-automation"),
});

export default function AIWorkflowAutomationPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "AI Workflow Automation - ChatGPT & Claude Integration Services",
          description: "Automate with AI: content pipelines, data enrichment, document processing.",
          url: "/ai-workflow-automation",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "AI Workflow Automation", url: "/ai-workflow-automation" },
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
              Open for AI workflow builds
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Your AI team works 24/7. You don&apos;t.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[460px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Stop manually prompting ChatGPT or Claude. Build automated workflows
              that draft content, process documents, enrich data, and respond while you sleep.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <a className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]" href="mailto:hello@maxpetrusenko.com?subject=AI%20Workflow%20Automation">
                What Should I Automate?
              </a>
              <Link className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-tech)]" href="/tech/articles/chatgpt-api-integration">
                See AI Integration Examples
              </Link>
            </div>
          </div>
        </section>
      </div>

      <DirectAnswer
        showUi={false}
        question="What is AI workflow automation?"
        answer="AI workflow automation connects AI tools like ChatGPT and Claude into your business processes, automating tasks like content generation, data analysis, document processing, and customer responses. Using tools like n8n and custom integrations, workflows run 24/7, saving 10-20 hours per week on repetitive tasks while maintaining quality and consistency."
      />

      <section className="dark-zone mt-8 py-16 px-4 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(15,126,169,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#121d2e_58%,#152438_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-tech)]">Workflow focus</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Move from prompts to production pipelines
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Content systems, document processing, data enrichment, and customer response flows wired into your stack.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {["24/7 execution", "10 to 20 hours saved weekly", "Human review where it matters"].map((metric) => (
              <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-[var(--dark-zone-text)]">
                {metric}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>The Problem: AI is Powerful, But Manual Prompting Doesn&apos;t Scale</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>You&apos;re Copy-Pasting from ChatGPT</h3>
              <p style={{ color: "var(--muted)" }}>Every piece of content requires: open ChatGPT, prompt, copy, format, paste. Multiply by 10x per week. That&apos;s hours lost to friction, not creativity.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>Inconsistent Quality</h3>
              <p style={{ color: "var(--muted)" }}>Manual prompting means variation in tone, style, and quality. Your brand voice depends on how you felt that day. No version control, no easy iteration.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>AI Isn&apos;t Connected to Your Data</h3>
              <p style={{ color: "var(--muted)" }}>Your CRM, analytics, content calendar, and docs have valuable data. But ChatGPT can&apos;t see it unless you manually copy-paste every time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 px-4">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>The Solution: Automated AI Pipelines That Work While You Sleep</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Content Production Pipeline</h3>
              <p style={{ color: "var(--muted)" }}>Idea, AI draft, Human review, AI optimize, Schedule across platforms. One workflow turns a single idea into a month&apos;s worth of content, all in your brand voice.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Document Processing and Analysis</h3>
              <p style={{ color: "var(--muted)" }}>Upload, Extract text plus metadata, AI summarize and classify, Route to folders, Update database. Contracts, reports, invoices processed automatically.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Data Enrichment</h3>
              <p style={{ color: "var(--muted)" }}>New lead, AI researches company and role, Scores lead quality, Updates CRM, Alerts sales. Every lead gets personalized research, not just name and email.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Customer Response Automation</h3>
              <p style={{ color: "var(--muted)" }}>Inbound queries, AI categorizes intent, Drafts response, Human reviews, Sends. 80 percent of common questions answered automatically, 20 percent escalated with context.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>AI Tools I Integrate</h2>
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>OpenAI / ChatGPT</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>GPT-4 for content, analysis, coding</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>Anthropic / Claude</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>Claude Opus for long-form reasoning</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>n8n Workflows</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>Orchestration and automation glue</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>Vector DBs</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>RAG for your knowledge base</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>Custom APIs</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>Any tool with an API</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>Airtable / Notion</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>Data storage and databases</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 px-4">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>What You Get</h2>
          <div className="card" style={{ padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>AI Workflow Automation Package</h3>
            <div style={{ marginBottom: "24px" }}>
              <div className="list" style={{ marginLeft: 0 }}>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>Process discovery and AI opportunity audit</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>Workflow architecture design</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>AI prompt engineering and optimization</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>Integration setup (AI tools plus data sources)</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>Error handling and human review steps</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>Documentation and training</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>30-day support and iteration</li>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "8px" }}>Delivery: 2-6 weeks, remote worldwide</div>
              <div style={{ fontSize: "14px", color: "var(--muted)" }}>Pricing: Project-based, starts at $2,500</div>
            </div>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=AI%20Workflow%20Automation"
              style={{ width: "100%", textAlign: "center" }}
            >
              Describe Your Use Case
            </a>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>What types of workflows can you automate with AI?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                Content production, document processing, data enrichment, customer responses, research summaries, classification tasks, report generation—if it involves text or data and follows patterns, it can likely be automated with AI.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>Do I need AI expertise to use these workflows?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                No. I build workflows that are maintainable without deep AI knowledge. You&apos;ll get documentation and training. The AI complexity is hidden behind simple interfaces: webhooks, forms, dashboards.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>What about data privacy and security?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                I configure workflows with your security requirements in mind: data retention policies, PII redaction, secure API handling, and compliance with your policies. Sensitive data can be processed on-premises or with enterprise AI options.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>How do you handle AI quality and consistency?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                I use structured prompts, few-shot examples, and clear output schemas. Workflows include human review steps for quality control. Over time, I can fine-tune prompts based on your feedback to match your preferences.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>What happens when AI providers update their models</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                I build workflows that are resilient to changes using abstraction layers and configuration. If an API changes, I update the workflow as part of ongoing support. I can also design workflows that can switch between AI providers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 px-4" style={{ textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "560px" }}>
          <h2 style={{ marginBottom: "16px" }}>Stop Wasting Time on Manual AI Work</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            Tell me what you&apos;re doing manually. I&apos;ll tell you if AI automation makes sense and give you a price.
          </p>
          <a
            className="btn primary"
            href="mailto:hello@maxpetrusenko.com?subject=AI%20Automation%20Discovery"
            style={{ fontSize: "16px", padding: "16px 32px" }}
          >
            Explore AI Automation
          </a>
        </div>
      </section>
    </>
  );
}
