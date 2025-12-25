import { Metadata } from "next";
import { siteConfig, SEO_DEFAULTS } from "@/config/site";
import type { PageMetadata } from "@/types";

/**
 * Generate metadata for a page
 */
export function generateMetadata(metadata: PageMetadata): Metadata {
  const {
    title,
    description,
    ogImage,
    ogType = "website",
    canonical,
    noindex = false,
    keywords = [],
  } = metadata;

  const fullTitle = title === siteConfig.name ? title : `${title} | ${siteConfig.name}`;
  const imageUrl = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${siteConfig.url}${ogImage}`
    : `${siteConfig.url}${SEO_DEFAULTS.ogImage}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    authors: [{ name: siteConfig.author.name }],
    creator: siteConfig.author.name,
    publisher: siteConfig.author.name,
    openGraph: {
      type: ogType,
      locale: "en_US",
      url: canonical,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: SEO_DEFAULTS.twitterHandle,
    },
    icons: {
      icon: "/favicon.png",
      apple: "/apple-touch-icon.png",
    },
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    ...(canonical && {
      alternates: {
        canonical,
      },
    }),
  };
}

/**
 * Generate absolute URL from path
 */
export function absoluteUrl(path: string): string {
  return `${siteConfig.url}${path}`;
}

/**
 * Generate article slug from title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
