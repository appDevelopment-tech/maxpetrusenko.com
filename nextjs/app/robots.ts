import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Robots.txt generation
 *
 * Allows all crawlers including AI crawlers and provides sitemap location.
 * AI crawlers are explicitly allowed for AI discovery in ChatGPT, Claude, Perplexity,
 * Google AI, Apple, and other AI-powered search engines.
 *
 * AI guidance files available at:
 * - /llm.txt - Extended AI usage guidance
 * - /llms.txt - Machine-readable AI protocol
 * - /.ai.txt - AI discovery protocol
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/static/"],
      },
      // AI Crawlers - Explicitly allow for AI discovery
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "FacebookBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Amazonbot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // Additional AI crawlers
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Bytespider",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Diffbot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "YouBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "omgili",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Webzio-Extended",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Anthropic-ChatGPT",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "GoogleOther",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "GoogleOther-Inspection",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // Allow AI guidance files specifically
      {
        userAgent: "*",
        allow: ["/llm.txt", "/llms.txt", "/.ai.txt", "/sitemap.xml"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
