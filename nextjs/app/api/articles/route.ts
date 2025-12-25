import { NextResponse } from "next/server";
import { parseMediumRSS } from "@/lib/api/medium";
import { MEDIUM_RSS_URL, FEATURED_ARTICLE_IDS } from "@/config/site";
import type { ArticlesResponse } from "@/types";

// Edge runtime for Cloudflare compatibility
export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * GET /api/articles
 *
 * Fetches articles from Medium RSS feed.
 * Returns top 3 articles with caching.
 */
export async function GET() {
  try {
    // Try to use edge cache (in Cloudflare Workers environment)
    const cache = (globalThis as any).caches?.default;
    if (cache) {
      const cacheKey = new Request("https://maxpetrusenko.com/api/articles");
      const cached = await cache.match(cacheKey);

      if (cached) {
        return new NextResponse(cached.body, {
          headers: cached.headers,
        });
      }

      // Fetch and parse articles
      const articles = await parseMediumRSS(
        MEDIUM_RSS_URL,
        FEATURED_ARTICLE_IDS,
        3
      );

      const response = NextResponse.json(
        { articles } as ArticlesResponse,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        }
      );

      // Cache in edge
      await cache.put(cacheKey, response.clone());

      return response;
    }

    // Fallback without cache
    const articles = await parseMediumRSS(
      MEDIUM_RSS_URL,
      FEATURED_ARTICLE_IDS,
      3
    );

    return NextResponse.json(
      { articles } as ArticlesResponse,
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (error) {
    console.error("[Articles API error]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        articles: [],
      } as ArticlesResponse,
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
