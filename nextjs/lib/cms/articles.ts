import { MEDIUM_RSS_URL } from "@/config/site";
import { parseMediumRSS } from "@/lib/api/medium";
import type { Article } from "@/types";

const LOCAL_ARTICLES: Article[] = [
  {
    id: "local-spirit-first-session",
    slug: "what-to-expect-first-tantra-session",
    title: "What to Expect in Your First Tantra Massage Session",
    excerpt:
      "Nervous about your first tantra session? This guide walks you through everything from arrival to integration, so you can feel prepared and at ease.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/spirit-first-session.svg",
    link: "/spirituality/blog/what-to-expect-first-tantra-session",
    publishedAt: "2026-02-02T00:00:00.000Z",
    tags: ["Spirituality", "Tantra", "Beginner Guide", "Ubud"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-spirit-questions",
    slug: "questions-to-ask-tantra-practitioner",
    title: "5 Questions to Ask Before Booking a Tantra Practitioner",
    excerpt:
      "Not all tantra practitioners are the same. Here are the essential questions to ask to ensure safety, professionalism, and alignment.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/spirit-questions-screening.svg",
    link: "/spirituality/blog/questions-to-ask-tantra-practitioner",
    publishedAt: "2026-02-02T00:00:00.000Z",
    tags: ["Spirituality", "Tantra", "Safety", "Boundaries"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-spirit-vs-massage",
    slug: "tantra-vs-regular-massage",
    title: "Tantra vs. Regular Massage: What's the Difference?",
    excerpt:
      "Understanding the key differences between tantra massage and traditional spa massage, from nervous system work to conscious presence.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/spirit-vs-massage.svg",
    link: "/spirituality/blog/tantra-vs-regular-massage",
    publishedAt: "2026-02-02T00:00:00.000Z",
    tags: ["Spirituality", "Tantra", "Educational", "Somatic"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-spirit-temple-space",
    slug: "temple-space-preparation",
    title: "How I Prepare the Temple Space for Tantra Sessions",
    excerpt:
      "A behind-the-scenes look at creating a safe, intentional, and grounded container for tantra work in Ubud.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/spirit-temple-space.svg",
    link: "/spirituality/blog/temple-space-preparation",
    publishedAt: "2026-02-02T00:00:00.000Z",
    tags: ["Spirituality", "Tantra", "Practice", "Ubud"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-openclaw",
    slug: "openclaw-installation-playbook",
    title: "OpenClaw Installation Playbook for Teams",
    excerpt:
      "Deployment checklist, security guardrails, and rollout sequence for OpenClaw installations in real client environments.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-openclaw-playbook.svg",
    link: "/tech/articles/openclaw-installation-playbook",
    publishedAt: "2026-02-01T00:00:00.000Z",
    tags: ["Tech", "OpenClaw", "Deployment", "Security"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-aeo",
    slug: "answer-engine-optimization-aeo",
    title: "Answer Engine Optimization (AEO) Guide",
    excerpt:
      "How to structure content so AI answer engines can discover, extract, and cite your expertise.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-aeo-guide.svg",
    link: "/tech/articles/answer-engine-optimization-aeo",
    publishedAt: "2026-02-01T00:00:00.000Z",
    tags: ["Tech", "AEO", "AI Search", "Content Strategy"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-geo",
    slug: "generative-engine-optimization-geo",
    title: "Generative Engine Optimization (GEO) Framework",
    excerpt:
      "A practical GEO operating model for service businesses that want citations and qualified leads.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-geo-framework.svg",
    link: "/tech/articles/generative-engine-optimization-geo",
    publishedAt: "2026-01-31T00:00:00.000Z",
    tags: ["Tech", "GEO", "AI Visibility", "Growth"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-ai-score",
    slug: "generative-ai-score-websites",
    title: "Generative AI Score for Websites",
    excerpt:
      "What AI engines evaluate before citing or recommending a website.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-generative-ai-score.svg",
    link: "/tech/articles/generative-ai-score-websites",
    publishedAt: "2026-01-31T00:00:00.000Z",
    tags: ["Tech", "AI Visibility", "GEO", "Website Quality"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-seo-split",
    slug: "seo-is-dead",
    title: "SEO Is Not Dead - It Split Into Search + Answers",
    excerpt:
      "Why classic SEO still matters and how to adapt content strategy for AI-assisted discovery.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-seo-split.svg",
    link: "/tech/articles/seo-is-dead",
    publishedAt: "2026-01-30T00:00:00.000Z",
    tags: ["Tech", "SEO", "AEO", "Strategy"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-claude-code",
    slug: "claude-code-setup",
    title: "Claude Code Setup Guide",
    excerpt:
      "Step-by-step setup and workflow recommendations for teams implementing Claude Code.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-claude-code-setup.svg",
    link: "/tech/articles/claude-code-setup",
    publishedAt: "2026-01-30T00:00:00.000Z",
    tags: ["Tech", "Claude Code", "Developer Tools", "AI"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-n8n",
    slug: "n8n-workflow-automation",
    title: "n8n Workflow Automation Patterns",
    excerpt:
      "Workflow architecture patterns for stable, debuggable, production n8n systems.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-n8n-workflow.svg",
    link: "/tech/articles/n8n-workflow-automation",
    publishedAt: "2026-01-29T00:00:00.000Z",
    tags: ["Tech", "n8n", "Automation", "Architecture"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-tech-chatgpt-api",
    slug: "chatgpt-api-integration",
    title: "ChatGPT API Integration Best Practices",
    excerpt:
      "Production architecture, prompt strategy, and reliability practices for ChatGPT integrations.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/article-covers/tech-chatgpt-api.svg",
    link: "/tech/articles/chatgpt-api-integration",
    publishedAt: "2026-01-29T00:00:00.000Z",
    tags: ["Tech", "ChatGPT", "API Integration", "AI"],
    author: { name: "Max Petrusenko" },
  },
];

const FALLBACK_ARTICLES: Article[] = [
  {
    id: "65b991356c25",
    slug: "65b991356c25",
    title: "Unleash Your Inner Wizard: Claude Skills",
    excerpt:
      "Practical breakdown of Claude Skills and how they improve reliability in day-to-day AI-assisted development workflows.",
    content:
      "<p>This is a fallback preview from Max Petrusenko's Medium archive. Open the original to read the full article and examples.</p>",
    image: "/images/article-covers/medium-claude-skills.svg",
    link: "https://medium.com/p/65b991356c25",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["AI", "Claude", "Automation"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "0faac1248080",
    slug: "0faac1248080",
    title: "Claude Code: The AI Developer's Secret Weapon",
    excerpt:
      "Execution patterns, setup notes, and trade-offs for adopting Claude Code in real software teams.",
    content:
      "<p>This is a fallback preview from Max Petrusenko's Medium archive. Open the original to read the full article and examples.</p>",
    image: "/images/article-covers/medium-claude-code.svg",
    link: "https://medium.com/p/0faac1248080",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["AI", "Developer Tools", "Claude Code"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "99c594d458b5",
    slug: "99c594d458b5",
    title: "The Smartphone That Makes Police Officers Sweat",
    excerpt:
      "A practical look at mobile privacy posture and what hardened mobile operating systems change in practice.",
    content:
      "<p>This is a fallback preview from Max Petrusenko's Medium archive. Open the original to read the full article and examples.</p>",
    image: "/images/article-covers/medium-privacy-phone.svg",
    link: "https://medium.com/p/99c594d458b5",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Privacy", "Security", "Mobile"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "52e70e459cc2",
    slug: "52e70e459cc2",
    title: "Why Most People Are Dead Wrong About Global Wealth",
    excerpt:
      "A data-grounded breakdown of global wealth assumptions, framing effects, and policy narratives.",
    content:
      "<p>This is a fallback preview from Max Petrusenko's Medium archive. Open the original to read the full article and examples.</p>",
    image: "/images/article-covers/medium-global-wealth.svg",
    link: "https://medium.com/p/52e70e459cc2",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Economics", "Data", "Wealth"],
    author: { name: "Max Petrusenko" },
  },
  // Additional Medium article fallbacks for Google Discovery
  {
    id: "05a1427581a3",
    slug: "05a1427581a3",
    title: "Building Calm Products: A Founder's Approach",
    excerpt:
      "How I build products that help creators ship without the noise. Focus on clarity, presence, and lasting results over vanity metrics.",
    content:
      "<p>In a world of endless notifications and distraction, I choose to build calm products. As a tech consultant and product builder, I help founders ship meaningful work without drowning in complexity.</p><p>My approach combines three principles: clarity over cleverness, presence in the development process, and lasting results over quick wins.</p><p>I work with Claude Code, n8n automation, and ChatGPT integrations to help teams move faster while maintaining sanity. Whether you need AI workflow automation, product strategy, or technical implementation—I focus on outcomes that matter.</p><p>Based in Ubud, Bali and Miami, Florida, I work with founders globally who want to build thoughtfully.</p>",
    image: "/images/article-covers/medium-claude-code.svg",
    link: "https://medium.com/p/05a1427581a3",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Tech", "Product", "Automation"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "12a98f036691",
    slug: "12a98f036691",
    title: "AI Automation That Actually Works",
    excerpt:
      "Practical AI automation for founders who need results, not hype. Claude Code, n8n workflows, and systems that scale.",
    content:
      "<p>Most AI automation fails because it's built for demos, not production. I help founders build systems that actually work—handling edge cases, failing gracefully, and providing real value.</p><p>My tech consulting focuses on three areas: Claude Code implementation for development teams, n8n workflow automation for business operations, and ChatGPT API integrations for customer-facing features.</p><p>I don't sell you a tool and disappear. I help you think through the architecture, implement it properly, and ensure your team can maintain it. Available remotely worldwide and in-person in Miami and Ubud.</p>",
    image: "/images/article-covers/tech-claude-code-setup.svg",
    link: "https://medium.com/p/12a98f036691",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["AI", "Automation", "n8n"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "1e454d39553b",
    slug: "1e454d39553b",
    title: "Tantra Massage for nervous system regulation",
    excerpt:
      "How tantra massage works with your nervous system to release stored tension and return to calm presence.",
    content:
      "<p>Tantra massage is fundamentally nervous system work, not sexual service. Through breathwork, conscious touch, and somatic awareness, we help your body shift from fight-or-flight into rest-and-digest.</p><p>In my practice, I work with three modalities: Nervous System Reset (90 min) for arriving safely in your body, Deep Repatterning for ongoing transformational work, and Kyo-tai Immersion for those ready for intensive bodywork.</p><p>Sessions are boundaries-first, consent-led, and tailored to your system. I work with individuals of all genders and couples in Ubud, Bali and Miami, Florida.</p>",
    image: "/images/article-covers/spirit-first-session.svg",
    link: "https://medium.com/p/1e454d39553b",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Spirituality", "Tantra", "Nervous System"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "2fbbfd3d630c",
    slug: "2fbbfd3d630c",
    title: "Somatic Energy Work: Beyond Talk Therapy",
    excerpt:
      "Why somatic practices reach what talk therapy can't—working directly with the body's stored patterns and tension.",
    content:
      "<p>Talk therapy helps us understand our stories. Somatic energy work helps us release them from our tissues. When we experience trauma, chronic stress, or overwhelm, our bodies store these patterns physically.</p><p>Through tantra massage, breathwork, and conscious touch, I help clients access and release stored tension. The work is non-sexual, focused on nervous system regulation and embodied awareness.</p><p>Based in Ubud, Bali and Miami, Florida, I offer sessions for individuals and couples who are ready to feel again.</p>",
    image: "/images/article-covers/spirit-vs-massage.svg",
    link: "https://medium.com/p/2fbbfd3d630c",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Spirituality", "Somatic", "Bodywork"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "3749fc88b06d",
    slug: "3749fc88b06d",
    title: "Claude Code for Small Teams",
    excerpt:
      "How small teams can adopt Claude Code without drowning in complexity. Setup, workflows, and guardrails that work.",
    content:
      "<p>Claude Code isn't just for large engineering organizations. Small teams can benefit even more—from faster feature delivery to fewer bugs in production. The key is adopting it thoughtfully.</p><p>I help small teams implement Claude Code with custom sub-agents, project-specific skills, and workflows that match how you actually work. No generic prompts, no reinventing the wheel every time.</p><p>Whether you need help with initial setup, workflow design, or training your team, I offer consulting that meets you where you are.</p>",
    image: "/images/article-covers/tech-claude-code-setup.svg",
    link: "https://medium.com/p/3749fc88b06d",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Tech", "Claude Code", "Developer Tools"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "90216a191187",
    slug: "90216a191187",
    title: "What to Expect in Your First Tantra Session",
    excerpt:
      "Nervous about your first tantra session? This walkthrough covers arrival, boundaries, and what to expect from the experience.",
    content:
      "<p>It's normal to feel nervous before your first tantra session. Many clients arrive unsure what to expect. Here's what a typical session looks like.</p><p>We begin with intention-setting and boundary agreement. You'll share what brings you, what you hope to experience, and any areas to avoid. This establishes clear consent and creates safety.</p><p>The session itself combines breathwork, conscious touch, and somatic awareness techniques. You remain clothed or draped throughout. The focus is on nervous system regulation and embodied awareness.</p><p>I offer sessions in Ubud, Bali and Miami, Florida for individuals and couples of all genders.</p>",
    image: "/images/article-covers/spirit-first-session.svg",
    link: "https://medium.com/p/90216a191187",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Spirituality", "Tantra", "Beginner Guide"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "db8811dd5cbf",
    slug: "db8811dd5cbf",
    title: "n8n Workflow Automation for Founders",
    excerpt:
      "How founders use n8n to automate their businesses without engineering teams. Practical patterns and examples.",
    content:
      "<p>n8n is the secret weapon of founders who need automation but can't afford an engineering team. It connects your tools—Airtable, Notion, Google Workspace, Slack—into workflows that run while you sleep.</p><p>I help founders design and build n8n automations that handle lead capture, customer onboarding, content distribution, and more. The key is starting with high-impact, low-complexity workflows.</p><p>Whether you need help with architecture, implementation, or training your team to maintain what we build, I offer consulting that gets you unstuck.</p>",
    image: "/images/article-covers/tech-n8n-workflow.svg",
    link: "https://medium.com/p/db8811dd5cbf",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Tech", "n8n", "Automation"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "e5adcd3fa347",
    slug: "e5adcd3fa347",
    title: "Two Practices, One Person: Tech and Tantra",
    excerpt:
      "How I bridge two seemingly different worlds—AI automation consulting and tantra massage—through the same principle of presence.",
    content:
      "<p>People ask how I can be both a tech consultant and a tantra practitioner. To me, they're not different. Both require deep presence, reading what's actually happening (not what I wish was happening), and intervening skillfully.</p><p>As a tech consultant, I help founders build AI automation systems with Claude Code, n8n, and ChatGPT. As a somatic practitioner, I help clients regulate their nervous systems through tantra massage and energy work.</p><p>Both are about clarity, presence, and lasting results. I maintain bases in Ubud, Bali and Miami, Florida, and work with clients globally.</p>",
    image: "/images/article-covers/tech-claude-code-setup.svg",
    link: "https://medium.com/p/e5adcd3fa347",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Tech", "Spirituality", "Integration"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "f4d46013850c",
    slug: "f4d46013850c",
    title: "Kyo-tai Immersion: Intensive Bodywork for Pattern Release",
    excerpt:
      "Kyo-tai is intensive Japanese bodywork for those ready to move beyond gentle massage into deep pattern release.",
    content:
      "<p>Kyo-tai immersion is not gentle massage. It's intensive contact practice—bending, leveraging, and sustained pressure to purge old energy and break somatic patterns.</p><p>This work is for those who've done talk therapy, tried gentle approaches, and are ready for something more direct. We move as one system to 'jump' consciousness out of stuck states.</p><p>Sessions are non-sexual, boundaries-first, and require clear intention-setting beforehand. Limited spots. Message to align on readiness and intentions.</p><p>Available in Ubud, Bali and Miami, Florida by arrangement.</p>",
    image: "/images/article-covers/spirit-vs-massage.svg",
    link: "https://medium.com/p/f4d46013850c",
    publishedAt: "2025-01-01T00:00:00.000Z",
    tags: ["Spirituality", "Bodywork", "Kyo-tai"],
    author: { name: "Max Petrusenko" },
  },
];

function sortArticlesByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const left = Date.parse(a.publishedAt);
    const right = Date.parse(b.publishedAt);

    if (Number.isNaN(left) || Number.isNaN(right)) {
      return a.title.localeCompare(b.title);
    }

    return right - left;
  });
}

function mergeUniqueArticles(...groups: Article[][]): Article[] {
  const seen = new Set<string>();
  const merged: Article[] = [];

  for (const group of groups) {
    for (const article of group) {
      if (seen.has(article.slug)) {
        continue;
      }
      seen.add(article.slug);
      merged.push(article);
    }
  }

  return merged;
}

export function isLocalArticle(article: Pick<Article, "link">): boolean {
  return article.link.startsWith("/");
}

function normalizeTagValue(value: string): string {
  let decoded = value;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  return decoded.trim().toLowerCase().replace(/-/g, " ");
}

/**
 * Fetch all articles with local repo content as primary source
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    const liveArticles = await parseMediumRSS(MEDIUM_RSS_URL, [], 50);
    return sortArticlesByDateDesc(
      mergeUniqueArticles(LOCAL_ARTICLES, liveArticles, FALLBACK_ARTICLES)
    );
  } catch (error) {
    console.error("Error fetching articles:", error);
    return sortArticlesByDateDesc(
      mergeUniqueArticles(LOCAL_ARTICLES, FALLBACK_ARTICLES)
    );
  }
}

/**
 * Fetch featured articles (local-first)
 */
export async function fetchFeaturedArticles(): Promise<Article[]> {
  try {
    const articles = await fetchArticles();
    return articles.slice(0, 3);
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    return LOCAL_ARTICLES.slice(0, 3);
  }
}

/**
 * Fetch article by slug (ID)
 */
export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const articles = await fetchArticles();
    return articles.find((a) => a.slug === slug) || null;
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
}

/**
 * Get all unique tags from articles
 */
export async function getAllTags(): Promise<Array<{ name: string; slug: string; count: number }>> {
  try {
    const articles = await fetchArticles();
    const tagMap = new Map<string, number>();

    for (const article of articles) {
      for (const tag of article.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error getting tags:", error);
    return [];
  }
}

/**
 * Get articles by tag
 */
export async function fetchArticlesByTag(tag: string): Promise<Article[]> {
  try {
    const articles = await fetchArticles();
    const normalizedTag = normalizeTagValue(tag);

    return articles.filter((a) =>
      a.tags.some((t) => normalizeTagValue(t) === normalizedTag)
    );
  } catch (error) {
    console.error("Error fetching articles by tag:", error);
    return [];
  }
}

/**
 * Get related articles based on tags
 */
export async function getRelatedArticles(
  currentSlug: string,
  tags: string[],
  limit = 3
): Promise<Article[]> {
  try {
    const allArticles = await fetchArticles();
    return allArticles
      .filter(
        (a) =>
          a.slug !== currentSlug &&
          a.tags.some((t) => tags.map((tag) => tag.toLowerCase()).includes(t.toLowerCase()))
      )
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting related articles:", error);
    return [];
  }
}
