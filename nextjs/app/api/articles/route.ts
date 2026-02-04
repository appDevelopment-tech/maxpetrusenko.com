import { NextResponse } from "next/server";
import { fetchFeaturedArticles } from "@/lib/cms/articles";
import type { ArticlesResponse } from "@/types";

// Edge runtime for Cloudflare compatibility
export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * GET /api/articles
 *
 * Fetches featured articles (local-first, then Medium archive).
 * Returns top 3 entries with caching.
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

      const articles = await fetchFeaturedArticles();

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
    const articles = await fetchFeaturedArticles();

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
