import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Robots.txt generation
 *
 * Allows all crawlers including AI crawlers and provides sitemap location.
 *
 * Asset policy (rule 18): /_next/image serves the responsive srcset used by every
 * page hero, and /_next/static/* is the JS/CSS the renderer needs. Both MUST stay
 * crawlable — disallowing /_next/ would stop crawlers fetching the exact assets the
 * markup points at. Only genuinely private areas are disallowed.
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
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      // AI Crawlers - Explicitly allow for AI discovery
      {
        userAgent: "GPTBot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "CCBot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "FacebookBot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Amazonbot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      // Additional AI crawlers
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Bytespider",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Diffbot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "YouBot",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "omgili",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Webzio-Extended",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "Anthropic-ChatGPT",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "GoogleOther",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
      },
      {
        userAgent: "GoogleOther-Inspection",
        allow: ["/", "/_next/image", "/_next/static/"],
        disallow: ["/api/", "/inbox", "/workspace", "/admin", "/auth"],
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
