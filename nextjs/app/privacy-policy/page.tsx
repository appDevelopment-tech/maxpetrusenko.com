import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Privacy Policy",
  description: "Privacy policy for maxpetrusenko.com. How we collect, use, and protect your data.",
  ogType: "website",
  canonical: absoluteUrl("/privacy-policy"),
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Privacy Policy",
          description: "Privacy policy for maxpetrusenko.com.",
          url: "/privacy-policy",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy-policy" },
        ])}
      />

      <div className="container">
        <section className="section" style={{ maxWidth: 720 }}>
          <h1 className="font-serif text-[clamp(1.8rem,3.2vw,2.5rem)] font-bold tracking-tight text-[var(--ink)]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Last updated: April 16, 2026
          </p>

          <div className="prose mt-8 space-y-6 text-[var(--ink-soft)]">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">1. Overview</h2>
            <p>
              Max Petrusenko (&ldquo;we,&rdquo; &ldquo;us&rdquo;) operates maxpetrusenko.com
              (the &ldquo;Site&rdquo;). This policy explains what data we collect, how we use it,
              and your rights.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">2. Data We Collect</h2>
            <h3 className="font-semibold text-[var(--ink)]">Automatically collected</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>Page views and navigation paths (via Cloudflare Web Analytics and Google Analytics)</li>
              <li>Device type, browser, and approximate location</li>
              <li>Referring URL</li>
            </ul>
            <h3 className="mt-4 font-semibold text-[var(--ink)]">Voluntarily provided</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>Email address (when subscribing to updates or contacting us)</li>
              <li>Name and message content (via contact forms or concierge chat)</li>
              <li>Account information (if signing in to workspace features)</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">3. How We Use Your Data</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>To operate and improve the Site</li>
              <li>To respond to inquiries and provide requested services</li>
              <li>To send updates you opted into (you can unsubscribe anytime)</li>
              <li>To understand Site usage through aggregated analytics</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">4. Third-Party Services</h2>
            <p>We use the following services that may process your data:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Cloudflare</strong> for hosting, CDN, and web analytics</li>
              <li><strong>Google Analytics</strong> for site usage metrics</li>
              <li><strong>Supabase</strong> for authentication and data storage</li>
            </ul>
            <p>
              Each service operates under its own privacy policy. We do not sell your personal data
              to any third party.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">5. Cookies</h2>
            <p>
              The Site uses essential cookies for functionality (e.g., authentication state) and
              analytics cookies to understand usage patterns. You can disable cookies in your browser
              settings, though some features may not work as expected.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">6. Data Retention</h2>
            <p>
              We retain personal data only as long as necessary to fulfill the purposes described
              above. Analytics data is aggregated and does not identify individuals after collection.
              You may request deletion of your data at any time.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Access the personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">8. Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect your data.
              However, no method of transmission over the internet is completely secure.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">9. Children</h2>
            <p>
              The Site is not directed at children under 16. We do not knowingly collect data from
              children. If you believe a child has provided us with personal data, please contact us
              for removal.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">10. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Changes will be reflected on this page
              with an updated date. Continued use of the Site constitutes acceptance of the revised
              policy.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">11. Contact</h2>
            <p>
              Privacy questions? Reach out at{" "}
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
