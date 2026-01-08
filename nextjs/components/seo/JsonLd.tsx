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
      "@context": "https://schema.org",
      "@type": "WebPage",
      ...data,
    },
    Article: {
      "@context": "https://schema.org",
      "@type": "Article",
      ...data,
    },
    Person: {
      "@context": "https://schema.org",
      "@type": "Person",
      ...data,
    },
    Organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      ...data,
    },
    BreadcrumbList: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      ...data,
    },
    ProfessionalService: {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      ...data,
    },
    FAQPage: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      ...data,
    },
    SoftwareApplication: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      ...data,
    },
    TechArticle: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
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
