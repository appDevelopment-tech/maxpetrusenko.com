import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/structured-data";
import Link from "next/link";
import { DirectAnswer } from "@/components/seo/DirectAnswer";

export const metadata = generateMetadata({
  title: "Let's Connect | Site Concierge",
  description:
    "A gentle concierge for questions about somatic work, AI consulting, or the bridge between contemplative practice and engineering. Built by Max Petrusenko.",
  ogType: "website",
  canonical: absoluteUrl("/consciousness-assistant"),
  keywords: [
    "message max",
    "site concierge",
    "somatic questions",
    "ai consulting questions",
    "consciousness and technology",
    "gentle chatbot",
  ],
});

export default function ConsciousnessAssistantPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Let's Connect",
          description:
            "A gentle concierge for helping visitors find the right lane across somatic work, AI consulting, and consciousness x technology.",
          url: "/consciousness-assistant",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          {
            name: "Consciousness x Technology",
            url: "/blog/consciousness-tech",
          },
          {
            name: "Let's Connect",
            url: "/consciousness-assistant",
          },
        ])}
      />

      <div className="container">
        <section className="hero" style={{ paddingBottom: 24 }}>
          <div className="hero-text" style={{ maxWidth: 740 }}>
            <div className="eyebrow">
              <span className="dot"></span> Let's Connect
            </div>
            <h1>A humble concierge, not a pushy bot</h1>
            <p>
              Use the widget on the right to ask about somatic work, AI consulting,
              or the bridge between contemplative practice and engineering. It
              answers gently, keeps page context in view, and saves threads for
              Max to review.
            </p>
          </div>
        </section>

        <DirectAnswer
          question="What is Let's Connect?"
          answer="A gentle site concierge built by Max Petrusenko. It helps visitors ask questions, understand the difference between the somatic, tech, and bridge lanes, and move toward the next right step without hard selling."
        />

        <section className="section" style={{ marginTop: 32 }}>
          <div
            className="card"
            style={{ textAlign: "center", padding: "32px" }}
          >
            <h3>What it is good for</h3>
            <p style={{ marginBottom: 16 }}>
              Short answers. Better routing. Real page context. Then a clean handoff when you want to talk to Max or team.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link className="btn secondary" href="/spirituality">
                Somatic lane
              </Link>
              <Link className="btn secondary" href="/tech">
                Tech lane
              </Link>
              <Link className="btn secondary" href="/blog/consciousness-tech">
                Bridge lane
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
