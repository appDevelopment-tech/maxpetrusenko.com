import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { EmailCaptureInline } from "@/components/forms/EmailCaptureInline";
import { SomaticIntakeTool } from "@/components/forms/SomaticIntakeTool";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { FaqSection } from "@/components/shared/FaqSection";
import {
  generateOrganizationSchema,
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateProfessionalServiceSchema,
  generateFAQSchema,
  generateSpiritualityPersonSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Spirituality - Tantra & Somatic Energy Work",
  description: "Tantra-informed somatic work for nervous-system regulation, intimacy, and embodied presence. Private sessions are paused for now.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality"),
  keywords: [
    "tantra-informed somatic work",
    "somatic energy work",
    "energy work practitioner",
    "nervous system regulation",
    "breathwork",
    "shadow work",
    "tantra-informed somatic work",
    "Tantra Nectar University",
    "Satyarti certified",
    "couples tantra",
    "trauma-informed bodywork",
  ],
});

export default function SpiritualityPage() {
  const individualFaqs = [
    {
      question: "What is tantra-informed somatic practice?",
      answer:
        "Tantra-informed somatic practice combines breathwork, conscious touch, meditation, and presence techniques for nervous system regulation and embodied awareness. It is boundaries-led and consent-led throughout.",
    },
    {
      question: "What are the boundaries?",
      answer:
        "The work is consent-led and shaped around clear agreements. The focus is presence, regulation, boundaries, and embodied awareness.",
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
        "Private sessions are paused for now. Message with a few words about what you’re exploring. No calendar slots are open right now; format can be discussed only if the practice reopens.",
    },
    {
      question: "How do I request availability?",
      answer:
        "Text or email with a few words about what you are exploring. There are no calendar slots open right now; fit and format can be discussed only if the practice reopens.",
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
      <JsonLd type="WebPage" data={generateProfessionalServiceSchema()} />
      <JsonLd type="FAQPage" data={generateFAQSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Spirituality - Tantra & Somatic Energy Work",
          description: "Tantra-informed somatic work for nervous-system regulation, intimacy, and embodied awareness. Private sessions are paused for now.",
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

      {/* Hero portrait background */}
      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC05764.jpg"
            alt="Atmospheric tropical setting for somatic energy work"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            quality={85}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(14,97,93,0.2)] px-4 py-1 text-xs font-semibold text-[var(--accent-spirit)]">
              Private sessions paused for now
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Somatic energy work with boundaries first.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[460px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Tantra-informed somatic work for nervous-system regulation, intimacy,
              and embodied presence. Sessions are not open for direct booking right now.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Join inquiry list
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-spirit)]"
                href={siteConfig.externalLinks.atelier}
                target="_blank"
                rel="noopener"
              >
                View Atelier Site
              </a>
            </div>
          </div>
        </section>
      </div>

      <DirectAnswer
        schemaType="WebPage"
        showUi={false}
        question="What tantra-informed somatic and energy work does Max Petrusenko offer?"
        answer="Max Petrusenko is a certified tantra and somatic practitioner offering tantra-informed somatic work for nervous-system regulation, intimacy, and embodied presence. Private sessions are paused for now, paced with clear boundaries, and shaped around what is alive for the client. No calendar slots are open right now."
        displayAnswer="Tantra-informed somatic work by request. Boundaries first, nervous-system paced, and shaped around what is alive now."
      />

      <DirectAnswer
        schemaType="WebPage"
        showUi={false}
        question="What is somatic energy work and who practices it near me?"
        answer="Somatic energy work is a body-based practice using breathwork, conscious touch, and presence techniques for nervous system regulation and embodied awareness. Max Petrusenko holds a Tantra Massage Certification from Tantra Nectar University (Satyarti). No calendar slots are open right now. You can send an inquiry by text: +1-786-543-6688."
        displayAnswer="Somatic energy work for nervous system regulation and embodied awareness. Private sessions paused for now."
      />

      <section className="dark-zone mt-8 py-16 px-4 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(14,97,93,0.16),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(210,163,93,0.1),transparent_30%),linear-gradient(145deg,#0e1520_0%,#152126_58%,#1b2f34_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-spirit)]">Session focus</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Presence, pacing, and clear boundaries
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Sessions are trauma-aware and paced to your nervous system.
            First-timers welcome. Men, women, and couples by request.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="dark-zone-card card-stripe-spirit">
              <h3 className="font-serif text-[1.35rem] font-semibold text-[#e2e8f0]">Offerings</h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-sm font-semibold text-[#e2e8f0]">Nervous System Reset</p>
                  <p className="mt-1 text-sm text-[var(--dark-zone-muted)]">90-minute session to arrive safely.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-sm font-semibold text-[#e2e8f0]">Deep Repatterning</p>
                  <p className="mt-1 text-sm text-[var(--dark-zone-muted)]">Longer arc for deep rewiring.</p>
                </div>
                <Link className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20" href="/mindfold/events">
                  <p className="text-sm font-semibold text-[#e2e8f0]">Mindfold Journeys</p>
                  <p className="mt-1 text-sm text-[var(--dark-zone-muted)]">Sensory subtraction to expand perception.</p>
                </Link>
              </div>
            </div>

            <div className="dark-zone-card card-stripe-spirit">
              <h3 className="font-serif text-[1.35rem] font-semibold text-[#e2e8f0]">What to expect</h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--dark-zone-muted)]">
                Consent-led intake, clear boundaries, guided pacing, and space to land.
                No performance pressure. Just steady presence and embodied attention.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Boundaries first</span>
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Trauma-aware pacing</span>
                <span className="rounded-md bg-[rgba(14,97,93,0.15)] px-2.5 py-1 text-[0.7rem] font-semibold text-[#2eb8a8]">Private sessions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">

        {/* Email capture for spirituality updates */}
        <section className="section ui-fade-up delay-3">
          <EmailCaptureInline
            source="spirituality-page"
            headline="Stay updated"
            subtitle="Drop your email to get notified about future offerings and practice updates."
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
              <strong>Availability:</strong> private sessions by request
            </p>
            <a
              className="btn primary"
              href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____."
              style={{ marginTop: 12 }}
              target="_blank"
              rel="noopener"
            >
              Join inquiry list
            </a>
          </div>
        </section>

        <section className="section ui-fade-up delay-3">
          <SomaticIntakeTool />
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Inquiry</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card card-with-actions">
              <h3>WhatsApp</h3>
              <p>
                Send a few words about what you’re exploring. I’ll reply only if there is a real fit; no sessions are open for direct booking right now.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn primary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Message
                </a>
              </div>
            </div>
            <div className="card card-with-actions">
              <h3>Email</h3>
              <p>Prefer email? Share what you’re exploring and the best way to reply.</p>
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
                Ask anything before requesting availability; boundaries and pacing are set
                together.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20quick%20question%20about%20the%20practice%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Join inquiry list
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
            <h2>Read Before You Request Availability</h2>
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
                Send an inquiry
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
              <h3>Tantra Nectar University Certification</h3>
              <p>
                Tantra Nectar University (Satyarti) certified: bodywork
                precision, boundaries-first touch, and safe expansion
                inside clear containers.
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
            <h2>Availability</h2>
            <span className="section-note">
              Private sessions are paused for now.
            </span>
          </div>
          <div className="card">
            <h3>By request</h3>
            <p>
              Message with a few words about what you’re exploring. I’ll reply only if there is a real fit; no calendar slots are open right now.
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
          <h3>For Individuals</h3>
          <FaqSection items={individualFaqs} columns={2} />

          <h3 style={{ marginTop: "var(--space-6)" }}>For Couples</h3>
          <FaqSection items={couplesFaqs} columns={2} />
        </section>
      </div>
    </>
  );
}
