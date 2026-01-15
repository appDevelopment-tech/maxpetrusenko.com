import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { fetchArticles } from "@/lib/cms/articles";
import { getProjects } from "@/lib/cms/projects";

/**
 * Dynamic sitemap generation
 *
 * Generates a sitemap with all static pages plus dynamic content:
 * - Static pages (home, links, tech, spirituality, about, etc.)
 * - Blog articles from Medium RSS
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
  ];

  // Dynamic: Articles from Medium RSS
  const articles = await fetchArticles();
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic: Projects
  const projects = await getProjects();
  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/tech/${project.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages, ...projectPages];
}
