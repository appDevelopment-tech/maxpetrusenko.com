import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

const lastUpdated = "April 19, 2026";
const contactEmail = siteConfig.author.email;

export const metadata = generateMetadata({
  title: "Terms of Service",
  description:
    "Terms of service for Max Petrusenko websites, apps, AI tools, newsletters, events, and consulting services.",
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
          description:
            "Terms of service for Max Petrusenko websites, apps, AI tools, newsletters, events, and consulting services.",
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
        <section className="section" style={{ maxWidth: 780 }}>
          <h1 className="font-serif text-[clamp(1.8rem,3.2vw,2.5rem)] font-bold tracking-tight text-[var(--ink)]">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Last updated: {lastUpdated}
          </p>

          <div className="prose mt-8 space-y-6 text-[var(--ink-soft)]">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">1. Agreement</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) apply to maxpetrusenko.com and any
              related websites, apps, AI tools, concierge/chat features, newsletters, private workspace
              features, social dashboards, Mindfold experiences, somatic education services, automation
              tools, and consulting services that link to these Terms (the &ldquo;Services&rdquo;).
            </p>
            <p>
              By accessing or using the Services, you agree to these Terms. If you do not agree, do not use
              the Services.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">2. Separate Agreements</h2>
            <p>
              Paid consulting, custom software work, private events, somatic sessions, retainers, workshops,
              or client projects may require a separate written agreement, proposal, statement of work,
              invoice, event waiver, or consent form. If there is a conflict, the signed or separately
              accepted agreement controls for that specific service.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">3. Acceptable Use</h2>
            <p>You agree not to misuse the Services. You may not:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Use the Services for unlawful, harmful, abusive, deceptive, or exploitative activity.</li>
              <li>Interfere with, scrape, overload, reverse engineer, or bypass security controls.</li>
              <li>Attempt unauthorized access to accounts, admin areas, APIs, infrastructure, or data.</li>
              <li>Submit malware, secrets, private keys, regulated data, or content you do not have rights to use.</li>
              <li>Use AI, automation, or publishing tools to spam, impersonate, harass, or violate platform rules.</li>
              <li>Sexualize, solicit, or misrepresent somatic, tantra, or Mindfold services.</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">4. Accounts and Access</h2>
            <p>
              Some Services require authentication, access approval, or admin permission. You are responsible
              for keeping credentials secure and for activity under your account. We may suspend or remove
              access if we believe use is unauthorized, unsafe, abusive, illegal, or harmful to the Services
              or other people.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">5. AI and Automation Outputs</h2>
            <p>
              AI assistants, agents, automations, social tools, and generated outputs may be incomplete,
              inaccurate, delayed, or unsuitable for your use case. You are responsible for reviewing outputs
              before relying on them, publishing them, sending them, or using them in production.
            </p>
            <p>
              The Services do not provide legal, financial, medical, psychiatric, crisis, or other licensed
              professional advice. Do not rely on the Services as a substitute for qualified professional
              judgment.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">6. Wellness, Somatic, and Event Boundaries</h2>
            <p>
              Somatic, tantra, breathwork, mindfulness, and Mindfold offerings are educational, experiential,
              and wellness-oriented. They are not medical treatment, psychotherapy, crisis care, sexual
              services, or a promise of any particular emotional, spiritual, health, business, or performance
              outcome.
            </p>
            <p>
              You are responsible for disclosing relevant limitations, following stated boundaries, stopping
              when something feels unsafe, and seeking medical or mental health support when appropriate.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">7. Client Materials and User Content</h2>
            <p>
              You keep ownership of content, prompts, screenshots, data, files, feedback, project materials,
              and other information you submit (&ldquo;User Content&rdquo;). You grant us a limited license to
              use User Content as needed to operate, secure, debug, improve, and provide the Services you
              requested.
            </p>
            <p>
              You represent that you have the rights and permissions needed to submit User Content and to
              authorize any integrations, automations, publishing actions, or third-party platform use you
              request.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">8. Max Petrusenko Content</h2>
            <p>
              The Services, including text, design, code, images, guides, frameworks, workflows, prompts,
              templates, and branding, are owned by Max Petrusenko or licensed to us unless stated otherwise.
              You may not copy, resell, redistribute, scrape, or create derivative works from the Services
              without written permission, except for normal personal or internal business use.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">9. Third-Party Services</h2>
            <p>
              The Services may connect to or rely on third-party platforms, including hosting, analytics,
              authentication, AI providers, payment processors, email providers, social platforms, scheduling
              tools, and client-selected software. Those services are governed by their own terms and privacy
              policies. We are not responsible for third-party outages, decisions, content, security practices,
              API changes, fees, account actions, or policy enforcement.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">10. Payments, Refunds, and Taxes</h2>
            <p>
              Fees, payment schedules, refund rules, cancellation terms, deliverables, and taxes for paid
              services are governed by the applicable invoice, checkout flow, proposal, statement of work, or
              written agreement. Unless a separate agreement says otherwise, amounts already paid for completed
              work, reserved event capacity, or delivered services are non-refundable.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">11. Disclaimers</h2>
            <p>
              The Services are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest
              extent permitted by law, we disclaim all warranties, express or implied, including warranties of
              merchantability, fitness for a particular purpose, non-infringement, availability, accuracy,
              security, and error-free operation.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">12. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Max Petrusenko will not be liable for indirect,
              incidental, special, consequential, exemplary, or punitive damages, or for lost profits,
              lost revenue, lost data, business interruption, reputational harm, or third-party platform
              actions arising from or related to the Services.
            </p>
            <p>
              To the fullest extent permitted by law, our total liability for any claim related to the
              Services is limited to the amount you paid us for the specific Service giving rise to the claim
              during the three months before the event, or 100 USD if no amount was paid.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">13. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Max Petrusenko from claims, damages,
              liabilities, costs, and expenses arising from your misuse of the Services, your User Content,
              your violation of these Terms, your violation of law, or your violation of third-party rights
              or platform rules.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">14. Changes and Availability</h2>
            <p>
              We may update, suspend, discontinue, or change any part of the Services at any time. We may
              also update these Terms. The updated date at the top shows when the Terms last changed.
              Continued use of the Services after an update means you accept the revised Terms.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">15. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Florida, United States, without regard to
              conflict of law rules, except where applicable consumer protection laws require otherwise.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">16. Contact</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a className="text-[var(--accent-mindfold)] underline" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
