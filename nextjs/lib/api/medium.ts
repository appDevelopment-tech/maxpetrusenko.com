import type { Article } from "@/types";
import { slugify } from "@/lib/seo/metadata";

const ALLOWED_MEDIUM_IMAGE_HOSTS = new Set([
  "miro.medium.com",
  "cdn-images-1.medium.com",
  "images.unsplash.com",
  "i.imgur.com",
  "pbs.twimg.com",
]);

/**
 * Parse Medium RSS feed and extract articles
 */
export async function parseMediumRSS(
  rssUrl: string,
  preferredIds: string[] = [],
  count = 3
): Promise<Article[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(rssUrl, {
      headers: { Accept: "application/rss+xml" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    // Silently fail - edge runtime may not support external fetch
    return [];
  }
}

/**
 * Parse items from RSS XML
 */
function parseItems(xml: string): Article[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i;
  const linkRegex = /<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i;
  const contentRegex = /<content:encoded(?:\s[^>]*)?>([\s\S]*?)<\/content:encoded>/i;
  const descriptionRegex = /<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i;
  const pubDateRegex = /<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/i;
  const categoryRegex = /<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi;

  const items: Article[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = titleRegex.exec(block);
    const linkMatch = linkRegex.exec(block);
    const contentMatch = contentRegex.exec(block);
    const descriptionMatch = descriptionRegex.exec(block);
    const pubDateMatch = pubDateRegex.exec(block);

    // Extract categories (tags)
    const tags: string[] = [];
    categoryRegex.lastIndex = 0;
    let categoryMatch: RegExpExecArray | null;
    while ((categoryMatch = categoryRegex.exec(block)) !== null) {
      const parsedTag = decodeHtmlEntities(stripCdata(categoryMatch[1] || "").trim());
      if (parsedTag) {
        tags.push(parsedTag);
      }
    }

    const title = decodeHtmlEntities(stripCdata(titleMatch?.[1] || "").trim());
    const link = decodeHtmlEntities(stripCdata(linkMatch?.[1] || "").trim());
    const encodedContent = stripCdata(contentMatch?.[1] || "").trim();
    const descriptionContent = stripCdata(descriptionMatch?.[1] || "").trim();
    const normalizedDescription = decodeHtmlEntities(descriptionContent);
    const content = encodedContent || normalizedDescription;
    const pubDate = decodeHtmlEntities(stripCdata(pubDateMatch?.[1] || "").trim());

    const id = extractId(link);
    const image = extractImage(content) || extractImage(normalizedDescription);
    const excerpt = extractExcerpt(content || normalizedDescription);

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

function stripCdata(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<![CDATA[") && trimmed.endsWith("]]>")) {
    return trimmed.slice(9, -3);
  }
  return trimmed;
}

/**
 * Remove unsafe HTML blocks/attributes before rendering article content.
 */
export function sanitizeMediumHtml(html: string): string {
  if (!html) return "";

  let safe = html;

  // Strip active content and interactive form elements.
  safe = safe.replace(/<script[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/<style[\s\S]*?<\/style>/gi, "");
  safe = safe.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  safe = safe.replace(/<object[\s\S]*?<\/object>/gi, "");
  safe = safe.replace(/<embed[\s\S]*?<\/embed>/gi, "");
  safe = safe.replace(/<form[\s\S]*?<\/form>/gi, "");
  safe = safe.replace(/<input[^>]*>/gi, "");
  safe = safe.replace(/<button[\s\S]*?<\/button>/gi, "");
  safe = safe.replace(/<textarea[\s\S]*?<\/textarea>/gi, "");
  safe = safe.replace(/<select[\s\S]*?<\/select>/gi, "");

  // Remove inline event handlers and javascript URLs.
  safe = safe.replace(/\son\w+=(["']).*?\1/gi, "");
  safe = safe.replace(/\son\w+=([^\s>]+)/gi, "");
  safe = safe.replace(/\shref=(["'])\s*javascript:[^"']*\1/gi, " href=\"#\"");

  // Normalize anchor tags for safe external navigation.
  safe = safe.replace(/<a\s+([^>]*?)>/gi, (_match, attrs: string) => {
    const normalizedAttrs = attrs.replace(/\s(target|rel)=(".*?"|'.*?'|[^\s>]+)/gi, "").trim();
    const prefix = normalizedAttrs ? ` ${normalizedAttrs}` : "";
    return `<a${prefix} target="_blank" rel="noopener noreferrer nofollow">`;
  });

  return safe.trim();
}

/**
 * Convert HTML to plain text for text metrics and snippets.
 */
export function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Rough reading time estimate based on 220 wpm.
 */
export function estimateReadTimeMinutes(html: string): number {
  const wordCount = htmlToText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 220));
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
  if (!match?.[1]) return "";
  return isSafeArticleImage(match[1]) ? match[1] : "";
}

function isSafeArticleImage(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_MEDIUM_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Extract plain text excerpt from HTML content
 */
function extractExcerpt(html: string, maxLength = 160): string {
  const text = htmlToText(html);
  // Truncate to max length
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Decode common HTML entities for cleaner snippets.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, dec) => {
      const code = Number(dec);
      if (Number.isNaN(code)) return "";
      return String.fromCharCode(code);
    });
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
