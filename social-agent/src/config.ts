import fs from "node:fs";
import path from "node:path";
import { Config, ScheduleFile } from "./types";

function loadSchedule(): ScheduleFile {
  const candidates = [
    process.env.SOCIAL_SCHEDULE_FILE,
    path.resolve(process.cwd(), "config/schedule.json"),
    path.resolve(process.cwd(), "../nextjs/workers/social-scheduler/schedule.json"),
    path.resolve(__dirname, "../config/schedule.json"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, "utf8")) as ScheduleFile;
    }
  }

  throw new Error("Could not locate social schedule JSON");
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

export function loadConfig(): Config {
  const schedule = loadSchedule();

  return {
    port: Number(process.env.PORT ?? 3333),
    timezone: process.env.TZ ?? "America/New_York",
    dataDir: process.env.SOCIAL_DATA_DIR ?? "/data",
    runToken: process.env.SOCIAL_RUN_TOKEN ?? "",
    statusToken: process.env.SOCIAL_STATUS_TOKEN,
    baseUrl: process.env.SOCIAL_BASE_URL,
    newsApiKey: process.env.NEWS_API_KEY,
    simliApiKey: process.env.SIMLI_API_KEY,
    cartesiaApiKey: process.env.CARTESIA_API_KEY,
    birdPath: process.env.BIRD_PATH,
    platformAccountIds: {
      twitter: process.env.ZERNIO_TWITTER_ACCOUNT_ID,
      linkedin: process.env.ZERNIO_LINKEDIN_ACCOUNT_ID,
      instagram: process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID,
      tiktok: process.env.ZERNIO_TIKTOK_ACCOUNT_ID,
      facebook: process.env.ZERNIO_FACEBOOK_ACCOUNT_ID,
      reddit: process.env.ZERNIO_REDDIT_ACCOUNT_ID,
      pinterest: process.env.ZERNIO_PINTEREST_ACCOUNT_ID,
      youtube: process.env.ZERNIO_YOUTUBE_ACCOUNT_ID,
    },
    schedule,
    apiKeys: unique([
      process.env.SOCIAL_POSTS_PRIMARY_API_KEY,
      process.env.SOCIAL_POSTS_LIFETIME_API_KEY,
      process.env.GETLATE_DEV_API_KEY_FREE,
      process.env.ZERNIO_API_KEY,
    ]),
  };
}
