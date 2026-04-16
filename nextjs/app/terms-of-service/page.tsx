import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Terms of Service",
  description: "Terms of service for maxpetrusenko.com. Usage rules, disclaimers, and limitations of liability.",
  ogType: "website",
  canonical: absoluteUrl("/terms-of-service"),
});

export default function TermsOfServicePage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Terms of Service",
          description: "Terms of service for maxpetrusenko.com.",
          url: "/terms-of-service",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Terms of Service", url: "/terms-of-service" },
        ])}
      />

      <div className="container">
        <section className="section" style={{ maxWidth: 720 }}>
          <h1 className="font-serif text-[clamp(1.8rem,3.2vw,2.5rem)] font-bold tracking-tight text-[var(--ink)]">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Last updated: April 16, 2026
          </p>

          <div className="prose mt-8 space-y-6 text-[var(--ink-soft)]">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">1. Acceptance of Terms</h2>
            <p>
              By accessing and using maxpetrusenko.com (the &ldquo;Site&rdquo;), you agree to be bound by these
              Terms of Service. If you do not agree, please do not use the Site.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">2. Use of the Site</h2>
            <p>
              The Site is provided for informational purposes. You may browse freely, but you agree not to:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Use the Site for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Site</li>
              <li>Interfere with the proper functioning of the Site</li>
              <li>Scrape, reproduce, or redistribute content without written permission</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">3. Intellectual Property</h2>
            <p>
              All content on the Site, including text, images, code, and design, is the property of
              Max Petrusenko unless otherwise stated. You may not copy, modify, or distribute any content
              without prior written consent.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">4. Services</h2>
            <p>
              The Site describes services including technology consulting, automation builds, somatic
              sessions, and educational content. Specific terms for paid engagements are established
              through separate agreements. Nothing on the Site constitutes a binding offer or contract
              for services.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">5. Disclaimer of Warranties</h2>
            <p>
              The Site and its content are provided &ldquo;as is&rdquo; without warranties of any kind,
              express or implied. Max Petrusenko does not warrant that the Site will be uninterrupted,
              error-free, or free of harmful components.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">6. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Max Petrusenko shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Site or reliance
              on any content provided.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">7. External Links</h2>
            <p>
              The Site may contain links to third-party websites. These links are provided for convenience
              only. Max Petrusenko is not responsible for the content or practices of any linked sites.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">8. Changes to Terms</h2>
            <p>
              These terms may be updated at any time. Continued use of the Site after changes constitutes
              acceptance of the updated terms. The &ldquo;Last updated&rdquo; date at the top reflects the
              most recent revision.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">9. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Florida, United States, without regard
              to conflict of law principles.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">10. Contact</h2>
            <p>
              Questions about these terms? Reach out at{" "}
              <a
                href="mailto:hello@maxpetrusenko.com"
                className="text-[var(--accent-mindfold)] underline"
              >
                hello@maxpetrusenko.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
