import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/social-schedule
 *
 * Returns the full social media posting schedule.
 * Source of truth: workers/social-scheduler/schedule.json
 * This endpoint exists so the schedule is always recoverable from the live site.
 */

const SCHEDULE = {
  _updated: "2026-04-04",
  _tools: {
    zernio: "https://zernio.com/api/v1 — unified social posting API (late.dev)",
    bird: "~/Projects/bird/bird — X/Twitter CLI",
    simli: "https://api.simli.com — AI avatar video generation",
    remotion: "https://remotion.dev — React-based programmatic video rendering",
  },
  _platforms: {
    x: { handle: "@petrusenko_max", tool: "bird + zernio" },
    linkedin: { handle: "max-petrusenko-40574b4a", tool: "zernio" },
    instagram: { handle: "blindfold.miami", tool: "zernio" },
    tiktok: { tool: "zernio" },
    facebook: { tool: "zernio" },
    reddit: { tool: "zernio" },
    pinterest: { tool: "zernio" },
    youtube: { tool: "zernio" },
  },
  _imageFormats: {
    x: { width: 1200, height: 675, aspect: "16:9", format: "png" },
    linkedin: { width: 1200, height: 627, aspect: "1.91:1", format: "png" },
    instagram: { width: 1080, height: 1080, aspect: "1:1", format: "jpg" },
    tiktok: { width: 1080, height: 1920, aspect: "9:16", format: "mp4" },
    facebook: { width: 1200, height: 630, aspect: "1.91:1", format: "png" },
    pinterest: { width: 1000, height: 1500, aspect: "2:3", format: "png" },
  },
  jobs: [
    {
      id: "news-dedup-morning",
      cron: "0 13 * * *",
      cronHuman: "9:00 AM ET",
      description: "News dedup + 2 video posts (Simli + Remotion) → LinkedIn, IG, TikTok",
      targets: ["linkedin", "instagram", "tiktok"],
      contentType: "video",
      count: 2,
    },
    {
      id: "news-dedup-evening",
      cron: "0 22 * * *",
      cronHuman: "6:00 PM ET",
      description: "Evening news dedup + 2 video posts → LinkedIn, IG, TikTok",
      targets: ["linkedin", "instagram", "tiktok"],
      contentType: "video",
      count: 2,
    },
    {
      id: "post-x-linkedin-11am",
      cron: "0 15 * * *",
      cronHuman: "11:00 AM ET",
      description: "Top AI/tech story by popularity + platform image → X (bird) + LinkedIn (zernio)",
      targets: ["x", "linkedin"],
      contentType: "image+text",
    },
    {
      id: "post-x-linkedin-1pm",
      cron: "0 17 * * *",
      cronHuman: "1:00 PM ET",
      description: "Second image post → X + LinkedIn",
      targets: ["x", "linkedin"],
      contentType: "image+text",
    },
    {
      id: "post-x-linkedin-3pm",
      cron: "0 19 * * *",
      cronHuman: "3:00 PM ET",
      description: "Third image post → X + LinkedIn",
      targets: ["x", "linkedin"],
      contentType: "image+text",
    },
  ],
} as const;

export async function GET() {
  return NextResponse.json(SCHEDULE, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
