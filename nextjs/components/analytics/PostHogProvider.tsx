"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { classifyTraffic, parseSeoVariants } from "@/lib/analytics/traffic-class";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const SITE = "maxpetrusenko.com";
const EXPERIMENT = "seo-p1-2026-11";

let initialized = false;

function readVariantProps(): Record<string, string> {
  const content = document
    .querySelector('meta[name="seo-variants"]')
    ?.getAttribute("content");
  return parseSeoVariants(content);
}

/**
 * PostHog for the SEO experiment. No key, no network: the site renders unchanged.
 * Pageviews are manual so each route change carries the page's variant map.
 */
export function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!KEY || initialized) return;
    posthog.init(KEY, {
      api_host: HOST,
      person_profiles: "identified_only",
      capture_pageview: false,
      disable_session_recording: true,
    });
    posthog.register({ site: SITE, seo_experiment: EXPERIMENT });
    initialized = true;
  }, []);

  useEffect(() => {
    if (!KEY) return;
    // Next updates <head> metadata after the route commits; wait a tick before reading the meta tag.
    const timer = window.setTimeout(() => {
      if (!initialized) return;
      const trafficClass = classifyTraffic(document.referrer, window.location.search);
      posthog.register({ ...readVariantProps(), traffic_class: trafficClass });
      posthog.capture("$pageview", { traffic_class: trafficClass, ...readVariantProps() });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
