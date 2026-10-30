/**
 * SEO experiment flags (seo-p1-2026-11). Pure helpers, no I/O.
 *
 * Assignment is deterministic and build-time so crawlers and users see the same HTML.
 * variant = enabled && fnv1a32(flagKey + ":" + normalizedPath) % 100 < split * 100
 */

export interface SeoFlagConfig {
  scope: "site" | "page";
  enabled: boolean;
  split?: number;
}

export interface SeoFlagsFile {
  site: string;
  experiment: string;
  started: string | null;
  flags: Record<string, SeoFlagConfig>;
}

export type SeoArm = "variant" | "control" | "site";

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function normalizePath(input: string): string {
  let path = input.trim();
  path = path.replace(/^https?:\/\/[^/]+/i, "");
  path = path.split("#")[0].split("?")[0].toLowerCase();
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

export function assignArm(
  config: SeoFlagsFile,
  flagKey: string,
  path: string,
  eligible = true
): SeoArm {
  const flag = config.flags[flagKey];
  if (!flag) return "control";
  if (flag.scope === "site") return "site";
  const normalized = normalizePath(path);
  if (!flag.enabled || !eligible || normalized === "/") return "control";
  const split = flag.split ?? 0.5;
  return fnv1a32(`${flagKey}:${normalized}`) % 100 < split * 100 ? "variant" : "control";
}

const SHORT_KEY = /^seo_(h\d{3})_/;

export function shortKey(flagKey: string): string {
  return flagKey.match(SHORT_KEY)?.[1] ?? flagKey;
}

export function buildArmMap(
  config: SeoFlagsFile,
  path: string,
  isEligible: (flagKey: string, path: string) => boolean = () => true
): Record<string, SeoArm> {
  const map: Record<string, SeoArm> = {};
  for (const key of Object.keys(config.flags)) {
    map[key] = assignArm(config, key, path, isEligible(key, normalizePath(path)));
  }
  return map;
}

/** "h003=v;h013=c;h005=s" */
export function serializeArmMap(map: Record<string, SeoArm>): string {
  const code: Record<SeoArm, string> = { variant: "v", control: "c", site: "s" };
  return Object.entries(map)
    .map(([key, arm]) => `${shortKey(key)}=${code[arm]}`)
    .join(";");
}
