import { MEDIUM_RSS_URL } from "@/config/site";
import { parseMediumRSS } from "@/lib/api/medium";
import {
  EXPANSION_ARTICLES,
  EXPANSION_TOPIC_GROUPS,
  TOPIC_PERSPECTIVE_KEYS,
  type ExpansionTopicGroup,
} from "@/lib/cms/article-backlog";
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
    id: "local-spirit-kyo-tai-intro",
    slug: "what-is-kyo-tai",
    title: "What Is Kyo-tai? A Two-Body Somatic Practice",
    excerpt:
      "Kyo-tai is my name for a two-body practice that blends contact, pressure, rhythm, and energetic transmission into one listening system.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/og-default.svg",
    link: "/spirituality/blog/what-is-kyo-tai",
    publishedAt: "2026-03-06T00:00:00.000Z",
    tags: ["Spirituality", "Kyo-tai", "Somatic", "Contact Improvisation"],
    author: { name: "Max Petrusenko" },
  },
  {
    id: "local-spirit-kyo-tai-session",
    slug: "kyo-tai-session-what-happens",
    title: "What Happens in a Kyo-tai Session",
    excerpt:
      "A practical walkthrough of consent, pacing, pressure, energetic intensity, and integration inside a Kyo-tai session.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/og-default.svg",
    link: "/spirituality/blog/kyo-tai-session-what-happens",
    publishedAt: "2026-03-06T00:00:00.000Z",
    tags: ["Spirituality", "Kyo-tai", "Session Guide", "Boundaries"],
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
  {
    id: "local-tech-bitcoin-strong-money",
    slug: "bitcoin-as-strong-money",
    title: "Bitcoin as Strong Money",
    excerpt:
      "Why Bitcoin is treated differently from generic crypto: scarcity, self-custody, neutral settlement, and the tradeoffs that still matter.",
    content:
      "<p>This article is published on maxpetrusenko.com. Open the canonical route to read the full version.</p>",
    image: "/images/og-default.svg",
    link: "/tech/articles/bitcoin-as-strong-money",
    publishedAt: "2026-03-06T00:00:00.000Z",
    tags: ["Tech", "Bitcoin", "Money", "Strategy"],
    author: { name: "Max Petrusenko" },
  },
  ...EXPANSION_ARTICLES,
];

export function getLocalArticles(): Article[] {
  return LOCAL_ARTICLES;
}

export function getRelatedLocalArticles(currentLink: string, limit = 3): Article[] {
  const normalized = currentLink.split("#")[0].split("?")[0];
  const isTech = normalized.startsWith("/tech/");
  const isSpirituality = normalized.startsWith("/spirituality/");

  let pool = LOCAL_ARTICLES.filter((article) => article.link !== normalized);

  if (isTech) {
    pool = pool.filter((article) => article.link.startsWith("/tech/articles/"));
  } else if (isSpirituality) {
    pool = pool.filter((article) => article.link.startsWith("/spirituality/"));
  }

  return sortArticlesByDateDesc(pool).slice(0, limit);
}


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

function isTopicClusterSlug(slug: string, topicSlug: string): boolean {
  const prefix = `${topicSlug}-`;

  if (!slug.startsWith(prefix)) {
    return false;
  }

  const suffix = slug.slice(prefix.length);
  return TOPIC_PERSPECTIVE_KEYS.includes(suffix);
}

export interface TopicClusterSummary {
  topic: ExpansionTopicGroup;
  articles: Article[];
}

export function detectTopicSlugFromArticleSlug(slug: string): string | null {
  const match = EXPANSION_TOPIC_GROUPS.find((topic) =>
    isTopicClusterSlug(slug, topic.slug)
  );

  return match?.slug ?? null;
}

export function getTopicGroupBySlug(topicSlug: string): ExpansionTopicGroup | null {
  return EXPANSION_TOPIC_GROUPS.find((topic) => topic.slug === topicSlug) ?? null;
}

/**
 * Fetch all articles with local repo content as primary source
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    const liveArticles = await parseMediumRSS(MEDIUM_RSS_URL, [], 50);
    return sortArticlesByDateDesc(
      mergeUniqueArticles(LOCAL_ARTICLES, liveArticles)
    );
  } catch (error) {
    console.error("Error fetching articles:", error);
    return sortArticlesByDateDesc(
      mergeUniqueArticles(LOCAL_ARTICLES)
    );
  }
}

export async function fetchArticlesByTopicSlug(topicSlug: string): Promise<Article[]> {
  const articles = await fetchArticles();

  return sortArticlesByDateDesc(
    articles.filter(
      (article) =>
        isLocalArticle(article) &&
        article.link.startsWith("/blog/") &&
        isTopicClusterSlug(article.slug, topicSlug)
    )
  );
}

export async function fetchTopicClusters(): Promise<TopicClusterSummary[]> {
  const articles = await fetchArticles();
  const localBlogArticles = articles.filter(
    (article) => isLocalArticle(article) && article.link.startsWith("/blog/")
  );

  return EXPANSION_TOPIC_GROUPS.map((topic) => ({
    topic,
    articles: sortArticlesByDateDesc(
      localBlogArticles.filter((article) =>
        isTopicClusterSlug(article.slug, topic.slug)
      )
    ),
  })).filter((entry) => entry.articles.length > 0);
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
