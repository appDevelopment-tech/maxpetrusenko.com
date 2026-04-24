import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

const lastUpdated = "April 19, 2026";
const contactEmail = siteConfig.author.email;

export const metadata = generateMetadata({
  title: "Privacy Policy",
  description:
    "Privacy policy for Max Petrusenko websites, apps, AI tools, newsletters, events, and consulting services.",
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
          description:
            "Privacy policy for Max Petrusenko websites, apps, AI tools, newsletters, events, and consulting services.",
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
        <section className="section" style={{ maxWidth: 780 }}>
          <h1 className="font-serif text-[clamp(1.8rem,3.2vw,2.5rem)] font-bold tracking-tight text-[var(--ink)]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Last updated: {lastUpdated}
          </p>

          <div className="prose mt-8 space-y-6 text-[var(--ink-soft)]">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">1. Scope</h2>
            <p>
              Max Petrusenko (&ldquo;Max,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;) operates maxpetrusenko.com and related products, tools,
              events, newsletters, AI assistants, concierge/chat features, private workspace features,
              social dashboards, Mindfold experiences, somatic education services, and consulting services
              that link to this policy (together, the &ldquo;Services&rdquo;).
            </p>
            <p>
              If a specific app, client agreement, event waiver, or third-party platform gives you a
              separate privacy notice, that notice controls for that specific context.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">2. Information We Collect</h2>
            <p>We collect information in a few practical ways.</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Contact and account details:</strong> name, email address, phone or WhatsApp
                details, authentication profile, company, role, timezone, and project context.
              </li>
              <li>
                <strong>Messages and submissions:</strong> emails, form submissions, concierge/chat
                messages, prompts, uploaded screenshots or images, newsletter preferences, booking
                requests, and service intake details you choose to share.
              </li>
              <li>
                <strong>Service and event details:</strong> consultation notes, scheduling preferences,
                workshop or Mindfold attendance context, and optional somatic session preferences or
                boundaries you voluntarily provide.
              </li>
              <li>
                <strong>Technical and usage data:</strong> IP address, device and browser details,
                approximate location, referring page, pages viewed, feature usage, errors, cookies,
                local storage identifiers, and analytics events.
              </li>
              <li>
                <strong>Payment and transaction context:</strong> if paid services are offered through
                a third-party provider, that provider processes payment details. We may receive receipts,
                payment status, subscription status, invoice metadata, or purchase history.
              </li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">3. How We Use Information</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Operate, secure, debug, and improve the Services.</li>
              <li>Respond to messages, support requests, bookings, and consulting inquiries.</li>
              <li>Provide AI assistant, concierge, automation, workspace, newsletter, and event features.</li>
              <li>Personalize context when you return to a tool, page, chat, or workspace.</li>
              <li>Send updates you requested, with opt-out controls where required.</li>
              <li>Measure performance, traffic, content usefulness, and product reliability.</li>
              <li>Protect against abuse, spam, unauthorized access, and security incidents.</li>
              <li>Comply with legal, tax, accounting, payment, and safety obligations.</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">4. AI Features</h2>
            <p>
              Some Services use AI providers to generate responses, summarize context, route requests, or
              support automation workflows. Prompts, messages, attachments, route context, and relevant
              conversation history may be sent to those providers to produce the requested output.
            </p>
            <p>
              Do not submit secrets, passwords, private keys, regulated health information, financial
              account numbers, or highly sensitive personal data unless a separate written agreement says
              that kind of processing is allowed.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">5. Cookies and Local Storage</h2>
            <p>
              We use cookies, local storage, and similar technologies for authentication, security,
              remembered chat state, basic preferences, analytics, abuse prevention, and performance
              measurement. You can change browser settings to limit cookies, but some features may stop
              working correctly.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">6. Third-Party Services</h2>
            <p>
              We use service providers to host, secure, analyze, send, store, automate, authenticate, and
              operate the Services. These may include Cloudflare, Google Analytics or Google Workspace,
              Supabase, OpenAI or other AI providers, Resend or other email providers, social media APIs,
              payment providers, scheduling tools, and business operations tools.
            </p>
            <p>
              These providers process information under their own terms and privacy policies. We do not
              sell your personal information. We also do not knowingly share personal information for
              cross-context behavioral advertising.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">7. Sensitive Information and Wellness Boundaries</h2>
            <p>
              Somatic, tantra, breathwork, mindfulness, and consciousness-related Services are educational,
              experiential, and wellness-oriented. They are not medical care, psychotherapy, crisis support,
              legal advice, or financial advice. Any health, trauma, boundary, or personal history details
              you share are voluntary and used only to evaluate fit, prepare appropriately, protect safety,
              or provide the specific Service you requested.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">8. How We Share Information</h2>
            <p>We share information only when it is reasonably needed for the Services.</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>With vendors and infrastructure providers that help operate the Services.</li>
              <li>With collaborators or contractors working under confidentiality expectations.</li>
              <li>With third-party platforms when you direct an integration, login, publish action, or workflow.</li>
              <li>To comply with law, enforce terms, prevent abuse, protect rights, or respond to lawful requests.</li>
              <li>In connection with a merger, acquisition, restructuring, or transfer of business assets.</li>
            </ul>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">9. Retention</h2>
            <p>
              We keep personal information only as long as reasonably needed for the purposes described in
              this policy, including service delivery, support, security, legal compliance, accounting,
              dispute resolution, and legitimate business records. Concierge threads, workspace records,
              subscription records, and project records may be retained while they remain useful for support,
              continuity, safety, or business operations.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">10. Security</h2>
            <p>
              We use reasonable technical and organizational safeguards, including hosted infrastructure,
              access controls, authentication, rate limits, abuse checks, and encrypted transport where
              available. No internet service is completely secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">11. Your Choices and Rights</h2>
            <p>
              Depending on where you live, you may have rights to access, correct, delete, export, restrict,
              or object to certain processing of your personal information. You may also opt out of
              marketing emails and request that we delete or update information you provided.
            </p>
            <p>
              To make a request, email{" "}
              <a className="text-[var(--accent-mindfold)] underline" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
              . We may need to verify your identity before completing a request.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">12. Children</h2>
            <p>
              The Services are not directed to children under 16, and we do not knowingly collect personal
              information from children. If you believe a child provided information, contact us and we will
              take reasonable steps to delete it.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">13. International Use</h2>
            <p>
              The Services may be operated from, hosted in, or processed through the United States and other
              countries. By using the Services, you understand that information may be processed outside your
              country of residence.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">14. Changes</h2>
            <p>
              We may update this policy from time to time. The updated date at the top shows when the policy
              last changed. Continued use of the Services after an update means you accept the revised policy.
            </p>

            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">15. Contact</h2>
            <p>
              Privacy questions or data requests can be sent to{" "}
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
