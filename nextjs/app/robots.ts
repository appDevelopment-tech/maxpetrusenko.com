import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Robots.txt generation
 *
 * Allows all crawlers and provides sitemap location.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/static/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
