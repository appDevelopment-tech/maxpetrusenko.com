import type { Article } from "@/types";
import { slugify } from "@/lib/seo/metadata";

/**
 * Parse Medium RSS feed and extract articles
 */
export async function parseMediumRSS(
  rssUrl: string,
  preferredIds: string[] = [],
  count = 3
): Promise<Article[]> {
  try {
    const response = await fetch(rssUrl, {
      headers: { Accept: "application/rss+xml" },
      next: { revalidate: 1800 }, // 30 minutes
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const items = parseItems(xml);

    // If no preferred IDs specified, return first N items
    if (preferredIds.length === 0) {
      return items.slice(0, count);
    }

    return selectTop(items, preferredIds, count);
  } catch (error) {
    console.error("Error parsing Medium RSS:", error);
    return [];
  }
}

/**
 * Parse items from RSS XML
 */
function parseItems(xml: string): Article[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const contentRegex = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const categoryRegex = /<category>(.*?)<\/category>/g;

  const items: Article[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = titleRegex.exec(block);
    const linkMatch = linkRegex.exec(block);
    const contentMatch = contentRegex.exec(block);
    const pubDateMatch = pubDateRegex.exec(block);

    // Extract categories (tags)
    const tags: string[] = [];
    let categoryMatch: RegExpExecArray | null;
    while ((categoryMatch = categoryRegex.exec(block)) !== null) {
      if (categoryMatch[1]) {
        tags.push(categoryMatch[1]);
      }
    }

    const title = titleMatch?.[1] || "";
    const link = linkMatch?.[1] || "";
    const content = contentMatch?.[1] || "";
    const pubDate = pubDateMatch?.[1] || "";

    const id = extractId(link);
    const image = extractImage(content);
    const excerpt = extractExcerpt(content);

    // Create slug from ID or title fallback
    const slug = id || slugify(title);

    items.push({
      id,
      slug,
      title,
      excerpt,
      content,
      image,
      link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      tags,
      author: {
        name: "Max Petrusenko",
      },
    });
  }

  return items;
}

/**
 * Extract article ID from Medium URL
 */
function extractId(link: string): string {
  const pMatch = /\/p\/([a-f0-9]{6,})(?:[/?#]|$)/i.exec(link);
  if (pMatch) return pMatch[1];

  const slugMatch = /-([a-f0-9]{6,})(?:[/?#]|$)/i.exec(link);
  if (slugMatch) return slugMatch[1];

  return "";
}

/**
 * Extract first image from HTML content
 */
function extractImage(html: string): string {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match ? match[1] : "";
}

/**
 * Extract plain text excerpt from HTML content
 */
function extractExcerpt(html: string, maxLength = 160): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, " ").trim();
  // Truncate to max length
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Select top articles preferring the specified IDs
 */
function selectTop(items: Article[], preferredIds: string[], count: number): Article[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const selected: Article[] = [];

  // First, add preferred items
  for (const id of preferredIds) {
    if (byId.has(id)) {
      selected.push(byId.get(id)!);
    }
  }

  // Fill remaining slots with other items
  if (selected.length < count) {
    for (const item of items) {
      if (selected.length >= count) break;
      if (!selected.find((s) => s.id === item.id)) {
        selected.push(item);
      }
    }
  }

  return selected.slice(0, count);
}
