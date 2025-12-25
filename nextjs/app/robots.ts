import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Robots.txt generation
 *
 * Allows all crawlers and provides sitemap location.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
