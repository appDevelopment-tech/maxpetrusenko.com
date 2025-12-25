"use client";

import { useEffect } from "react";

/**
 * Google Analytics component
 *
 * Replace 'G-XXXXXXXXXX' with your actual Google Analytics measurement ID.
 *
 * To enable:
 * 1. Create a Google Analytics 4 property
 * 2. Add your Measurement ID below
 * 3. Set the enabled flag to true
 */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX";
const enabled = process.env.NEXT_PUBLIC_GA_ENABLED === "true";

export function GoogleAnalytics() {
  useEffect(() => {
    if (!enabled || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") return;

    // Load Google Analytics script
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    const configScript = document.createElement("script");
    configScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(configScript);

    return () => {
      // Cleanup scripts on unmount
      document.head.removeChild(script);
      document.head.removeChild(configScript);
    };
  }, []);

  return null;
}

/**
 * Track page view
 *
 * Use this to manually track page views if needed.
 * Most page views are tracked automatically.
 */
export function trackPageView(path: string) {
  if (typeof window !== "undefined" && enabled && (window as any).gtag) {
    (window as any).gtag("event", "page_view", {
      page_path: path,
    });
  }
}

/**
 * Track custom event
 *
 * Use this to track user interactions like button clicks, form submissions, etc.
 */
export function trackEvent(eventName: string, parameters?: Record<string, unknown>) {
  if (typeof window !== "undefined" && enabled && (window as any).gtag) {
    (window as any).gtag("event", eventName, parameters);
  }
}
