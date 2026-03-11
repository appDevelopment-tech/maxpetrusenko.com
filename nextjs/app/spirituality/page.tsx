import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { EmailCaptureInline } from "@/components/forms/EmailCaptureInline";
import { Testimonials } from "@/components/testimonials/Testimonials";
import {
  generateOrganizationSchema,
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateProfessionalServiceSchema,
  generateFAQSchema,
  generateScheduleActionSchema,
  generateSpiritualityPersonSchema,
  SERVICE_LOCATIONS,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Spirituality - Tantra & Somatic Energy Work",
  description: "Intimate tantra massage and somatic energy work for men, women, and couples in Ubud, Bali and Miami, Florida. Certified tantric practitioner with nervous system reset, deep repatterning, and open-heart presence sessions. Available in South Florida from West Palm Beach to the Keys.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality"),
});

export default function SpiritualityPage() {
  const individualFaqs = [
    {
      question: "What is tantra massage?",
      answer:
        "Tantra massage is a somatic energy work practice combining breathwork, conscious touch, and presence techniques for nervous system regulation and embodied awareness. Sessions are intimate with clear boundaries and consent-led pacing.",
    },
    {
      question: "Is this sexual?",
      answer:
        "This is intimate work with clear boundaries. There is no performance or expectation. The focus is presence, regulation, and connection, with consent checked throughout.",
    },
    {
      question: "Do I have to be nude?",
      answer:
        "No. Sessions are clothed or draped based on your comfort and agreed boundaries.",
    },
    {
      question: "What happens during a session?",
      answer:
        "We start with intentions and boundaries, then move into breathwork and guided somatic touch. We close with integration and space to land.",
    },
    {
      question: "Do I need prior experience?",
      answer:
        "No. First-timers are welcome. I’ll guide you slowly and clearly based on your comfort.",
    },
    {
      question: "How should I prepare?",
      answer:
        "Arrive clean, hydrated, and light on food. Bring a clear intention and a willingness to communicate boundaries.",
    },
    {
      question: "Where are sessions available?",
      answer:
        "I maintain bases in Ubud, Bali and Miami, Florida, and travel globally. Message to confirm your city.",
    },
    {
      question: "How do I book?",
      answer:
        "The fastest way is WhatsApp: +1-786-543-6688. Email works too at hello@maxpetrusenko.com.",
    },
  ];

  const couplesFaqs = [
    {
      question: "Do you work with couples?",
      answer:
        "Yes. Couples sessions are available by alignment and are designed to deepen connection through somatic practice.",
    },
    {
      question: "How do couples sessions work?",
      answer:
        "We start with a shared intake, agree on boundaries, then move into guided connection practices tailored to your relationship goals.",
    },
    {
      question: "What if we want different boundaries?",
      answer:
        "Each partner sets their own boundaries. We only move forward with shared consent.",
    },
    {
      question: "Are both partners touched?",
      answer:
        "This is agreed in advance. Options range from guided partner practices to direct facilitation, depending on your comfort.",
    },
    {
      question: "Is this about sex?",
      answer:
        "No. The focus is presence, communication, and nervous system regulation. Intimacy is held inside clear boundaries.",
    },
  ];
  return (
    <>
      <JsonLd type="Organization" data={generateOrganizationSchema()} />
      <JsonLd type="ProfessionalService" data={generateProfessionalServiceSchema()} />
      <JsonLd type="FAQPage" data={generateFAQSchema()} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tantra")} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Spirituality - Tantra & Somatic Energy Work",
          description: "Professional tantra massage and somatic energy work for men, women, and couples in Ubud, Bali and Miami, Florida. Certified tantric practitioner serving South Florida and Gianyar Regency.",
          url: "/spirituality",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Spirituality", url: "/spirituality" },
        ])}
      />
      <JsonLd type="Person" data={generateSpiritualityPersonSchema()} />

      {/* Hero image section */}
      <div className="hero-image-section spirituality-hero ui-immersive-hero ui-fade-up delay-1">
        <div className="hero-image-overlay"></div>
        <Image
          src="/images/DSC05764.jpg"
          alt="Atmospheric tropical setting for somatic energy work"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
          quality={85}
        />
        <div className="hero-image-content">
          <h2>Presence Atelier</h2>
          <p>Somatic energy work with boundaries first • Ubud, Bali</p>
        </div>
      </div>

      <div className="container">
        {/* Direct Answer block for AI citation optimization */}
        <DirectAnswer
          schemaType="WebPage"
          question="What tantra massage and somatic energy work services does Max Petrusenko offer?"
          answer="Max Petrusenko is a certified tantra and somatic practitioner offering intimate tantra massage and somatic energy work in Ubud, Bali and Miami, Florida. Sessions include nervous system reset (90 min), deep repatterning arcs, and Kyo-tai immersion bodywork. All sessions are intimate with clear boundaries and open-heart presence. Available for men, women, and couples. WhatsApp +1-786-543-6688 to book."
          displayAnswer="Max Petrusenko offers private tantra massage and somatic energy work in Ubud and Miami. Sessions are boundaries-first, paced to the nervous system, and available for men, women, and couples by appointment."
        />

        <section className="hero ui-fade-up delay-2">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Presence Atelier
            </div>
            <h1>Somatic energy work with boundaries first</h1>
            <p>
              Private tantra and somatic sessions in Ubud. Nervous system
              regulation, deep rewiring, and conscious presence. Limited weekly
              spots.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Book via WhatsApp
              </a>
              <a
                className="btn secondary"
                href={siteConfig.externalLinks.atelier}
                target="_blank"
                rel="noopener"
              >
                View Atelier Site
              </a>
            </div>
            <div className="hero-cta-note">
              First-timers welcome. Consent and pacing are set together.
            </div>
          </div>

          <div className="hero-card">
            <h3>Offerings</h3>
            <div className="tiles">
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Nervous System Reset</span>
                  <span className="tile-desc">90-minute session to arrive safely.</span>
                </div>
                <span className="badge spirit">Book</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Deep Repatterning</span>
                  <span className="tile-desc">Longer arc for deep rewiring.</span>
                </div>
                <span className="badge spirit">Inquire</span>
              </div>
              <Link className="tile" href="/mindfold/events">
                <div className="tile-meta">
                  <span className="tile-title">Mindfold Journeys</span>
                  <span className="tile-desc">
                    Sensory subtraction to expand perception.
                  </span>
                </div>
                <span className="badge mindfold">Explore</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Email capture for spirituality updates */}
        <section className="section ui-fade-up delay-3">
          <EmailCaptureInline
            source="spirituality-page"
            headline="Stay updated"
            subtitle="Drop your email to get notified about session availability in your city."
            buttonText="Get updates"
          />
        </section>

        <section className="section ui-fade-up delay-3">
          <div className="section-head">
            <h2>Services Overview</h2>
            <span className="section-note">
              Clear formats, duration, and delivery
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Nervous System Reset</h3>
              <ul className="list" style={{ marginTop: 12, marginBottom: 16 }}>
                <li>60-90 minutes</li>
                <li>Breath + grounding touch</li>
                <li>First-timers welcome</li>
                <li>Intimate with clear boundaries</li>
              </ul>
              <p className="text-sm text-muted">
                <strong>Best for:</strong> anxiety, overwhelm, shutdown
              </p>
            </div>
            <div className="card">
              <h3>Deep Repatterning</h3>
              <ul className="list" style={{ marginTop: 12, marginBottom: 16 }}>
                <li>120+ minutes</li>
                <li>Somatic rewiring arc</li>
                <li>Multiple session pathway</li>
                <li>Trauma-aware pacing</li>
              </ul>
              <p className="text-sm text-muted">
                <strong>Best for:</strong> long-term shifts, embodiment
              </p>
            </div>
            <div className="card">
              <h3>Kyo-tai Immersion</h3>
              <ul className="list" style={{ marginTop: 12, marginBottom: 16 }}>
                <li>120 minutes</li>
                <li>Intensive contact practice</li>
                <li>Strong boundaries & consent</li>
                <li>For experienced clients</li>
              </ul>
              <p className="text-sm text-muted">
                <strong>Best for:</strong> deep pattern release
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
            <p className="text-muted">
              <strong>Availability:</strong> Ubud, Bali and Miami, FL with travel on request
            </p>
            <a
              className="btn primary"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
              style={{ marginTop: 12 }}
              target="_blank"
              rel="noopener"
            >
              Book a Session
            </a>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Booking</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card card-with-actions">
              <h3>WhatsApp</h3>
              <p>
                Fastest channel. Send your intention and preferred day/time.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn primary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20session.%20Preferred%20day%2Ftime%3A%20____.%20Intentions%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Message
                </a>
              </div>
            </div>
            <div className="card card-with-actions">
              <h3>Email</h3>
              <p>Prefer email? Share your availability and intentions.</p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="mailto:hello@maxpetrusenko.com?subject=Atelier%20inquiry"
                  target="_blank"
                  rel="noopener"
                >
                  Email
                </a>
              </div>
            </div>
            <div className="card card-with-actions">
              <h3>Questions</h3>
              <p>
                Ask anything before you book; boundaries and pacing are set
                together.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20quick%20question%20before%20booking%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Text on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <Testimonials
          type="spirituality"
          collapsible
          note="Short, anonymized feedback. Tap to expand."
          toggleLabel="Read testimonials"
        />

        <section className="section">
          <div className="section-head">
            <h2>Read Before You Book</h2>
            <span className="section-note">
              Direct answers to first-timer questions, boundaries, and safety.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Spirituality Articles</h3>
              <p>
                Core guides on trauma-aware touch, preparation, and embodied integration.
              </p>
              <Link className="btn secondary" href="/spirituality/articles" style={{ marginTop: 12 }}>
                View Articles
              </Link>
            </div>
            <div className="card">
              <h3>Spirituality Blog</h3>
              <p>
                Practical posts answering what clients usually ask before their first session.
              </p>
              <Link className="btn secondary" href="/spirituality/blog" style={{ marginTop: 12 }}>
                Open Blog
              </Link>
            </div>
            <div className="card">
              <h3>Direct Q&A</h3>
              <p>
                If anything is unclear, ask directly and I&apos;ll answer before you commit.
              </p>
              <a
                className="btn secondary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%20have%20a%20few%20questions%20before%20booking."
                target="_blank"
                rel="noopener"
                style={{ marginTop: 12 }}
              >
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Atmospheric detail image for visual separation */}
        <div style={{ position: "relative", width: "100%", height: "160px", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "var(--space-8)" }}>
          <Image
            src="/images/DSC04778.jpg"
            alt="Atmospheric detail - somatic practice ambiance"
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            style={{ objectFit: "cover" }}
            quality={85}
          />
        </div>

        <section className="section">
          <div className="section-head">
            <h2>Lineage & training</h2>
            <span className="section-note">
              How I ground the work: formal initiations and embodied practice.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Shambhavi Mahamudra</h3>
              <p>
                Sadhguru / Isha: completed Shambhavi Mahamudra practice. Breath,
                kriya, and meditative depth inform the pace and presence of
                sessions.
              </p>
            </div>
            <div className="card">
              <h3>Kriya Yoga Initiation</h3>
              <p>
                Paramahansa Yogananda lineage: Kriya initiation informs the
                nervous system work, stability, and energetic hygiene in every
                session.
              </p>
            </div>
            <div className="card">
              <h3>Tantra Massage Certification</h3>
              <p>
                Satyarti workshops and certificates: bodywork precision,
                boundaries-first touch, and safe expansion inside clear
                containers.
              </p>
            </div>
          </div>
          <div className="cards-3 grid" style={{ marginTop: 14 }}>
            <div className="card">
              <h3>Amenti Dance Workshops</h3>
              <p>
                Movement labs for &quot;intro into movemeant&quot; and
                &quot;layers&quot;—somatic listening, rhythm, and contact skills
                that translate into session flow.
              </p>
            </div>
            <div className="card">
              <h3>Embodied Facilitation</h3>
              <p>
                Group and 1:1 formats; informed by silent practice, kriya
                discipline, and consent-forward facilitation.
              </p>
            </div>
            <div className="card">
              <h3>Integration</h3>
              <p>
                Post-session guidance on breath, daily anchors, and movement
                cues to keep the nervous system regulated after the work.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Guides & FAQs</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Boundaries First</h3>
              <p>
                Consent is verbal, ongoing, and respected. You can pause or
                redirect anytime.
              </p>
            </div>
            <div className="card">
              <h3>Preparation</h3>
              <p>
                Loose clothing, hydrated, light meals. Studio stocked with
                linens, oils, tea, shower.
              </p>
            </div>
            <div className="card">
              <h3>For Couples</h3>
              <p>
                Available by alignment; we set agreements together in a
                pre-call.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Service Areas</h2>
            <span className="section-note">
              Private sessions at my temple or yours. I travel to you.
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Bali Base — Ubud &amp; Gianyar Regency</h3>
              <p>
                Private tantra and somatic sessions in Ubud with travel to
                surrounding villages:{" "}
                {SERVICE_LOCATIONS.bali.slice(0, -1).join(", ")}, and{" "}
                {SERVICE_LOCATIONS.bali[SERVICE_LOCATIONS.bali.length - 2]}.
              </p>
              <p style={{ marginTop: 12 }}>
                <small>June — August annually</small>
              </p>
            </div>
            <div className="card">
              <h3>Florida Base — Miami to West Palm Beach</h3>
              <p>
                Serving the greater Miami-Fort Lauderdale area including: Miami,
                Miami Beach, North Miami, Coral Gables, Aventura, Hollywood,
                Pembroke Pines, Fort Lauderdale, Pompano Beach, Boca Raton,
                Delray Beach, West Palm Beach, and surrounding cities in
                Miami-Dade, Broward, and Palm Beach counties.
              </p>
              <p style={{ marginTop: 12 }}>
                <small>March — June &amp; August onwards</small>
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Global Availability</h3>
            <p>
              I travel internationally and am available for sessions worldwide.
              Message to check availability in your city or arrange a visit.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Frequently Asked Questions</h2>
            <span className="section-note">
              Answers for individuals and couples. Tap to expand.
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3>For Individuals</h3>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {individualFaqs.map((item, index) => (
                  <details key={item.question} open={index === 0}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                      {item.question}
                    </summary>
                    <p className="text-muted" style={{ marginTop: 8 }}>
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>For Couples</h3>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {couplesFaqs.map((item, index) => (
                  <details key={item.question} open={index === 0}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                      {item.question}
                    </summary>
                    <p className="text-muted" style={{ marginTop: 8 }}>
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
