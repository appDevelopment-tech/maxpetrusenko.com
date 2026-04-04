import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface LatePlatform {
  platform: string;
  status: string;
  publishedUrl?: string;
  platformPostUrl?: string;
  error?: string;
  accountId?: string | { _id?: string; platform?: string; displayName?: string; username?: string; profilePicture?: string };
}

interface LatePost {
  _id: string;
  content: string;
  platforms: LatePlatform[];
  mediaItems?: { url: string; type: string }[];
  publishedAt?: string;
  createdAt: string;
  status: string;
}

const LATE_API = "https://zernio.com/api/v1/posts";

function getSocialAgentBaseUrl(): string | null {
  const env = getCloudflareEnv();
  const value = env?.SOCIAL_AGENT_BASE_URL ?? process.env.SOCIAL_AGENT_BASE_URL;
  return value?.trim() ? value.trim().replace(/\/$/, "") : null;
}

function isPublishedStatus(status: string | undefined): boolean {
  return status === "published";
}

function isFailedStatus(status: string | undefined): boolean {
  return ["failed", "error", "cancelled"].includes((status ?? "").toLowerCase());
}

function platformPriority(platform: LatePlatform): number {
  if (isPublishedStatus(platform.status)) return 3;
  if (isFailedStatus(platform.status)) return 1;
  return 2;
}

function mergePlatforms(platforms: LatePlatform[]): LatePlatform[] {
  const merged = new Map<string, LatePlatform>();

  for (const platform of platforms) {
    const key = platform.platform;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, platform);
      continue;
    }

    const next =
      platformPriority(platform) > platformPriority(existing)
        ? { ...existing, ...platform }
        : {
            ...platform,
            ...existing,
            platformPostUrl: existing.platformPostUrl ?? platform.platformPostUrl,
            publishedUrl: existing.publishedUrl ?? platform.publishedUrl,
            error: existing.error ?? platform.error,
            status:
              platformPriority(existing) >= platformPriority(platform)
                ? existing.status
                : platform.status,
          };

    merged.set(key, next);
  }

  return [...merged.values()];
}

function getCloudflareEnv(): CloudflareEnv | null {
  try {
    return getRequestContext().env as CloudflareEnv;
  } catch {
    return null;
  }
}

function getSocialApiKeys(): string[] {
  const env = getCloudflareEnv();
  const candidates = [
    env?.SOCIAL_POSTS_PRIMARY_API_KEY,
    env?.SOCIAL_POSTS_LIFETIME_API_KEY,
    env?.GETLATE_DEV_API_KEY_FREE,
    process.env.SOCIAL_POSTS_PRIMARY_API_KEY,
    process.env.SOCIAL_POSTS_LIFETIME_API_KEY,
    process.env.GETLATE_DEV_API_KEY_FREE,
  ];

  return [...new Set(candidates.filter((value): value is string => Boolean(value?.trim())))];
}

async function fetchPosts(apiKey: string, limit = 30): Promise<LatePost[]> {
  const res = await fetch(`${LATE_API}?limit=${limit}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json() as Record<string, unknown>;
  return (Array.isArray(data) ? data : (data.data ?? data.posts ?? [])) as LatePost[];
}

async function fetchPostsFromSocialAgent(baseUrl: string) {
  const response = await fetch(`${baseUrl}/posts?limit=50`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Social agent returned HTTP ${response.status}`);
  }

  return response.json();
}
/**
 * GET /api/social-posts
 *
 * Proxies late.dev (zernio) post data server-side so API keys
 * never reach the browser. Merges posts from both API keys,
 * deduplicates by content hash, and returns newest-first.
 */
export async function GET() {
  try {
    const socialAgentBaseUrl = getSocialAgentBaseUrl();
    if (socialAgentBaseUrl) {
      try {
        const payload = await fetchPostsFromSocialAgent(socialAgentBaseUrl);
        return NextResponse.json(payload, {
          status: 200,
          headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
        });
      } catch (error) {
        console.error("[social-posts social-agent fallback]", error);
      }
    }

    const apiKeys = getSocialApiKeys();
    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: "Social posts API keys are not configured" },
        { status: 503 }
      );
    }

    const postGroups = await Promise.all(apiKeys.map((apiKey) => fetchPosts(apiKey, 50)));
    const mergedInput = postGroups.flat();

    // Merge and deduplicate by content similarity
    const seen = new Set<string>();
    const merged: LatePost[] = [];

    for (const post of mergedInput) {
      const key = post.content?.slice(0, 80)?.toLowerCase().trim() ?? post._id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(post);
      } else {
        // Merge platform results from duplicate into existing
        const existing = merged.find(
          (p) => (p.content?.slice(0, 80)?.toLowerCase().trim() ?? p._id) === key
        );
        if (existing) {
          existing.platforms = mergePlatforms([...existing.platforms, ...post.platforms]);
        }
      }
    }
    // Sort newest first
    merged.sort((a, b) => {
      const da = new Date(a.publishedAt ?? a.createdAt).getTime();
      const db = new Date(b.publishedAt ?? b.createdAt).getTime();
      return db - da;
    });

    // Normalize platform data for the frontend
    const posts = merged.map((post) => ({
      id: post._id,
      content: post.content,
      publishedAt: post.publishedAt ?? post.createdAt,
      status: post.status,
      media: (post.mediaItems ?? []).map((m) => ({ url: m.url, type: m.type })),
      platforms: mergePlatforms(post.platforms).map((p) => ({
        platform: p.platform,
        status: p.status,
        url: p.platformPostUrl ?? p.publishedUrl ?? null,
        error: p.error ?? null,
      })),
    }));

    // Compute daily post counts for charting
    const dailyCounts: Record<string, number> = {};
    const platformCounts: Record<string, { published: number; failed: number; pending: number }> = {};
    for (const post of posts) {
      const day = post.publishedAt.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
      for (const p of post.platforms) {
        if (!platformCounts[p.platform]) {
          platformCounts[p.platform] = { published: 0, failed: 0, pending: 0 };
        }
        if (isPublishedStatus(p.status)) platformCounts[p.platform].published++;
        else if (isFailedStatus(p.status)) platformCounts[p.platform].failed++;
        else platformCounts[p.platform].pending++;
      }
    }

    return NextResponse.json(
      {
        posts,
        count: posts.length,
        fetchedAt: new Date().toISOString(),
        dailyCounts,
        platformCounts,
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (error) {
    console.error("[social-posts API error]", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
