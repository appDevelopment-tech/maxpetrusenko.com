import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "AI Consulting Reddit" },
  description:
    "What people on Reddit actually ask about AI consulting: is it worth it, how much does it cost, and how do you pick a good consultant. Answered straight, with real proof.",
  alternates: { canonical: absoluteUrl("/ai-consulting-reddit") },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: absoluteUrl("/ai-consulting-reddit"),
    title: "AI Consulting Reddit",
    description:
      "What people on Reddit actually ask about AI consulting: is it worth it, how much does it cost, and how do you pick a good consultant.",
    siteName: "Max Petrusenko",
    images: [
      {
        url: absoluteUrl("/images/og-home.png"),
        width: 1200,
        height: 630,
        alt: "AI Consulting Reddit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Consulting Reddit",
    description:
      "What people on Reddit actually ask about AI consulting: is it worth it, how much does it cost, and how do you pick a good consultant.",
    images: [absoluteUrl("/images/og-home.png")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is AI consulting worth it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, when there is a concrete workflow or system to build — automations, integrations, evaluation, productionizing. It is worth it because you get senior AI engineering experience without a full-time hire. It is not worth it when the problem is undefined and the goal is vague 'AI strategy' with no measurable outcome.",
      },
    },
    {
      "@type": "Question",
      name: "How much does AI consulting cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Independent AI consultants typically charge $75–250/hour, specialized consultants $150–400/hour, and agencies $250–500+/hour. Max Petrusenko publishes his rate openly: $150/hour for AI consulting, with 1, 5, and 10-hour blocks and a $1 intro call.",
      },
    },
    {
      "@type": "Question",
      name: "What does an AI consultant actually do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Builds automation workflows (n8n, Claude Code, custom agents), integrates APIs and tools, evaluates AI vendors and models, ships internal tools, and trains teams — everything that turns AI from demos into working systems.",
      },
    },
    {
      "@type": "Question",
      name: "How do I pick a good AI consultant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ask for concrete shipped work, references, and a scope with measurable outcomes. A good consultant will ask about your process before talking about AI, and will happily show case studies with numbers. Avoid anyone who promises vague results or won't show proof.",
      },
    },
  ],
};

export default function AiConsultingRedditPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "AI Consulting Reddit",
          description:
            "What people on Reddit actually ask about AI consulting: is it worth it, how much does it cost, and how do you pick a good consultant.",
          url: "/ai-consulting-reddit",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "AI Consulting Reddit", url: "/ai-consulting-reddit" },
        ])}
      />
      <JsonLd type="FAQPage" data={faqSchema} />

      <section className="section">
        <div className="wrap">
          <span className="kicker">AI consulting, answered straight</span>
          <h1 style={{ marginTop: 8 }}>AI Consulting Reddit</h1>
          <p className="lede" style={{ maxWidth: 720 }}>
            People ask the same questions about AI consulting everywhere — on Reddit, in
            DMs, on calls. Is it worth it? What does it cost? How do you pick someone good?
            This page answers them honestly, with published proof instead of hype.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Worth it?</span>
            <h2>Is AI consulting worth it?</h2>
            <span className="section-note">The honest answer: it depends on the problem</span>
          </div>
          <div className="prose" style={{ maxWidth: 720 }}>
            <p>
              AI consulting is worth it when there is a concrete system to build: an
              automation that saves hours every week, an integration that unblocks a team,
              an evaluation that tells you which model actually works for your data. That is
              real, measurable work — and hiring a senior engineer full-time for it usually
              costs more than the project is worth.
            </p>
            <p>
              It is <strong>not</strong> worth it when the goal is vague. &ldquo;Help us with
              AI strategy&rdquo; with no defined outcome is how budgets disappear. A good
              consultant will push you to define the measurable result before writing a line
              of code.
            </p>
            <p>
              Proof of the worth-it case: a published{" "}
              <Link href="/tech/case-studies/claude-code-automation">$253k/year case study</Link>{" "}
              from Claude Code automation — 3x faster feature delivery, 73% fewer production
              bugs, zero regressions across 127 PRs. That is what focused automation work
              looks like when it lands.
            </p>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Cost</span>
            <h2>How much does AI consulting cost?</h2>
            <span className="section-note">Published rates, not &ldquo;tell us your budget&rdquo;</span>
          </div>
          <div className="prose" style={{ maxWidth: 720 }}>
            <p>Typical market ranges in 2026:</p>
            <ul>
              <li>Independent freelancers: <strong>$75–250/hour</strong></li>
              <li>Specialized AI consultants: <strong>$150–400/hour</strong></li>
              <li>Agencies: <strong>$250–500+/hour</strong> (with overhead baked in)</li>
            </ul>
            <p>
              This site publishes its rate openly:{" "}
              <Link href="/pricing">$150/hour for AI consulting</Link>, in 1, 5, or
              10-hour blocks, with a $1 intro call so you can vet the fit before spending
              real money. Fixed-scope packages are usually the better deal when the work is
              well defined.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">The work</span>
            <h2>What does an AI consultant actually do?</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Automation</h3>
              <p>n8n workflows, Claude Code agents, and custom pipelines that turn manual hours into minutes.</p>
            </div>
            <div className="card">
              <h3>Integration</h3>
              <p>Connecting your tools and APIs so the systems you already pay for start talking to each other.</p>
            </div>
            <div className="card">
              <h3>Evaluation &amp; shipping</h3>
              <p>Picking the right model, testing it against your data, and putting it in production — not a demo.</p>
            </div>
          </div>
          <p style={{ maxWidth: 720, marginTop: 20 }}>
            See the full scope of work on the <Link href="/tech">tech page</Link> and the{" "}
            <Link href="/tech/articles">articles on shipping real AI systems</Link>.
          </p>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Vetting</span>
            <h2>How to pick a good AI consultant</h2>
          </div>
          <div className="prose" style={{ maxWidth: 720 }}>
            <p>Ask these before you hire anyone:</p>
            <ul>
              <li>What have you shipped, and can I see it? (not slides — systems)</li>
              <li>What measurable outcome do you expect from this engagement?</li>
              <li>Who are your references, and can I talk to them?</li>
              <li>What is your process for scoping before you start billing?</li>
            </ul>
            <p>
              <strong>Red flags:</strong> vague promises (&ldquo;we&rsquo;ll transform your
              business with AI&rdquo;), no named past work, hourly-only with no scope, and
              refusing to show proof. A consultant who can&rsquo;t show evidence of outcomes
              is selling a narrative.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">FAQ</span>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="prose" style={{ maxWidth: 720 }}>
            <p>
              <strong>Is AI consulting worth it?</strong>
              <br />
              Yes, for concrete buildable work — automation, integration, evaluation,
              productionizing. No, for vague strategy with no measurable outcome.
            </p>
            <p>
              <strong>How much does AI consulting cost?</strong>
              <br />
              Freelancers $75–250/hr, specialized consultants $150–400/hr, agencies
              $250–500+/hr. This site charges <Link href="/pricing">$150/hr, published openly</Link>.
            </p>
            <p>
              <strong>Consultant or agency?</strong>
              <br />
              A good independent consultant gives you senior experience at roughly half the
              agency rate, with fewer layers between you and the person doing the work.
            </p>
            <p>
              <strong>Do I need to know AI to hire one?</strong>
              <br />
              No — you need to know your own process and what you want to stop doing
              manually. The consultant handles the rest, and a good one explains everything
              in plain language.
            </p>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Next step</span>
            <h2>Skip the thread — book a call</h2>
            <p className="section-note">
              A 15-minute intro call costs $1. You get a straight answer about whether this
              is worth doing, no sales pitch.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn primary" href="/pricing">
              Book a call
            </Link>
            <Link className="btn secondary" href="/max-petrusenko-reviews">
              Read the reviews
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
