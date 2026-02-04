import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { fetchArticles, isLocalArticle, getAllTags } from "@/lib/cms/articles";
import { getProjects } from "@/lib/cms/projects";
import { getCaseStudies } from "@/lib/cms/case-studies";

/**
 * Dynamic sitemap generation
 *
 * Generates a sitemap with all static pages plus dynamic content:
 * - Static pages (home, links, tech, spirituality, about, etc.)
 * - Blog archive entries (Medium mirrors)
 * - Project pages
 * - Tag pages
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/links`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/spirituality`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mindfold/events`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/proof`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/identity`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tech/ai-automation`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tech/case-studies`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tech/case-studies/claude-code-automation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Tech articles
    {
      url: `${baseUrl}/tech/articles/claude-code-setup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles/n8n-workflow-automation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles/chatgpt-api-integration`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles/answer-engine-optimization-aeo`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/generative-ai-score-websites`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/seo-is-dead`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/generative-engine-optimization-geo`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/openclaw-installation-playbook`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Somatic cluster
    {
      url: `${baseUrl}/somatic`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/somatic/approach`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/somatic/modalities`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/somatic/training`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Performance bridge
    {
      url: `${baseUrl}/performance`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Tantra & SEO pages
    {
      url: `${baseUrl}/tantra-massage-ubud`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/spirituality/articles/tantra-trauma-ptsd`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/spirituality/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/spirituality/blog/what-to-expect-first-tantra-session`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/questions-to-ask-tantra-practitioner`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/tantra-vs-regular-massage`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/temple-space-preparation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Dynamic: Blog archive pages (exclude local route-first articles)
  const articles = await fetchArticles();
  const articlePages: MetadataRoute.Sitemap = articles
    .filter((article) => article.slug && !isLocalArticle(article))
    .map((article) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Dynamic: Tag pages for blog filtering
  const tags = await getAllTags();
  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${baseUrl}/blog/tag/${tag.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Dynamic: Projects
  const projects = await getProjects();
  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/tech/${project.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic: Case Studies (individual pages)
  const caseStudies = getCaseStudies();
  const caseStudyPages: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `${baseUrl}/tech/case-studies/${cs.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const normalizeUrl = (url: string) =>
    url.endsWith("/") && url !== baseUrl ? url.slice(0, -1) : url;

  const seen = new Set<string>();
  const allPages = [...staticPages, ...articlePages, ...tagPages, ...projectPages, ...caseStudyPages];

  return allPages.reduce<MetadataRoute.Sitemap>((acc, page) => {
    const normalizedUrl = normalizeUrl(page.url);
    if (seen.has(normalizedUrl)) {
      return acc;
    }
    seen.add(normalizedUrl);
    acc.push({ ...page, url: normalizedUrl });
    return acc;
  }, []);
}
