import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { siteConfig } from "@/config/site";

const technicalArticles = [
  {
    href: "/tech/articles/openclaw-installation-playbook",
    title: "OpenClaw Installation Playbook for Teams",
    description:
      "Deployment checklist, security guardrails, and rollout sequence for OpenClaw installations in real client environments.",
    category: "Deployment",
  },
  {
    href: "/tech/articles/answer-engine-optimization-aeo",
    title: "Answer Engine Optimization (AEO) Guide",
    description:
      "How to structure content so AI answer engines can discover, extract, and cite your expertise.",
    category: "AEO",
  },
  {
    href: "/tech/articles/generative-engine-optimization-geo",
    title: "Generative Engine Optimization (GEO) Framework",
    description:
      "A practical GEO operating model for service businesses that want citations and qualified leads.",
    category: "GEO",
  },
  {
    href: "/tech/articles/generative-ai-score-websites",
    title: "Generative AI Score for Websites",
    description:
      "What AI engines evaluate before citing or recommending a website.",
    category: "AI Visibility",
  },
  {
    href: "/tech/articles/seo-is-dead",
    title: "SEO Is Not Dead - It Split Into Search + Answers",
    description:
      "Why classic SEO still matters and how to adapt content strategy for AI-assisted discovery.",
    category: "Strategy",
  },
  {
    href: "/tech/articles/claude-code-setup",
    title: "Claude Code Setup Guide",
    description:
      "Step-by-step setup and workflow recommendations for teams implementing Claude Code.",
    category: "Claude Code",
  },
  {
    href: "/tech/articles/n8n-workflow-automation",
    title: "n8n Workflow Automation Patterns",
    description:
      "Workflow architecture patterns for stable, debuggable, production n8n systems.",
    category: "Automation",
  },
  {
    href: "/tech/articles/chatgpt-api-integration",
    title: "ChatGPT API Integration Best Practices",
    description:
      "Production architecture, prompt strategy, and reliability practices for ChatGPT integrations.",
    category: "API Integration",
  },
];

export const metadata = generateMetadata({
  title: "Tech Articles",
  description:
    "Technical guides by Max Petrusenko on OpenClaw installs, AEO, GEO, Claude Code, n8n, and AI product implementation.",
  ogType: "website",
  canonical: absoluteUrl("/tech/articles"),
  keywords: [
    "OpenClaw install",
    "AEO",
    "GEO",
    "AI automation",
    "Claude Code",
    "n8n workflows",
    "ChatGPT integration",
  ],
});

export default function TechArticlesIndexPage() {
  const mediumUrl = siteConfig.social.medium ?? "https://medium.com/@max.petrusenko";

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Tech Articles",
          description:
            "Technical guides by Max Petrusenko on OpenClaw installs, AEO, GEO, and AI product execution.",
          url: "/tech/articles",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
        ])}
      />

      <div className="container">
        <article className="page">
          <section className="section" style={{ marginTop: 0 }}>
            <Link href="/tech" className="btn sm secondary" style={{ marginBottom: 20, display: "inline-flex" }}>
              ← Back to Tech
            </Link>

            <header style={{ maxWidth: 860, margin: "0 auto" }}>
              <div className="eyebrow">
                <span className="dot"></span> Technical Writing
              </div>
              <h1 className="text-display" style={{ marginBottom: 12 }}>
                Tech Articles
              </h1>
              <p className="text-xl text-muted" style={{ marginBottom: 18 }}>
                Practical implementation notes from client work: OpenClaw installs,
                AI workflow architecture, AEO, and Generative Engine Optimization.
              </p>
              <p className="text-muted" style={{ marginBottom: 0 }}>
                Medium archive: <a href={mediumUrl} target="_blank" rel="noopener">{mediumUrl}</a>
              </p>
            </header>

            <div className="article-list" style={{ maxWidth: 920, margin: "32px auto 0" }}>
              {technicalArticles.map((article) => (
                <Link
                  key={article.href}
                  href={article.href}
                  className="article-card"
                  style={{ gridTemplateColumns: "1fr" }}
                >
                  <div className="article-body">
                    <span className="article-title">{article.title}</span>
                    <span className="article-sub">{article.description}</span>
                    <div className="article-meta">
                      <span className="stat">{article.category}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
