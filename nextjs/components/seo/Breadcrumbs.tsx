import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation with structured data
 * Improves SEO and user navigation on deeper pages
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }

  return (
    <>
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema(items)}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li
                key={item.url}
                className={isLast ? "breadcrumb-item breadcrumb-last" : "breadcrumb-item"}
              >
                {isLast ? (
                  <span className="breadcrumb-current">{item.name}</span>
                ) : (
                  <Link href={item.url} className="breadcrumb-link">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
