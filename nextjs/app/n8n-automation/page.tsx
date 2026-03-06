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

      {/* Direct Answer for AI extraction */}
      <DirectAnswer
        question="What does an n8n automation consultant do?"
        answer="An n8n automation consultant designs and builds custom workflow automations using n8n, connecting your tools and APIs to eliminate manual work. Services include workflow design, API integrations, custom node development, error handling, and monitoring. Typical automations save 10-20 hours per week on repetitive tasks. Available remote worldwide."
      />

      {/* Hero Section */}
      <section style={{ padding: "80px 20px 60px", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <div className="eyebrow" style={{ justifyContent: "center", marginBottom: "20px" }}>
            <span className="dot"></span> n8n Automation Consulting
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", marginBottom: "20px" }}>
            Automate Everything. Connect Anything.
          </h1>
          <p style={{ fontSize: "18px", color: "var(--muted)", marginBottom: "32px", lineHeight: "1.6" }}>
            Your tools have APIs. n8n connects them. I design and build custom automations that eliminate manual work: lead capture, data sync, content scheduling, AI workflows, document processing.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=n8n%20Automation&body=Hi%20Max%2C%20I%20want%20to%20automate%20____.%20Current%20tools%3A%20____."
              style={{ fontSize: "16px", padding: "16px 32px" }}
            >
              Tell Me What to Automate
            </a>
            <Link className="btn secondary" href="/tech/articles/n8n-workflow-automation">
              See n8n Examples
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section style={{ background: "var(--sand)", padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>The Problem: Your Team is Drowning in Repetitive Work</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>✗ Manual Data Entry Between Tools</h3>
              <p style={{ color: "var(--muted)" }}>Leads from your form need to go to CRM, Slack, and a spreadsheet. Someone copy-pastes every time. Errors happen. Opportunities are lost.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>✗ Content Scheduling is a Full-Time Job</h3>
              <p style={{ color: "var(--muted)" }}>You have great content but posting across LinkedIn, X, Instagram, and your blog takes hours. Formatting, scheduling, analytics—each platform separately.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>✗ AI Workflows Aren't Connected</h3>
              <p style={{ color: "var(--muted)" }}>You use ChatGPT or Claude for content, but there's no pipeline: draft → review → optimize → schedule → post. Each step is manual.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section style={{ padding: "60px 20px" }}>
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
      <section style={{ padding: "60px 20px" }}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>What You Get</h2>
          <div className="card" style={{ padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>n8n Automation Package</h3>
            <div style={{ marginBottom: "24px" }}>
              <div className="list" style={{ marginLeft: 0 }}>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>✓ Process mapping and automation audit</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>✓ Custom workflow design (1-3 workflows)</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>✓ API integration setup</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>✓ Error handling and monitoring</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>✓ Documentation and handoff</li>
                <li style={{ marginLeft: 0, marginBottom: "8px" }}>✓ 30-day support and tweaks</li>
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
      <section style={{ padding: "60px 20px", textAlign: "center" }}>
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
