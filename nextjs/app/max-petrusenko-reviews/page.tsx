import Link from "next/link";
import { BrandedReferencePage } from "@/components/brand/BrandedReferencePage";
import { JsonLd } from "@/components/seo/JsonLd";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { brandedReferencePageMap } from "@/lib/brand/reference-pages";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";
import {
  generateAggregateRatingSchema,
  generateAllReviewsSchema,
} from "@/lib/seo/structured-data";

const config = brandedReferencePageMap["max-petrusenko-reviews"];

export const metadata = generateMetadata({
  title: config.title,
  description: config.description,
  ogType: "website",
  canonical: absoluteUrl(`/${config.slug}`),
  keywords: config.keywords,
});

export default function MaxPetrusenkoReviewsPage() {
  const techReviews = generateAllReviewsSchema("tech");
  const spiritualityReviews = generateAllReviewsSchema("spirituality");
  const mindfoldReviews = generateAllReviewsSchema("mindfold");

  return (
    <>
      <JsonLd type="AggregateRating" data={generateAggregateRatingSchema("all")} />
      {techReviews.map((review: Record<string, unknown>, index: number) => (
        <JsonLd key={`tech-${index}`} type="Review" data={review} />
      ))}
      {spiritualityReviews.map((review: Record<string, unknown>, index: number) => (
        <JsonLd key={`spirit-${index}`} type="Review" data={review} />
      ))}
      {mindfoldReviews.map((review: Record<string, unknown>, index: number) => (
        <JsonLd key={`mindfold-${index}`} type="Review" data={review} />
      ))}

      <BrandedReferencePage config={config}>
        <section className="section">
          <div className="section-head">
            <h2>Published proof routes</h2>
            <span className="section-note">Best pages for trust checks and deeper evaluation</span>
          </div>
          <div className="cards-3 grid">
            <Link className="card" href="/proof">
              <h3>Proof hub</h3>
              <p>Central validation page for outcomes, case studies, and supporting evidence.</p>
            </Link>
            <Link className="card" href="/tech/case-studies/claude-code-automation">
              <h3>$253k case study</h3>
              <p>Published automation case study with metrics, rollout scope, and impact.</p>
            </Link>
            <Link className="card" href="/identity">
              <h3>Identity</h3>
              <p>Authoritative disambiguation route tying all testimonial lanes back to one person.</p>
            </Link>
          </div>
        </section>

        <Testimonials
          type="tech"
          limit={6}
          note="Tech testimonials published on-site."
          toggleLabel="Show tech reviews"
        />
        <Testimonials
          type="spirituality"
          limit={6}
          note="Somatic and spirituality testimonials published on-site."
          toggleLabel="Show somatic reviews"
        />
        <Testimonials
          type="mindfold"
          limit={3}
          note="Mindfold participant quotes published on-site."
          toggleLabel="Show Mindfold reviews"
        />
      </BrandedReferencePage>
    </>
  );
}
