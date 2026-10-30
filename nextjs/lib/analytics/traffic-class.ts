export type TrafficClass = "ai_referral" | "organic_search" | "social" | "direct" | "other";

const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "claude.ai",
  "you.com",
  "phind.com",
  "meta.ai",
  "grok.com",
];
const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "search.brave.com"];
const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "lnkd.in",
  "x.com",
  "twitter.com",
  "t.co",
  "reddit.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
  "medium.com",
  "threads.net",
];

function hostMatches(host: string, needle: string): boolean {
  return needle.endsWith(".") ? host.includes(needle) : host === needle || host.endsWith(`.${needle}`);
}

export function classifyTraffic(referrer: string, search = ""): TrafficClass {
  const utm = new URLSearchParams(search).get("utm_source")?.toLowerCase() ?? "";
  if (/chatgpt|perplexity|openai/.test(utm)) return "ai_referral";
  if (!referrer) return "direct";

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (AI_HOSTS.some((h) => hostMatches(host, h))) return "ai_referral";
  if (SEARCH_HOSTS.some((h) => hostMatches(host, h))) return "organic_search";
  if (SOCIAL_HOSTS.some((h) => hostMatches(host, h))) return "social";
  return "other";
}

const ARM_NAME: Record<string, string> = { v: "variant", c: "control", s: "site" };

/** "h003=v;h013=c" -> { seo_h003: "variant", seo_h013: "control" } */
export function parseSeoVariants(content: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (content ?? "").split(";")) {
    const [key, code] = part.split("=");
    if (/^h\d{3}$/.test(key ?? "") && ARM_NAME[code ?? ""]) out[`seo_${key}`] = ARM_NAME[code];
  }
  return out;
}
