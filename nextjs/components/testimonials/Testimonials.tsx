import { testimonials, type Testimonial } from "@/lib/cms/testimonials";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateReviewSchema } from "@/lib/seo/structured-data";

/**
 * Testimonials component
 *
 * Displays testimonials filtered by type with individual Review schemas for AI/SEO.
 * If no testimonials exist, shows nothing (no empty state).
 */

interface TestimonialsProps {
  type: "tech" | "spirituality" | "mindfold";
  /** Optional max to display */
  limit?: number;
}

export function Testimonials({ type, limit }: TestimonialsProps) {
  const filtered = testimonials.filter((t) => t.type === type).slice(0, limit);

  if (filtered.length === 0) {
    return null;
  }

  const serviceName = type === "spirituality" ? "tantra" : type;

  return (
    <>
      {/* Individual Review schemas for each testimonial */}
      {filtered.map((testimonial, index) => (
        <JsonLd
          key={`review-${index}`}
          type="Review"
          data={generateReviewSchema(testimonial, serviceName)}
        />
      ))}

      <section className="section">
        <div className="section-head">
          <h2>What people say</h2>
        </div>
        <div className="testimonials-grid">
          {filtered.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </section>
    </>
  );
}

interface TestimonialCardProps {
  testimonial: Testimonial;
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className="testimonial-card">
      <svg className="quote-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.017 21L14.017 18C14.017 16.0547 14.7461 14.1992 16.0742 12.9688C17.4023 11.7383 18.3477 10.4492 18.3477 9.26562C18.3477 8.10547 17.7188 7.52344 16.793 7.52344C15.8672 7.52344 15.25 8.15625 15.043 9.52734L12.0117 9.19922C12.3008 6.82812 14.1797 5.3125 16.9961 5.3125C19.8359 5.3125 21.5938 7.08203 21.5938 9.52734C21.5938 11.418 20.3164 12.8477 18.3984 14.2969L17.0703 15.2812V18H14.017V21ZM5.98828 21L5.98828 18C5.98828 16.0547 6.7168 14.1992 8.04492 12.9688C9.37305 11.7383 10.3184 10.4492 10.3184 9.26562C10.3184 8.10547 9.68945 7.52344 8.76367 7.52344C7.83789 7.52344 7.2207 8.15625 7.01367 9.52734L3.98242 9.19922C4.27148 6.82812 6.15039 5.3125 8.9668 5.3125C11.8066 5.3125 13.5645 7.08203 13.5645 9.52734C13.5645 11.418 12.2871 12.8477 10.3691 14.2969L9.04102 15.2812V18H5.98828 21Z" fill="currentColor" fillOpacity="0.15"/>
      </svg>
      <p className="testimonial-quote">"{testimonial.quote}"</p>
      <p className="testimonial-author">
        — {testimonial.author}
        {testimonial.role && <span className="testimonial-role">, {testimonial.role}</span>}
      </p>
    </div>
  );
}
