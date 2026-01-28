import Link from "next/link";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { HiddenKeywords } from "@/components/seo/HiddenKeywords";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateTechServiceSchema,
  generateTechPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "AI Automation Services",
  description: "AI automation consulting for content workflows, API integrations, and business process automation. Claude Code, n8n, ChatGPT integrations. Remote-first, available worldwide.",
  ogType: "website",
  canonical: absoluteUrl("/tech/ai-automation"),
});

export default function AIAutomationPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "AI Automation Services",
          description:
            "AI automation consulting for content workflows and business process automation.",
          url: "/tech/ai-automation",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "AI Automation", url: "/tech/ai-automation" },
        ])}
      />
      <JsonLd
        type="ProfessionalService"
        data={generateTechServiceSchema()}
      />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> AI Automation
            </div>
            <h1>Production-Grade AI Automation</h1>
            <p>
              I build AI-powered systems that reduce manual work, increase
              reliability, and scale without adding headcount. No hype—just
              systems that work.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="mailto:hello@maxpetrusenko.com?subject=AI%20Automation%20Inquiry"
              >
                Get Started
              </a>
              <Link className="btn secondary" href="/tech/case-studies">
                Case Studies
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h3>What I build</h3>
            <ul className="list">
              <li>Content automation pipelines</li>
              <li>API integrations & data sync</li>
              <li>Workflow automation with n8n</li>
              <li>Claude Code setup & optimization</li>
              <li>ChatGPT / OpenAI integrations</li>
              <li>Custom AI agent systems</li>
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Services</h2>
            <span className="section-note">
              Clear scope, defined outcomes
            </span>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>Content Automation</h3>
              <p>
                Automated content pipelines from creation to distribution across
                platforms.
              </p>
              <h4>What&apos;s included</h4>
              <ul className="list">
                <li>AI-powered content repurposing</li>
                <li>Automated scheduling & posting</li>
                <li>Cross-platform distribution</li>
                <li>Analytics aggregation</li>
                <li>Error handling & overrides</li>
              </ul>
              <h4>Typical outcome</h4>
              <p>
                <strong>80-90% reduction</strong> in manual content work while
                increasing output 2-3x.
              </p>
            </div>

            <div className="card">
              <h3>API Integrations</h3>
              <p>
                Connect your tools and automate data flow between platforms.
              </p>
              <h4>What&apos;s included</h4>
              <ul className="list">
                <li>Integration architecture design</li>
                <li>API implementation & testing</li>
                <li>Webhook handling & events</li>
                <li>Data transformation & mapping</li>
                <li>Admin dashboards</li>
              </ul>
              <h4>Typical outcome</h4>
              <p>
                <strong>Eliminate manual data entry</strong> and reduce errors
                from copy-paste workflows.
              </p>
            </div>

            <div className="card">
              <h3>Claude Code Setup</h3>
              <p>
                Configure Claude Code as an autonomous development agent for your
                team.
              </p>
              <h4>What&apos;s included</h4>
              <ul className="list">
                <li>Claude Code installation & config</li>
                <li>Sub-agent system design</li>
                <li>Custom skill definitions</li>
                <li>Workflow integration</li>
                <li>Team training & documentation</li>
              </ul>
              <h4>Typical outcome</h4>
              <p>
                <strong>10x faster</strong> feature development with AI-assisted
                coding, testing, and refactoring.
              </p>
            </div>

            <div className="card">
              <h3>n8n Workflows</h3>
              <p>
                Build automation workflows with n8n to connect your tools without
                code.
              </p>
              <h4>What&apos;s included</h4>
              <ul className="list">
                <li>Workflow design & mapping</li>
                <li>n8n instance setup</li>
                <li>Custom node development</li>
                <li>API credential management</li>
                <li>Monitoring & alerts</li>
              </ul>
              <h4>Typical outcome</h4>
              <p>
                <strong>Automate repetitive tasks</strong> that eat hours every
                week—social media, reporting, notifications, lead management.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>The Process</h2>
            <span className="section-note">
              How we work together
            </span>
          </div>

          <div className="cards-4 grid">
            <div className="card">
              <h3>1. Discovery</h3>
              <p>
                We map your current workflows, identify automation opportunities,
                and define clear outcomes.
              </p>
            </div>
            <div className="card">
              <h3>2. Design</h3>
              <p>
                I design the automation architecture, select tools, and create a
                implementation plan.
              </p>
            </div>
            <div className="card">
              <h3>3. Build</h3>
              <p>
                I build the automation system with iterative feedback, testing
                each component thoroughly.
              </p>
            </div>
            <div className="card">
              <h3>4. Deploy & Support</h3>
              <p>
                We deploy to production, monitor performance, and I provide
                handoff documentation.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Who This Is For</h2>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>✓ Good fit</h3>
              <ul className="list">
                <li>Creators drowning in manual content work</li>
                <li>Startups needing integrations but no engineering bandwidth</li>
                <li>Businesses with repetitive workflows that should be automated</li>
                <li>Teams wanting to adopt AI tools (Claude Code, n8n)</li>
                <li>Companies needing custom OpenAI integrations</li>
              </ul>
            </div>

            <div className="card">
              <h3>✗ Not a fit</h3>
              <ul className="list">
                <li>Looking for &quot;get rich quick&quot; AI schemes</li>
                <li>Want to automate spam or gray-hat tactics</li>
                <li>Need enterprise-scale systems (100+ team members)</li>
                <li>Looking for the lowest possible price</li>
                <li>Not willing to invest in proper setup</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Tools & Technologies</h2>
          </div>

          <div className="tags">
            <span className="badge">Claude Code</span>
            <span className="badge">n8n</span>
            <span className="badge">OpenAI API</span>
            <span className="badge">ChatGPT</span>
            <span className="badge">Next.js</span>
            <span className="badge">TypeScript</span>
            <span className="badge">Cloudflare Workers</span>
            <span className="badge">API Design</span>
            <span className="badge">Webhooks</span>
            <span className="badge">Vector DBs</span>
            <span className="badge">RAG</span>
            <span className="badge">Automation</span>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Pricing</h2>
            <span className="section-note">
              Project-based or retainer
            </span>
          </div>

          <div className="cards-3 grid">
            <div className="card">
              <h3>Simple Setup</h3>
              <p>
                Claude Code configuration, single n8n workflow, basic OpenAI
                integration.
              </p>
              <p>
                <strong>Starting at $1,500</strong>
              </p>
              <p style={{ fontSize: "0.9em", opacity: 0.8 }}>
                One-time project fee
              </p>
            </div>

            <div className="card">
              <h3>Custom Automation</h3>
              <p>
                Multi-step workflows, API integrations, content pipelines,
                custom agent systems.
              </p>
              <p>
                <strong>Starting at $3,000</strong>
              </p>
              <p style={{ fontSize: "0.9em", opacity: 0.8 }}>
                Project-based, scoped to requirements
              </p>
            </div>

            <div className="card">
              <h3>Ongoing Support</h3>
              <p>
                Maintenance, optimization, new workflows, team training,
                priority support.
              </p>
              <p>
                <strong>From $1,500/month</strong>
              </p>
              <p style={{ fontSize: "0.9em", opacity: 0.8 }}>
                Retainer, after initial project
              </p>
            </div>
          </div>

          <p style={{ marginTop: 24, textAlign: "center" }}>
            <a
              href="mailto:hello@maxpetrusenko.com?subject=AI%20Automation%20Inquiry"
            >
              Email me to discuss your project →
            </a>
          </p>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>FAQ</h2>
          </div>

          <div className="cards-2 grid">
            <div className="card">
              <h3>How long does a typical automation project take?</h3>
              <p>
                Simple setups (Claude Code config, single workflow): 1-2 weeks.
                Custom automation systems: 3-6 weeks depending on complexity.
                I&apos;ll give you a timeline during discovery.
              </p>
            </div>

            <div className="card">
              <h3>Do I need technical knowledge?</h3>
              <p>
                No. I handle all the technical implementation. You just need to
                understand your workflows and what you want to achieve. I&apos;ll
                translate that into technical requirements.
              </p>
            </div>

            <div className="card">
              <h3>What if something breaks?</h3>
              <p>
                All projects include a 30-day warranty period for fixes. For
                ongoing peace of mind, retainer includes maintenance and priority
                support.
              </p>
            </div>

            <div className="card">
              <h3>Can you train my team?</h3>
              <p>
                Yes. I offer training for Claude Code, n8n, and general AI
                automation best practices. Training is customized to your team
                and use cases.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=AI%20Automation%20Inquiry"
            >
              Discuss Your Project
            </a>
            <Link className="btn secondary" href="/proof">
              See Proof
            </Link>
          </div>
        </section>

        {/* Hidden keywords for SEO */}
        <HiddenKeywords
          service="AI automation"
          locations={[
            "Remote",
            "Worldwide",
            "Global",
            "Miami, Florida",
            "Ubud, Bali",
          ]}
          variants={[
            "AI automation consultant",
            "Claude Code expert",
            "n8n workflow expert",
            "ChatGPT API integration",
            "OpenAI consultant",
            "content automation",
            "workflow automation",
            "API integration specialist",
            "AI implementation",
          ]}
          modifiers={["consulting", "services", "expert", "freelance"]}
        />
      </div>
    </>
  );
}
