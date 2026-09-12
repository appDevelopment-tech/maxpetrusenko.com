"use client";

import { useEffect } from "react";
import { trackEvent } from "@/components/analytics/GoogleAnalytics";

const HEARTBEAT_SECONDS = [10, 30, 60];

function getTrackLabel(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const tracked = target.closest<HTMLElement>("[data-track]");
  return tracked?.dataset.track || null;
}

function getAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLAnchorElement>("a[href]");
}

function getCommonPayload() {
  return {
    page_path: window.location.pathname,
    page_location: window.location.href,
    page_title: document.title,
  };
}

export function EngagementTracker() {
  useEffect(() => {
    const timers = HEARTBEAT_SECONDS.map((seconds) =>
      window.setTimeout(() => {
        trackEvent("engagement_heartbeat", {
          ...getCommonPayload(),
          event_category: "engagement",
          engagement_time_seconds: seconds,
        });
      }, seconds * 1000)
    );

    const handleClick = (event: MouseEvent) => {
      const trackLabel = getTrackLabel(event.target);
      const anchor = getAnchor(event.target);
      const href = anchor?.href;
      const isOutbound = href ? new URL(href, window.location.href).origin !== window.location.origin : false;

      if (trackLabel) {
        trackEvent("cta_click", {
          ...getCommonPayload(),
          event_category: "cta",
          event_label: trackLabel,
          destination_url: href,
        });
      }

      if (isOutbound && href) {
        trackEvent("outbound_click", {
          ...getCommonPayload(),
          event_category: "outbound",
          event_label: anchor?.textContent?.trim().slice(0, 120) || href,
          destination_url: href,
        });
      }
    };

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      timers.forEach(window.clearTimeout);
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
