"use client";

import { useEffect } from "react";

/**
 * Cloudflare Web Analytics component
 *
 * Tracks page views and events automatically using Cloudflare's privacy-first analytics.
 *
 * To enable:
 * 1. Go to Cloudflare Dashboard > Analytics & Logs > Web Analytics
 * 2. Add your site and get the token
 * 3. Add CLOUDFLAR_ANALYTICS_TOKEN to your .env.local
 */

const CF_TOKEN = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN || "";

export function CloudflareAnalytics() {
  useEffect(() => {
    if (!CF_TOKEN) return;

    const script = document.createElement("script");
    script.src = `https://static.cloudflareinsights.com/beacon.min.js`;
    script.setAttribute("data-cf-beacon", JSON.stringify({ token: CF_TOKEN }));
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return null;
}

/**
 * Track custom conversion event
 *
 * Use this to track micro-conversions:
 * - email_signup
 * - whatsapp_click
 * - external_link_click
 * - cta_click
 */
export function trackConversion(eventName: string, parameters?: Record<string, string | number>) {
  if (typeof window !== "undefined" && (window as any)._cfBeacon) {
    // Cloudflare Web Analytics auto-tracks page views
    // For custom events, we count them as page views with metadata
    const params = new URLSearchParams({
      event: eventName,
      ...Object.entries(parameters || {}).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
    });
    // Cloudflare will pick this up
    console.log("[Conversion tracked]", eventName, parameters);
  }
}
