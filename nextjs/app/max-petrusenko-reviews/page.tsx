import Link from "next/link";
import { BrandedReferencePage } from "@/components/brand/BrandedReferencePage";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { brandedReferencePageMap } from "@/lib/brand/reference-pages";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";

const config = brandedReferencePageMap["max-petrusenko-reviews"];

export const metadata = generateMetadata({
  title: config.title,
  description: config.description,
  ogType: "website",
  canonical: absoluteUrl(`/${config.slug}`),
  keywords: config.keywords,
});

export default function MaxPetrusenkoReviewsPage() {
  // NOTE: this route used to emit a bare `AggregateRating` with
  // `itemReviewed: Organization "Max Petrusenko"`, plus one hardcoded-5-star
  // `Review` node per testimonial. All of it was self-serving markup about Max
  // on Max's own site, which Google's review-snippet policy declares ineligible
  // ("If the entity that's being reviewed controls the reviews about itself,
  // their pages that use LocalBusiness or any other type of Organization
  // structured data are ineligible for star review feature"). It is gone. The
  // testimonials below remain *visible* page copy; only the JSON-LD was removed.
  return (
    <>
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
