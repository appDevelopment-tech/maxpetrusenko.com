import { MEDIUM_RSS_URL, FEATURED_ARTICLE_IDS } from "@/config/site";
import { parseMediumRSS } from "@/lib/api/medium";
import type { Article } from "@/types";

/**
 * Fetch all articles from Medium RSS
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    return await parseMediumRSS(MEDIUM_RSS_URL, [], 50);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

/**
 * Fetch featured articles (preferred IDs)
 */
export async function fetchFeaturedArticles(): Promise<Article[]> {
  try {
    return await parseMediumRSS(MEDIUM_RSS_URL, FEATURED_ARTICLE_IDS, 3);
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    return [];
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
    return articles.filter((a) =>
      a.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
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
