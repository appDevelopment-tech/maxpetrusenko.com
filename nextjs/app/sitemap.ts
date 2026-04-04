import { MetadataRoute } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import { siteConfig } from "@/config/site";
import { fetchArticles } from "@/lib/cms/articles";
import { shouldIndexBlogTagPage } from "@/lib/cms/legacy-blog-compat";
import { getProjects } from "@/lib/cms/projects";
import { getCaseStudies } from "@/lib/cms/case-studies";

function getValidDate(value?: string | null): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLatestDate(dates: Array<Date | null | undefined>, fallback: Date): Date {
  const validDates = dates.filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()));

  if (validDates.length === 0) return fallback;

  return validDates.reduce((latest, current) => (current > latest ? current : latest));
}

function tagToSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

async function getFileLastModified(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

function routeToPageFile(appDir: string, route: string): string {
  if (route === "/") {
    return path.join(appDir, "page.tsx");
  }

  return path.join(appDir, route.replace(/^\//, ""), "page.tsx");
}

async function getRouteLastModified(
  appDir: string,
  route: string,
  fallback: Date,
  extraFiles: string[] = []
): Promise<Date> {
  const routeFile = routeToPageFile(appDir, route);
  const dates = await Promise.all([
    getFileLastModified(routeFile),
    ...extraFiles.map((file) => getFileLastModified(file)),
  ]);

  return getLatestDate(dates, fallback);
}

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
  const appDir = path.join(process.cwd(), "app");
  const cmsDir = path.join(process.cwd(), "lib", "cms");

  const fallbackLastModified =
    (await getFileLastModified(path.join(appDir, "sitemap.ts"))) ??
    new Date("2026-01-01T00:00:00.000Z");

  // Dynamic: Blog archive pages (exclude local route-first articles)
  const articles = await fetchArticles();
  const latestArticleDate = getLatestDate(
    articles.map((article) => getValidDate(article.publishedAt)),
    fallbackLastModified
  );
  const canonicalBlogArticles = articles.filter((article) => article.link.startsWith("/blog/"));
  const tagPagesBySlug = new Map<string, { count: number; lastModified: Date }>();

  for (const article of articles) {
    const articleLastModified = getValidDate(article.publishedAt) ?? latestArticleDate;

    for (const tag of article.tags) {
      const slug = tagToSlug(tag);
      if (!slug) continue;

      const existing = tagPagesBySlug.get(slug);
      if (!existing) {
        tagPagesBySlug.set(slug, {
          count: 1,
          lastModified: articleLastModified,
        });
        continue;
      }

      tagPagesBySlug.set(slug, {
        count: existing.count + 1,
        lastModified: getLatestDate([existing.lastModified, articleLastModified], articleLastModified),
      });
    }
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: await getRouteLastModified(appDir, "/", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/links`,
      lastModified: await getRouteLastModified(appDir, "/links", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech`,
      lastModified: await getRouteLastModified(appDir, "/tech", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/spirituality`,
      lastModified: await getRouteLastModified(appDir, "/spirituality", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: await getRouteLastModified(appDir, "/about", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mindfold/events`,
      lastModified: await getRouteLastModified(appDir, "/mindfold/events", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: getLatestDate(
        [
          await getRouteLastModified(appDir, "/blog", fallbackLastModified, [path.join(cmsDir, "articles.ts")]),
          latestArticleDate,
        ],
        fallbackLastModified
      ),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/topics`,
      lastModified: getLatestDate(
        [
          await getRouteLastModified(appDir, "/blog/topics", fallbackLastModified, [
            path.join(cmsDir, "articles.ts"),
            path.join(cmsDir, "article-backlog.ts"),
          ]),
          latestArticleDate,
        ],
        fallbackLastModified
      ),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/consciousness-tech`,
      lastModified: await getRouteLastModified(appDir, "/blog/consciousness-tech", fallbackLastModified, [
        path.join(cmsDir, "articles.ts"),
        path.join(cmsDir, "article-backlog.ts"),
      ]),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/consciousness-assistant`,
      lastModified: await getRouteLastModified(appDir, "/consciousness-assistant", fallbackLastModified, [
        path.join(appDir, "api", "consciousness", "route.ts"),
      ]),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/socialmedia`,
      lastModified: await getRouteLastModified(appDir, "/socialmedia", fallbackLastModified, [
        path.join(appDir, "api", "social-posts", "route.ts"),
      ]),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/proof`,
      lastModified: await getRouteLastModified(appDir, "/proof", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/identity`,
      lastModified: await getRouteLastModified(appDir, "/identity", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tech/ai-automation`,
      lastModified: await getRouteLastModified(appDir, "/tech/ai-automation", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tech/case-studies`,
      lastModified: await getRouteLastModified(appDir, "/tech/case-studies", fallbackLastModified, [
        path.join(cmsDir, "case-studies.ts"),
      ]),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles`,
      lastModified: await getRouteLastModified(appDir, "/tech/articles", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tech/case-studies/claude-code-automation`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/case-studies/claude-code-automation",
        fallbackLastModified,
        [path.join(cmsDir, "case-studies.ts")]
      ),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Tech articles
    {
      url: `${baseUrl}/tech/articles/claude-code-setup`,
      lastModified: await getRouteLastModified(appDir, "/tech/articles/claude-code-setup", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles/bitcoin-as-strong-money`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/bitcoin-as-strong-money",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tech/articles/n8n-workflow-automation`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/n8n-workflow-automation",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles/chatgpt-api-integration`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/chatgpt-api-integration",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tech/articles/answer-engine-optimization-aeo`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/answer-engine-optimization-aeo",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/generative-ai-score-websites`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/generative-ai-score-websites",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/seo-is-dead`,
      lastModified: await getRouteLastModified(appDir, "/tech/articles/seo-is-dead", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/generative-engine-optimization-geo`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/generative-engine-optimization-geo",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tech/articles/openclaw-installation-playbook`,
      lastModified: await getRouteLastModified(
        appDir,
        "/tech/articles/openclaw-installation-playbook",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Somatic cluster
    {
      url: `${baseUrl}/somatic`,
      lastModified: await getRouteLastModified(appDir, "/somatic", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/somatic/approach`,
      lastModified: await getRouteLastModified(appDir, "/somatic/approach", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/somatic/modalities`,
      lastModified: await getRouteLastModified(appDir, "/somatic/modalities", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/somatic/training`,
      lastModified: await getRouteLastModified(appDir, "/somatic/training", fallbackLastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Performance bridge
    {
      url: `${baseUrl}/performance`,
      lastModified: await getRouteLastModified(appDir, "/performance", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Tantra & SEO pages
    {
      url: `${baseUrl}/tantra-massage-ubud`,
      lastModified: await getRouteLastModified(appDir, "/tantra-massage-ubud", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/spirituality/articles/tantra-trauma-ptsd`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/articles/tantra-trauma-ptsd",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/articles`,
      lastModified: await getRouteLastModified(appDir, "/spirituality/articles", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/spirituality/blog`,
      lastModified: await getRouteLastModified(appDir, "/spirituality/blog", fallbackLastModified),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/spirituality/blog/what-to-expect-first-tantra-session`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/blog/what-to-expect-first-tantra-session",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/what-is-kyo-tai`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/blog/what-is-kyo-tai",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/kyo-tai-session-what-happens`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/blog/kyo-tai-session-what-happens",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/questions-to-ask-tantra-practitioner`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/blog/questions-to-ask-tantra-practitioner",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/tantra-vs-regular-massage`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/blog/tantra-vs-regular-massage",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/spirituality/blog/temple-space-preparation`,
      lastModified: await getRouteLastModified(
        appDir,
        "/spirituality/blog/temple-space-preparation",
        fallbackLastModified
      ),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Dynamic: Projects
  const projects = await getProjects();
  const projectRouteLastModified = getLatestDate(
    [
      await getFileLastModified(path.join(appDir, "tech", "[slug]", "page.tsx")),
      await getFileLastModified(path.join(cmsDir, "projects.ts")),
    ],
    fallbackLastModified
  );

  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/tech/${project.slug}`,
    lastModified: projectRouteLastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic: Case Studies (individual pages)
  const caseStudies = getCaseStudies();
  const caseStudyRouteLastModified = getLatestDate(
    [
      await getFileLastModified(path.join(appDir, "tech", "case-studies", "[id]", "page.tsx")),
      await getFileLastModified(path.join(cmsDir, "case-studies.ts")),
    ],
    fallbackLastModified
  );

  const caseStudyPages: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `${baseUrl}/tech/case-studies/${cs.id}`,
    lastModified: caseStudyRouteLastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogArticlePages: MetadataRoute.Sitemap = canonicalBlogArticles.map((article) => ({
    url: `${baseUrl}${article.link}`,
    lastModified: getValidDate(article.publishedAt) ?? latestArticleDate,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogTagPages: MetadataRoute.Sitemap = Array.from(tagPagesBySlug.entries())
    .filter(([, entry]) => shouldIndexBlogTagPage(entry.count))
    .map(([tagSlug, entry]) => ({
      url: `${baseUrl}/blog/tag/${tagSlug}`,
      lastModified: entry.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  const normalizeUrl = (url: string) =>
    url.endsWith("/") && url !== baseUrl ? url.slice(0, -1) : url;

  const seen = new Set<string>();
  const allPages = [...staticPages, ...blogArticlePages, ...blogTagPages, ...projectPages, ...caseStudyPages];

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
