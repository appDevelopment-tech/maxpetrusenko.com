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
  title: "Claude Code Consultant - Setup, Configuration & Team Training",
  description: "Get your team productive with Claude Code fast. Sub-agent configuration, custom skills, workflow integration. $253k saved in one recent implementation. Remote worldwide.",
  ogType: "website",
  canonical: absoluteUrl("/claude-code-consultant"),
});

export default function ClaudeCodeConsultantPage() {
  const darkBandStyle = {
    background: "linear-gradient(145deg, #0e1520 0%, #152438 100%)",
    padding: "72px 20px",
  } as const;

  const darkBandHeadingStyle = {
    marginBottom: "24px",
    color: "#f3f6fa",
  } as const;

  const darkBandTextStyle = {
    color: "var(--dark-zone-text)",
  } as const;

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Claude Code Consultant - Setup, Configuration & Team Training",
          description: "Get your team productive with Claude Code fast. Sub-agent configuration, custom skills, workflow integration.",
          url: "/claude-code-consultant",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Claude Code Consultant", url: "/claude-code-consultant" },
        ])}
      />
      <JsonLd type="ProfessionalService" data={generateTechServiceSchema()} />
      <JsonLd type="Person" data={generateTechPersonSchema()} />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/tech-portrait.jpg"
            alt="Max Petrusenko with a technical studio portrait"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            quality={90}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>

        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-20 md:px-6 md:py-24">
          <div className="max-w-[760px]">
            <div className="blur-in section-eyebrow text-[var(--accent-tech)]">
              Claude Code Consulting
            </div>
            <h1 className="clip-reveal clip-reveal-d1 mt-3 font-serif text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[0.98] tracking-tight text-[var(--ink)]">
              Ship 3x Faster with Claude Code
            </h1>
            <p className="mt-4 max-w-[620px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Your team is already using AI. Are they getting $253k in annual savings?
              I configure Claude Code to actually deliver on the promise: fewer
              bugs, faster PRs, autonomous multi-file refactors.
            </p>
            <div className="hero-actions mt-6">
              <a
                className="btn primary"
                href="mailto:hello@maxpetrusenko.com?subject=Claude%20Code%20Consulting"
                style={{ fontSize: "16px", padding: "16px 32px" }}
              >
                Get a Custom Setup Plan
              </a>
              <Link className="btn secondary" href="/tech/case-studies/claude-code-automation">
                See the $253k Case Study
              </Link>
            </div>
          </div>
        </section>
      </div>

      <DirectAnswer
        showUi={false}
        question="What does a Claude Code consultant do?"
        answer="A Claude Code consultant helps development teams configure and optimize Anthropic's Claude Code CLI tool. Services include sub-agent setup, custom skill development, workflow integration, and team training. A recent implementation saved $253k annually with 3x faster feature delivery and 73% fewer production bugs. Available remote worldwide."
        displayAnswer="Claude Code consulting turns the CLI into a team workflow: sub-agents, custom skills, testing guardrails, and rollout guidance. One recent implementation saved $253k annually with 3x faster feature delivery and 73% fewer production bugs."
      />

      {/* Problem Section */}
      <section style={darkBandStyle}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={darkBandHeadingStyle}>The Problem: Claude Code is Powerful, But Most Teams Underutilize It</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CircleX size={18} /> Default Configuration = Generic Output</h3>
              <p style={{ color: "var(--muted)" }}>Out of the box, Claude Code doesn't know your codebase patterns, coding standards, or architecture decisions. You get generic, safe code that doesn't leverage your team's expertise.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CircleX size={18} /> No Sub-Agent Strategy</h3>
              <p style={{ color: "var(--muted)" }}>Most developers use Claude Code as a chat bot, missing the real power: specialized sub-agents for testing, refactoring, documentation, and review that work in parallel.</p>
            </div>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ color: "#dc2626", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CircleX size={18} /> Trust Issues Block Adoption</h3>
              <p style={{ color: "var(--muted)" }}>Teams resist AI write access because they've been burned by hallucinations and context loss. Proper guardrails and testing workflows unlock the real value.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>The Solution: Production-Ready Claude Code Configuration</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Sub-Agent Architecture</h3>
              <p style={{ color: "var(--muted)" }}>Specialized agents for different tasks: <strong>Tester</strong> writes and runs tests, <strong>Refactor</strong> handles multi-file changes, <strong>Reviewer</strong> catches issues before commit. Each agent is configured for your stack.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Custom Skills for Your Codebase</h3>
              <p style={{ color: "var(--muted)" }}>Skills that encode your patterns: preferred libraries, file organization, naming conventions, error handling styles. Claude Code writes code that looks like your team wrote it.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Workflow Integration</h3>
              <p style={{ color: "var(--muted)" }}>GitHub Actions hooks, PR template integration, test suite connection. Claude Code becomes part of your existing process, not a separate tool to remember.</p>
            </div>
            <div className="card" style={{ padding: "24px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 style={{ marginBottom: "8px" }}>Team Training & Documentation</h3>
              <p style={{ color: "var(--muted)" }}>Your team learns when to use Claude Code, how to prompt effectively, and what to verify. Custom documentation for your specific setup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Proof Section */}
      <section style={darkBandStyle}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={darkBandHeadingStyle}>Proven Results: $253k Annual Savings</h2>
          <div className="card" style={{ padding: "32px", background: "linear-gradient(135deg, rgba(15, 126, 169, 0.08) 0%, rgba(15, 126, 169, 0.03) 100%)" }}>
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent-tech)" }}>$253k</div>
                <div style={{ fontSize: "14px", color: "var(--muted)" }}>Annual savings</div>
              </div>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent-tech)" }}>3x</div>
                <div style={{ fontSize: "14px", color: "var(--muted)" }}>Faster feature delivery</div>
              </div>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent-tech)" }}>73%</div>
                <div style={{ fontSize: "14px", color: "var(--muted)" }}>Fewer production bugs</div>
              </div>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent-tech)" }}>127</div>
                <div style={{ fontSize: "14px", color: "var(--muted)" }}>PRs with zero regressions</div>
              </div>
            </div>
            <p style={{ ...darkBandTextStyle, fontSize: "14px" }}>
              Results from a SaaS startup implementation. Claude Code sub-agents given write access to production codebase with proper guardrails and testing workflows.
            </p>
            <Link
              className="btn secondary"
              href="/tech/case-studies/claude-code-automation"
              style={{ marginTop: "16px", display: "inline-block" }}
            >
              Read Full Case Study →
            </Link>
          </div>
        </div>
      </section>

      {/* Offer Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ marginBottom: "24px" }}>What You Get</h2>
          <div className="card" style={{ padding: "32px" }}>
            <h3 style={{ marginBottom: "16px" }}>Claude Code Starter Setup</h3>
            <div style={{ marginBottom: "24px" }}>
              <div className="list" style={{ marginLeft: 0 }}>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Sub-agent configuration for your stack</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> 3-5 custom skills based on your codebase</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> GitHub Actions workflow integration</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Team training session (60-90 min)</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Custom documentation for your setup</li>
                <li style={{ marginLeft: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> 30-day followup support</li>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "8px" }}>Delivery: 1-2 weeks, remote worldwide</div>
              <div style={{ fontSize: "14px", color: "var(--muted)" }}>Pricing: Project-based, starts at $2,500</div>
            </div>
            <a
              className="btn primary"
              href="mailto:hello@maxpetrusenko.com?subject=Claude%20Code%20Setup&body=Hi%20Max%2C%20I%27m%20interested%20in%20Claude%20Code%20consulting.%20Team%20size%3A%20____.%20Current%20setup%3A%20____.%20Timeline%3A%20____."
              style={{ width: "100%", textAlign: "center" }}
            >
              Get Started - Email Max
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={darkBandStyle}>
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={darkBandHeadingStyle}>Frequently Asked Questions</h2>
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>How is this different from GitHub Copilot?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                Copilot provides inline suggestions. Claude Code is a CLI agent that can read your entire codebase, run commands, execute tests, and make architectural decisions across multiple files. It's more autonomous and capable of multi-step reasoning.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>Is it safe to give AI write access?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                With proper guardrails: yes. I configure test suite integration, PR review workflows, and rollback capabilities. The $253k case study had zero regressions across 127 PRs because every change was tested before merge.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>What stack do you work with?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                TypeScript, JavaScript, Python, Go, Rust. Web frameworks: Next.js, React, Vue, Svelte. Backend: Node.js, Django, FastAPI, Rails. I configure Claude Code for your specific stack.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>How long does setup take?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                1-2 weeks for most teams. Week 1: discovery, sub-agent design, initial configuration. Week 2: skill development, workflow integration, team training, documentation.
              </p>
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "8px", fontSize: "18px" }}>Do you offer ongoing support?</h3>
              <p style={{ color: "var(--muted)", fontSize: "15px" }}>
                Yes. After the initial setup, I offer monthly retainer for optimization, new skill development, and team training as your codebase evolves. 30-day support is included in the setup package.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 px-4" style={{ ...darkBandStyle, textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "560px" }}>
          <h2 style={{ marginBottom: "16px", color: "#f3f6fa" }}>Ready to Ship 3x Faster?</h2>
          <p style={{ ...darkBandTextStyle, marginBottom: "24px" }}>
            Get a custom Claude Code setup plan for your team. No commitment, free discovery call.
          </p>
          <a
            className="btn primary"
            href="mailto:hello@maxpetrusenko.com?subject=Claude%20Code%20Consulting%20Discovery"
            style={{ fontSize: "16px", padding: "16px 32px" }}
          >
            Get Your Custom Plan
          </a>
        </div>
      </section>
    </>
  );
}
