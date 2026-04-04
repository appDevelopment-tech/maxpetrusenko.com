export interface ScheduleTooling {
  zernio: string;
  bird: string;
  simli: string;
  remotion: string;
}

export interface SchedulePlatform {
  handle?: string;
  tool: string;
}

export interface ScheduleImageFormat {
  width: number;
  height: number;
  aspect: string;
  format: string;
}

export interface ScheduleJob {
  id: string;
  name: string;
  cron: string;
  cronHuman: string;
  description: string;
  actions: string[];
  targets: string[];
  contentType: string;
  count?: number;
}

export interface ScheduleFile {
  _updated: string;
  _tools: ScheduleTooling;
  _platforms: Record<string, SchedulePlatform>;
  _imageFormats: Record<string, ScheduleImageFormat>;
  jobs: ScheduleJob[];
}

export interface Config {
  port: number;
  timezone: string;
  dataDir: string;
  runToken: string;
  statusToken?: string;
  baseUrl?: string;
  newsApiKey?: string;
  simliApiKey?: string;
  cartesiaApiKey?: string;
  birdPath?: string;
  platformAccountIds: Partial<Record<string, string>>;
  schedule: ScheduleFile;
  apiKeys: string[];
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  score: number;
  summary: string;
  publishedAt: string;
}

export interface PostResult {
  jobId: string;
  platform: string;
  status: "published" | "failed" | "skipped";
  url?: string;
  error?: string;
  timestamp: string;
}

export interface QueuePayload {
  [key: string]: unknown;
}

export interface RunLog {
  id: number;
  jobId: string;
  trigger: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  results: PostResult[];
}

export interface SocialPlatform {
  platform: string;
  status: string;
  publishedUrl?: string;
  platformPostUrl?: string;
  error?: string;
}

export interface SocialPost {
  _id: string;
  content: string;
  platforms: SocialPlatform[];
  mediaItems?: Array<{ url: string; type: string }>;
  publishedAt?: string;
  createdAt: string;
  status: string;
}
