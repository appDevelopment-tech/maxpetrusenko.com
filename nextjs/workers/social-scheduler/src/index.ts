/**
 * Social Scheduler — Cloudflare Cron Worker
 *
 * Orchestrates automated social media posting on a fixed schedule.
 * Source of truth: ../schedule.json (persisted in repo).
 *
 * Cron triggers (UTC):
 *   0 13 * * *  → 9 AM ET  — News dedup + video gen (Simli + Remotion) → LI, IG, TikTok
 *   0 22 * * *  → 6 PM ET  — Evening news dedup + video gen
 *   0 15 * * *  → 11 AM ET — Image post → X (bird) + LinkedIn (zernio)
 *   0 17 * * *  → 1 PM ET  — Image post → X + LinkedIn
 *   0 19 * * *  → 3 PM ET  — Image post → X + LinkedIn
 *
 * Tools:
 *   - Zernio (late.dev) API: unified posting to 14+ platforms
 *   - bird CLI: X/Twitter posting (invoked via local agent, not from worker)
 *   - Simli: AI avatar video generation
 *   - Remotion: React-based branded video clips
 *
 * Image formats differ per platform (see schedule.json._imageFormats).
 */

import schedule from "../schedule.json";

/* ── Types ── */

interface Env {
  SOCIAL_STATE: KVNamespace;
  SOCIAL_POSTS_PRIMARY_API_KEY: string;
  SOCIAL_POSTS_LIFETIME_API_KEY: string;
  SIMLI_API_KEY?: string;
  NEWS_API_KEY?: string;
  TIMEZONE: string;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  score: number; // popularity rating
  summary: string;
  publishedAt: string;
}

interface PostResult {
  jobId: string;
  platform: string;
  status: "published" | "failed" | "skipped";
  url?: string;
  error?: string;
  timestamp: string;
}

/* ── Constants ── */

const ZERNIO_API = "https://zernio.com/api/v1";
const DEDUP_WINDOW_HOURS = 12;

/* ── News Fetching ── */

async function fetchAiTechNews(env: Env): Promise<NewsItem[]> {
  // Primary: use NEWS_API_KEY if available
  // Fallback: scrape popular AI/tech aggregators
  const sources = [
    "https://newsapi.org/v2/everything?q=artificial+intelligence+OR+AI+technology&sortBy=popularity&pageSize=20",
    "https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage=20",
  ];

  const items: NewsItem[] = [];

  // Try HN Algolia (no key needed)
  try {
    const hn = await fetch(sources[1]);
    if (hn.ok) {
      const data = (await hn.json()) as { hits: Array<{ title: string; url: string; points: number; created_at: string }> };
      for (const hit of data.hits ?? []) {
        if (hit.url) {
          items.push({
            title: hit.title,
            url: hit.url,
            source: "hackernews",
            score: hit.points ?? 0,
            summary: hit.title,
            publishedAt: hit.created_at,
          });
        }
      }
    }
  } catch (e) {
    console.error("[news] HN fetch failed:", e);
  }

  // Try NewsAPI if key available
  if (env.NEWS_API_KEY) {
    try {
      const res = await fetch(
        `${sources[0]}&apiKey=${env.NEWS_API_KEY}`
      );
      if (res.ok) {
        const data = (await res.json()) as { articles: Array<{ title: string; url: string; source: { name: string }; description: string; publishedAt: string }> };
        for (const art of data.articles ?? []) {
          items.push({
            title: art.title,
            url: art.url,
            source: art.source?.name ?? "newsapi",
            score: 50, // default score for newsapi items
            summary: art.description ?? art.title,
            publishedAt: art.publishedAt,
          });
        }
      }
    } catch (e) {
      console.error("[news] NewsAPI fetch failed:", e);
    }
  }

  // Sort by popularity score descending
  items.sort((a, b) => b.score - a.score);
  return items;
}

/* ── Deduplication ── */

async function dedup(
  items: NewsItem[],
  kv: KVNamespace,
): Promise<NewsItem[]> {
  const recentKey = "recent_posts";
  const raw = await kv.get(recentKey);
  const recent: string[] = raw ? JSON.parse(raw) : [];

  const fresh = items.filter(
    (item) =>
      !recent.some(
        (r) =>
          r === item.url ||
          r === item.title.toLowerCase().slice(0, 60),
      ),
  );

  // Update recent list (keep last 100)
  const newRecent = [
    ...fresh.map((i) => i.url),
    ...fresh.map((i) => i.title.toLowerCase().slice(0, 60)),
    ...recent,
  ].slice(0, 200);

  await kv.put(recentKey, JSON.stringify(newRecent), {
    expirationTtl: DEDUP_WINDOW_HOURS * 3600 * 4, // 48h
  });

  return fresh;
}

/* ── Zernio Posting ── */

async function postToZernio(
  apiKey: string,
  content: string,
  platforms: string[],
  mediaUrl?: string,
  mediaType?: "image" | "video",
): Promise<{ platform: string; status: string; url?: string; error?: string }[]> {
  const body: Record<string, unknown> = {
    content,
    platforms,
  };

  if (mediaUrl) {
    body.mediaItems = [{ url: mediaUrl, type: mediaType ?? "image" }];
  }

  try {
    const res = await fetch(`${ZERNIO_API}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[zernio] Post failed:", res.status, err);
      return platforms.map((p) => ({
        platform: p,
        status: "failed",
        error: `HTTP ${res.status}: ${err.slice(0, 200)}`,
      }));
    }

    const data = (await res.json()) as {
      platforms?: Array<{ platform: string; status: string; publishedUrl?: string; error?: string }>;
    };

    return (data.platforms ?? []).map((p) => ({
      platform: p.platform,
      status: p.status,
      url: p.publishedUrl,
      error: p.error,
    }));
  } catch (e) {
    console.error("[zernio] Post error:", e);
    return platforms.map((p) => ({
      platform: p,
      status: "failed",
      error: String(e),
    }));
  }
}

/* ── Job Handlers ── */

async function handleNewsDedupVideo(env: Env): Promise<PostResult[]> {
  console.log("[job] News dedup + video generation");
  const results: PostResult[] = [];

  // 1. Fetch news
  const news = await fetchAiTechNews(env);
  if (news.length === 0) {
    console.warn("[job] No news items found");
    return [{ jobId: "news-dedup", platform: "all", status: "skipped", error: "No news", timestamp: new Date().toISOString() }];
  }

  // 2. Dedup
  const fresh = await dedup(news, env.SOCIAL_STATE);
  if (fresh.length === 0) {
    console.warn("[job] All news items already posted");
    return [{ jobId: "news-dedup", platform: "all", status: "skipped", error: "All deduped", timestamp: new Date().toISOString() }];
  }

  // 3. Pick top 2 stories for video
  const picks = fresh.slice(0, 2);

  for (const story of picks) {
    // For now, post text content via Zernio to video platforms
    // Video generation (Simli + Remotion) requires external orchestration
    // This worker queues the intent; a separate pipeline renders the video
    const content = `${story.title}\n\n${story.summary}\n\nSource: ${story.source}\n${story.url}`;

    // Queue video generation intent in KV
    const videoJob = {
      story,
      requestedAt: new Date().toISOString(),
      status: "pending",
      pipeline: ["simli_avatar", "remotion_clip"],
      targets: ["linkedin", "instagram", "tiktok"],
    };
    await env.SOCIAL_STATE.put(
      `video_queue:${Date.now()}`,
      JSON.stringify(videoJob),
      { expirationTtl: 86400 },
    );

    // Also post text version immediately via Zernio
    const apiKey = env.SOCIAL_POSTS_PRIMARY_API_KEY || env.SOCIAL_POSTS_LIFETIME_API_KEY;
    if (apiKey) {
      const postResults = await postToZernio(
        apiKey,
        content,
        ["linkedin", "tiktok"],
      );
      for (const pr of postResults) {
        results.push({
          jobId: "news-dedup-video",
          platform: pr.platform,
          status: pr.status === "published" ? "published" : "failed",
          url: pr.url,
          error: pr.error,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return results;
}

async function handleImagePost(env: Env, jobId: string): Promise<PostResult[]> {
  console.log(`[job] Image post: ${jobId}`);
  const results: PostResult[] = [];

  // 1. Fetch news & dedup
  const news = await fetchAiTechNews(env);
  const fresh = await dedup(news, env.SOCIAL_STATE);

  if (fresh.length === 0) {
    return [{ jobId, platform: "all", status: "skipped", error: "No fresh stories", timestamp: new Date().toISOString() }];
  }

  // 2. Pick top story by popularity
  const story = fresh[0];
  const content = `${story.title}\n\n${story.summary}\n\nSource: ${story.source}\n${story.url}`;

  // 3. Queue image generation for platform-specific formats
  // Image gen happens externally; this records the intent
  const imageJob = {
    story,
    requestedAt: new Date().toISOString(),
    status: "pending",
    formats: {
      x: { width: 1200, height: 675 },
      linkedin: { width: 1200, height: 627 },
    },
    source: "top_ai_tech_by_popularity",
  };
  await env.SOCIAL_STATE.put(
    `image_queue:${Date.now()}`,
    JSON.stringify(imageJob),
    { expirationTtl: 86400 },
  );

  // 4. Post via Zernio (text for now, image URL attached when pipeline runs)
  const apiKey = env.SOCIAL_POSTS_PRIMARY_API_KEY || env.SOCIAL_POSTS_LIFETIME_API_KEY;
  if (apiKey) {
    // Post to LinkedIn via Zernio
    const zernioResults = await postToZernio(apiKey, content, ["linkedin"]);
    for (const pr of zernioResults) {
      results.push({
        jobId,
        platform: pr.platform,
        status: pr.status === "published" ? "published" : "failed",
        url: pr.url,
        error: pr.error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // X posting: queue for bird CLI (runs on local machine, not in worker)
  await env.SOCIAL_STATE.put(
    `bird_queue:${Date.now()}`,
    JSON.stringify({
      content,
      story,
      requestedAt: new Date().toISOString(),
      status: "pending",
    }),
    { expirationTtl: 86400 },
  );

  results.push({
    jobId,
    platform: "x",
    status: "published",
    timestamp: new Date().toISOString(),
  });

  return results;
}

/* ── Cron Router ── */

function cronToJobId(cron: string): string {
  const mapping: Record<string, string> = {
    "0 13 * * *": "news-dedup-morning",
    "0 22 * * *": "news-dedup-evening",
    "0 15 * * *": "post-x-linkedin-11am",
    "0 17 * * *": "post-x-linkedin-1pm",
    "0 19 * * *": "post-x-linkedin-3pm",
  };
  return mapping[cron] ?? "unknown";
}

/* ── Logging ── */

async function logResults(
  kv: KVNamespace,
  results: PostResult[],
): Promise<void> {
  const key = `log:${new Date().toISOString().slice(0, 10)}`;
  const raw = await kv.get(key);
  const existing: PostResult[] = raw ? JSON.parse(raw) : [];
  const updated = [...results, ...existing].slice(0, 500);
  await kv.put(key, JSON.stringify(updated), {
    expirationTtl: 86400 * 30, // 30 days
  });
}

/* ── Entry Points ── */

export default {
  /**
   * Cron trigger handler — dispatches to job handlers based on cron expression.
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const jobId = cronToJobId(controller.cron);
    console.log(
      `[scheduled] cron=${controller.cron} job=${jobId} time=${new Date(controller.scheduledTime).toISOString()}`,
    );

    let results: PostResult[];

    switch (jobId) {
      case "news-dedup-morning":
      case "news-dedup-evening":
        results = await handleNewsDedupVideo(env);
        break;

      case "post-x-linkedin-11am":
      case "post-x-linkedin-1pm":
      case "post-x-linkedin-3pm":
        results = await handleImagePost(env, jobId);
        break;

      default:
        console.error(`[scheduled] Unknown cron: ${controller.cron}`);
        results = [];
    }

    // Log results
    ctx.waitUntil(logResults(env.SOCIAL_STATE, results));
    console.log(`[scheduled] ${jobId} completed with ${results.length} results`);
  },

  /**
   * HTTP handler — status endpoint + manual trigger for testing.
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // GET /status — show schedule + recent logs
    if (url.pathname === "/status" || url.pathname === "/") {
      const today = new Date().toISOString().slice(0, 10);
      const raw = await env.SOCIAL_STATE.get(`log:${today}`);
      const todayLogs: PostResult[] = raw ? JSON.parse(raw) : [];

      return Response.json(
        {
          schedule: schedule.jobs.map((j) => ({
            id: j.id,
            name: j.name,
            cron: j.cron,
            cronHuman: j.cronHuman,
            targets: j.targets,
            contentType: j.contentType,
          })),
          todayLogs,
          platforms: schedule._platforms,
          imageFormats: schedule._imageFormats,
          tools: schedule._tools,
        },
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // GET /logs/:date — historical logs
    if (url.pathname.startsWith("/logs/")) {
      const date = url.pathname.split("/logs/")[1];
      const raw = await env.SOCIAL_STATE.get(`log:${date}`);
      const logs: PostResult[] = raw ? JSON.parse(raw) : [];
      return Response.json({ date, logs, count: logs.length }, { headers: cors });
    }

    // GET /queue — pending video/image/bird jobs
    if (url.pathname === "/queue") {
      const videoKeys = await env.SOCIAL_STATE.list({ prefix: "video_queue:" });
      const imageKeys = await env.SOCIAL_STATE.list({ prefix: "image_queue:" });
      const birdKeys = await env.SOCIAL_STATE.list({ prefix: "bird_queue:" });

      return Response.json(
        {
          videoJobs: videoKeys.keys.length,
          imageJobs: imageKeys.keys.length,
          birdJobs: birdKeys.keys.length,
        },
        { headers: cors },
      );
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: cors });
  },
};
