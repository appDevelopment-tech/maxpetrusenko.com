import { siteConfig } from "@/config/site";

/**
 * Generate JSON-LD structured data for WebPage
 */
export function generateWebPageSchema(data: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: `${siteConfig.url}${data.url}`,
    ...(data.datePublished && { datePublished: data.datePublished }),
    ...(data.dateModified && { dateModified: data.dateModified }),
  };
}

/**
 * Generate JSON-LD structured data for Article
 */
export function generateArticleSchema(data: {
  title: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  dateModified: string;
  author: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    image: data.image.startsWith("http")
      ? data.image
      : `${siteConfig.url}${data.image}`,
    url: `${siteConfig.url}${data.url}`,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    author: {
      "@type": "Person",
      name: data.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}${data.url}`,
    },
  };
}

/**
 * Generate JSON-LD structured data for Person
 */
export function generatePersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    url: siteConfig.url,
    jobTitle: "Tech Builder & Somatic Practitioner",
    worksFor: {
      "@type": "Organization",
      name: "Presence Atelier",
      url: siteConfig.externalLinks.atelier,
    },
    sameAs: [
      siteConfig.social.github,
      siteConfig.social.linkedin,
      siteConfig.social.medium,
      siteConfig.social.instagram,
      siteConfig.social.twitter,
    ].filter(Boolean),
  };
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Presence Atelier",
    url: siteConfig.externalLinks.atelier,
    founder: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
    description: siteConfig.description,
  };
}

/**
 * Generate JSON-LD structured data for BreadcrumbList
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}
