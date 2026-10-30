import Link from "next/link";
import { FLAG, variantFor } from "@/lib/seo/flags";

/** H014: answer-first block directly under the H1. Renders nothing on control. */
export function SeoTldr({ path }: { path: string }) {
  const variant = variantFor(FLAG.tldr, path);
  if (!variant) return null;

  return (
    <div
      className="direct-answer"
      data-direct-answer="true"
      data-variant="embedded"
      data-seo-block="tldr"
      style={{ margin: "20px auto 8px", maxWidth: 900 }}
    >
      <p className="direct-answer-label">In short</p>
      <p className="direct-answer-text">{variant.tldr}</p>
    </div>
  );
}

/** H022: contextual Related links. Renders nothing on control. */
export function SeoRelatedLinks({ path }: { path: string }) {
  const variant = variantFor(FLAG.links, path);
  if (!variant) return null;

  return (
    <aside data-seo-block="related-links" style={{ margin: "40px 0 8px" }}>
      <h2>Related</h2>
      <ul>
        {variant.related.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.anchor}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
