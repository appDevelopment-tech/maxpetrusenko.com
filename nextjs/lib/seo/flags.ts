import flagsFile from "@/seo-flags.json";
import {
  assignArm,
  buildArmMap,
  normalizePath,
  serializeArmMap,
  type SeoFlagsFile,
  type SeoArm,
} from "@/lib/seo/seo-flags";
import { seoPageVariants, type SeoPageVariant } from "@/lib/seo/variants";

const config = flagsFile as SeoFlagsFile;

export const SEO_EXPERIMENT = config.experiment;
export const SEO_SITE = config.site;

export const FLAG = {
  crawlers: "seo_h005_ai_crawlers",
  indexing: "seo_h021_indexing",
  titles: "seo_h003_titles",
  keyword: "seo_h013_keyword_placement",
  tldr: "seo_h014_tldr",
  faq: "seo_h015_open_faq",
  links: "seo_h022_internal_links",
} as const;

export function isSiteFlagOn(flagKey: string): boolean {
  return config.flags[flagKey]?.enabled === true;
}

function eligible(flagKey: string, path: string): boolean {
  const entry = seoPageVariants[path];
  if (!entry) return false;
  return flagKey !== FLAG.faq || entry.hasFaq === true;
}

/** Variant copy for this path and flag, or null when the page is control. */
export function variantFor(flagKey: string, path: string): SeoPageVariant | null {
  const normalized = normalizePath(path);
  const arm: SeoArm = assignArm(config, flagKey, normalized, eligible(flagKey, normalized));
  return arm === "variant" ? seoPageVariants[normalized] : null;
}

export function armMap(path: string): Record<string, SeoArm> {
  return buildArmMap(config, path, eligible);
}

/** Content of <meta name="seo-variants">. */
export function seoVariantsContent(path: string): string {
  return serializeArmMap(armMap(path));
}

/** H013: H1 text. Control returns the page's current H1. */
export function seoH1(path: string, current: string): string {
  return variantFor(FLAG.keyword, path)?.h1 ?? current;
}

/** H013: keyword sentence placed before the existing lead. Empty on control. */
export function seoLeadPrefix(path: string): string {
  const variant = variantFor(FLAG.keyword, path);
  return variant ? `${variant.leadPrefix} ` : "";
}

/** H015: value for <details open>. undefined on control keeps the markup unchanged. */
export function seoFaqOpen(path: string): true | undefined {
  return variantFor(FLAG.faq, path) ? true : undefined;
}

/** H003: title override. Control returns the page's current title. */
export function seoTitle(path: string, current: string): string {
  return variantFor(FLAG.titles, path)?.title ?? current;
}
