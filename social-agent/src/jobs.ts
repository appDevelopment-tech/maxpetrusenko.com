import { SocialAgentDb } from "./db";
import { fetchAiTechNews } from "./news";
import { Config, NewsItem, PostResult, QueuePayload } from "./types";
import { postToZernio } from "./zernio";

function buildStoryContent(story: NewsItem): string {
  return `${story.title}\n\n${story.summary}\n\nSource: ${story.source}\n${story.url}`;
}

function dedupKeyCandidates(story: NewsItem): string[] {
  return [story.url, story.title.toLowerCase().slice(0, 60)];
}

async function getFreshStories(config: Config, db: SocialAgentDb): Promise<NewsItem[]> {
  const news = await fetchAiTechNews(config);
  const recent = db.getRecentDedupKeys();
  return news.filter((story) => !dedupKeyCandidates(story).some((key) => recent.has(key)));
}

function saveDedupStories(db: SocialAgentDb, stories: NewsItem[]) {
  db.saveDedupKeys(stories.flatMap((story) => dedupKeyCandidates(story)));
}

function enqueue(db: SocialAgentDb, queueType: string, payload: QueuePayload) {
  db.enqueue(queueType, {
    ...payload,
    requestedAt: new Date().toISOString(),
    status: "pending",
  });
}

function resolveZernioTargets(
  config: Config,
  jobId: string,
  platforms: string[],
): {
  targets: Array<{ platform: string; accountId: string }>;
  skipped: PostResult[];
} {
  const targets: Array<{ platform: string; accountId: string }> = [];
  const skipped: PostResult[] = [];

  for (const platform of platforms) {
    const normalized = platform === "x" ? "twitter" : platform;
    const accountId = config.platformAccountIds[normalized];

    if (!accountId) {
      skipped.push({
        jobId,
        platform,
        status: "skipped",
        error: `Missing Zernio account ID for ${platform}`,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    targets.push({ platform: normalized, accountId });
  }

  return { targets, skipped };
}

export async function runJob(jobId: string, config: Config, db: SocialAgentDb): Promise<PostResult[]> {
  switch (jobId) {
    case "news-dedup-morning":
    case "news-dedup-evening":
      return runVideoIntentJob(jobId, config, db);
    case "post-x-linkedin-11am":
    case "post-x-linkedin-1pm":
    case "post-x-linkedin-3pm":
      return runImageIntentJob(jobId, config, db);
    default:
      throw new Error(`Unknown job id: ${jobId}`);
  }
}

async function runVideoIntentJob(jobId: string, config: Config, db: SocialAgentDb): Promise<PostResult[]> {
  const freshStories = await getFreshStories(config, db);
  if (freshStories.length === 0) {
    return [{ jobId, platform: "all", status: "skipped", error: "No fresh stories", timestamp: new Date().toISOString() }];
  }

  const picks = freshStories.slice(0, 2);
  saveDedupStories(db, picks);

  const results: PostResult[] = [];
  const apiKey = config.apiKeys[0];

  for (const story of picks) {
    enqueue(db, "video", {
      story,
      pipeline: ["simli_avatar", "remotion_clip"],
      targets: ["linkedin", "instagram", "tiktok"],
    });

    if (!apiKey) continue;

    const { targets, skipped } = resolveZernioTargets(config, jobId, ["linkedin", "tiktok"]);
    results.push(...skipped);
    if (targets.length === 0) continue;

    const postResults = await postToZernio(apiKey, buildStoryContent(story), targets);
    for (const result of postResults) {
      results.push({
        jobId,
        platform: result.platform,
        status: result.status === "published" ? "published" : "failed",
        url: result.url,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

async function runImageIntentJob(jobId: string, config: Config, db: SocialAgentDb): Promise<PostResult[]> {
  const freshStories = await getFreshStories(config, db);
  if (freshStories.length === 0) {
    return [{ jobId, platform: "all", status: "skipped", error: "No fresh stories", timestamp: new Date().toISOString() }];
  }

  const story = freshStories[0];
  saveDedupStories(db, [story]);

  enqueue(db, "image", {
    story,
    formats: {
      x: { width: 1200, height: 675 },
      linkedin: { width: 1200, height: 627 },
    },
    source: "top_ai_tech_by_popularity",
  });

  enqueue(db, "bird", { story, content: buildStoryContent(story) });

  const results: PostResult[] = [];
  const apiKey = config.apiKeys[0];

  if (apiKey) {
    const { targets, skipped } = resolveZernioTargets(config, jobId, ["linkedin"]);
    results.push(...skipped);
    const zernioResults = targets.length > 0
      ? await postToZernio(apiKey, buildStoryContent(story), targets)
      : [];
    for (const result of zernioResults) {
      results.push({
        jobId,
        platform: result.platform,
        status: result.status === "published" ? "published" : "failed",
        url: result.url,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  results.push({
    jobId,
    platform: "x",
    status: "skipped",
    error: "Queued for bird/manual X posting path",
    timestamp: new Date().toISOString(),
  });

  return results;
}
