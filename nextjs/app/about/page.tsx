import Link from "next/link";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generatePersonSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "About",
  description: "About Max Petrusenko—tech builder and somatic practitioner.",
  ogType: "website",
  canonical: absoluteUrl("/about"),
});

export default function AboutPage() {
  return (
    <>
      <JsonLd type="Person" data={generatePersonSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "About - Presence + Product",
          description: "Tech builder and somatic practitioner based in Ubud, Bali.",
          url: "/about",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> About
            </div>
            <h1>Presence + Product</h1>
            <p>
              Max Petrusenko is a software developer and AI automation consultant
              who builds production-grade systems for content, workflow, and
              integration efficiency, with a secondary practice in somatic
              bodywork.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/links">
                Links
              </Link>
              <a
                className="btn secondary"
                href="mailto:hello@maxpetrusenko.com?subject=Hello"
                target="_blank"
                rel="noopener"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="hero-card">
            <h3>Fast facts</h3>
            <ul className="list">
              <li>
                Tech: product/UX + build for tools and content systems.
              </li>
              <li>Spirituality: private tantra & somatic work (Presence Atelier).</li>
              <li>Mindfold: sensory subtraction journeys.</li>
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Working together</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Tech</h3>
              <p>
                Product shaping, design/dev, automation. Calm UX and measurable
                outcomes.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn secondary" href="/tech">
                  See tech
                </Link>
              </div>
            </div>
            <div className="card">
              <h3>Spirituality</h3>
              <p>
                Sessions in Ubud focused on regulation, boundaries, and depth.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn primary" href="/spirituality">
                  See spirituality
                </Link>
              </div>
            </div>
            <div className="card">
              <h3>Mindfold</h3>
              <p>Blindfolded presence journeys for perception and trust.</p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn secondary" href="/mindfold/events">
                  Visit
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
