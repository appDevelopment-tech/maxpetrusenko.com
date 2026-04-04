import { SocialPlatform, SocialPost } from "./types";

const ZERNIO_API = "https://zernio.com/api/v1";

function isPublishedStatus(status: string | undefined): boolean {
  return status === "published";
}

function isFailedStatus(status: string | undefined): boolean {
  return ["failed", "error", "cancelled"].includes((status ?? "").toLowerCase());
}

function platformPriority(platform: SocialPlatform): number {
  if (isPublishedStatus(platform.status)) return 3;
  if (isFailedStatus(platform.status)) return 1;
  return 2;
}

export function mergePlatforms(platforms: SocialPlatform[]): SocialPlatform[] {
  const merged = new Map<string, SocialPlatform>();

  for (const platform of platforms) {
    const existing = merged.get(platform.platform);
    if (!existing) {
      merged.set(platform.platform, platform);
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

    merged.set(platform.platform, next);
  }

  return [...merged.values()];
}

export async function fetchPosts(apiKey: string, limit = 50): Promise<SocialPost[]> {
  const response = await fetch(`${ZERNIO_API}/posts?limit=${limit}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as Record<string, unknown>;
  return (Array.isArray(data) ? data : (data.data ?? data.posts ?? [])) as SocialPost[];
}

export async function fetchMergedPosts(apiKeys: string[], limit = 50) {
  const groups = await Promise.all(apiKeys.map((apiKey) => fetchPosts(apiKey, limit)));
  const mergedInput = groups.flat();
  const merged: SocialPost[] = [];
  const seen = new Set<string>();

  for (const post of mergedInput) {
    const dedupKey = post.content?.slice(0, 80)?.toLowerCase().trim() ?? post._id;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      merged.push(post);
      continue;
    }

    const existing = merged.find(
      (candidate) => (candidate.content?.slice(0, 80)?.toLowerCase().trim() ?? candidate._id) === dedupKey,
    );

    if (existing) {
      existing.platforms = mergePlatforms([...existing.platforms, ...post.platforms]);
    }
  }

  merged.sort((a, b) => {
    const left = new Date(a.publishedAt ?? a.createdAt).getTime();
    const right = new Date(b.publishedAt ?? b.createdAt).getTime();
    return right - left;
  });

  const posts = merged.map((post) => ({
    id: post._id,
    content: post.content,
    publishedAt: post.publishedAt ?? post.createdAt,
    status: post.status,
    media: (post.mediaItems ?? []).map((item) => ({ url: item.url, type: item.type })),
    platforms: mergePlatforms(post.platforms).map((platform) => ({
      platform: platform.platform,
      status: platform.status,
      url: platform.platformPostUrl ?? platform.publishedUrl ?? null,
      error: platform.error ?? null,
    })),
  }));

  const dailyCounts: Record<string, number> = {};
  const platformCounts: Record<string, { published: number; failed: number; pending: number }> = {};

  for (const post of posts) {
    const day = post.publishedAt.slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;

    for (const platform of post.platforms) {
      if (!platformCounts[platform.platform]) {
        platformCounts[platform.platform] = { published: 0, failed: 0, pending: 0 };
      }

      if (isPublishedStatus(platform.status)) platformCounts[platform.platform].published++;
      else if (isFailedStatus(platform.status)) platformCounts[platform.platform].failed++;
      else platformCounts[platform.platform].pending++;
    }
  }

  return {
    posts,
    count: posts.length,
    fetchedAt: new Date().toISOString(),
    dailyCounts,
    platformCounts,
  };
}

export async function postToZernio(
  apiKey: string,
  content: string,
  platforms: Array<{ platform: string; accountId: string }>,
  mediaUrl?: string,
  mediaType?: "image" | "video",
): Promise<Array<{ platform: string; status: string; url?: string; error?: string }>> {
  const body: Record<string, unknown> = { content, platforms };

  if (mediaUrl) body.mediaItems = [{ url: mediaUrl, type: mediaType ?? "image" }];

  try {
    const response = await fetch(`${ZERNIO_API}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return platforms.map((platform) => ({
        platform: platform.platform,
        status: "failed",
        error: `HTTP ${response.status}: ${error.slice(0, 200)}`,
      }));
    }

    const data = (await response.json()) as {
      platforms?: Array<{ platform: string; status: string; publishedUrl?: string; error?: string }>;
    };

    return (data.platforms ?? []).map((platform) => ({
      platform: platform.platform,
      status: platform.status,
      url: platform.publishedUrl,
      error: platform.error,
    }));
  } catch (error) {
    return platforms.map((platform) => ({
      platform: platform.platform,
      status: "failed",
      error: String(error),
    }));
  }
}
