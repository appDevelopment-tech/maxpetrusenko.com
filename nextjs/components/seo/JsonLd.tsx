import type { JsonLdProps } from "@/types";

/**
 * JSON-LD structured data component for SEO
 *
 * Renders a <script type="application/ld+json"> tag with structured data
 * that helps search engines understand your content.
 */
export function JsonLd({ type, data }: JsonLdProps) {
  const schemas: Record<JsonLdProps["type"], Record<string, unknown>> = {
    WebPage: {
      "@type": "WebPage",
      ...data,
    },
    Article: {
      "@type": "Article",
      ...data,
    },
    Person: {
      "@type": "Person",
      ...data,
    },
    Organization: {
      "@type": "Organization",
      ...data,
    },
    WebSite: {
      "@type": "WebSite",
      ...data,
    },
    BreadcrumbList: {
      "@type": "BreadcrumbList",
      ...data,
    },
    ItemList: {
      "@type": "ItemList",
      ...data,
    },
    ProfessionalService: {
      "@type": "ProfessionalService",
      ...data,
    },
    FAQPage: {
      "@type": "FAQPage",
      ...data,
    },
    SoftwareApplication: {
      "@type": "SoftwareApplication",
      ...data,
    },
    TechArticle: {
      "@type": "TechArticle",
      ...data,
    },
    Event: {
      "@type": "Event",
      ...data,
    },
  };

  const schema = schemas[type];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
