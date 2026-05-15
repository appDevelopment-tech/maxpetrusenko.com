import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { InstagramEmbed } from "@/components/motion/InstagramEmbed";
import { LivingTestimonials } from "@/components/motion/LivingTestimonials";
import { FloatingOrbs } from "@/components/motion/AmbientFloat";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { FaqSection } from "@/components/shared/FaqSection";

export const metadata = generateMetadata({
  title: "Somatic Practice - Nervous System Regulation & Energy Work",
  description: "Private somatic sessions and tantra massage for founders, creators, and seekers. Nervous system reset, deep repatterning, and conscious presence. Book worldwide.",
  ogType: "website",
  canonical: absoluteUrl("/somatic"),
});

export default function SomaticPage() {
  return (
    <>
      <JsonLd type="Organization" data={generateOrganizationSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Somatic Practice - Nervous System Regulation & Energy Work",
          description: "Private somatic sessions for founders and creators. Nervous system reset, tantra massage, and energy work.",
          url: "/somatic",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Somatic", url: "/somatic" },
        ])}
      />

      {/* Hero portrait background */}
      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <FloatingOrbs color="rgba(14, 97, 93, 0.06)" count={2} />
          <Image
            src="/images/DSC05764.jpg"
            alt="Professional somatic sessions in a calming natural environment"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            quality={85}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
      </div>

      <div className="container">
        <section className="hero ui-fade-up delay-1">
          <div className="hero-text">
            <div className="blur-in section-eyebrow text-[var(--accent-spirit)]">
              Somatic Practice
            </div>
            <h1 className="clip-reveal clip-reveal-d1">Nervous system regulation for people who lead, create, and need to feel again</h1>
            <p>
              Private tantra and somatic sessions for founders, artists, and seekers.
              Expect focused touch, energetic attunement, and a space built for deep
              rewiring.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20inquiry%20list.%20I%27m%20exploring%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Join inquiry list
              </a>
              <Link className="btn secondary" href="/spirituality">
                Learn More
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h3>Session Types</h3>
            <div className="tiles">
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Nervous System Reset</span>
                  <span className="tile-desc">60 minutes • Grounding & regulation</span>
                </div>
                <span className="badge spirit">Gentle</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Tantra-Informed Practice</span>
                  <span className="tile-desc">By request • Inquiry first</span>
                </div>
                <span className="badge spirit">Deep</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Kyo-tai Immersion</span>
                  <span className="tile-desc">120 minutes • Forceful guidance</span>
                </div>
                <span className="badge spirit">Intense</span>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: "0.9em" }}>
              Availability and format are confirmed privately by request.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>The Practice</h2>
            <span className="section-note">
              Somatic energy work grounded in lineage and formal training.
            </span>
          </div>
          <div className="cards-3 grid">
            <Link className="card card-with-actions" href="/somatic/approach">
              <h3>Approach</h3>
              <p>
                Boundaries-first somatic work. Consent is verbal, ongoing, and
                respected in every moment.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <span className="btn secondary sm">Learn more</span>
              </div>
            </Link>
            <Link className="card card-with-actions" href="/somatic/modalities">
              <h3>Modalities</h3>
              <p>
                Nervous system reset, tantra massage, and Kyo-tai immersion for
                different depths of work.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <span className="btn secondary sm">Explore</span>
              </div>
            </Link>
            <Link className="card card-with-actions" href="/somatic/training">
              <h3>Lineage & Training</h3>
              <p>
                Shambhavi Mahamudra, Kriya Yoga initiation, Tantra Massage
                certification, and embodied facilitation.
              </p>
              <div className="card-actions-spacer"></div>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <span className="btn secondary sm">View</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Session Types</h2>
            <span className="section-note">
              Choose your depth. Each session is customized to your nervous
              system and intentions.
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Nervous System Reset (60 min)</h3>
              <p>
                Grounding bodywork to discharge stress, regulate your breath, and
                restore circulation. Ideal for first-timers or those needing a
                gentle return to presence.
              </p>
              <ul className="list" style={{ marginTop: 12 }}>
                <li>Guided down-regulation and breath</li>
                <li>Somatic release for shoulders, spine, and hips</li>
                <li>Closing integration + home ritual</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                <strong>90% of clients report better sleep same night</strong>
              </p>
            </div>
            <div className="card">
              <h3>Tantra-Informed Somatic Practice</h3>
              <p>
                Breath, presence, boundaries, and somatic re-patterning for
                embodied awareness. Consent-led boundary mapping with energy work.
              </p>
              <ul className="list" style={{ marginTop: 12 }}>
                <li>Consent-led boundary mapping</li>
                <li>Energy channel work + breath pacing</li>
                <li>Post-session grounding tea + reflection</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                <strong>Deepens connection and self-awareness</strong>
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Kyo-Tai Immersion (120 min) — For facilitators and practitioners</h3>
            <p>
              Kyo means "shared/common" and tai means "body"—two bodies becoming
              one integrated system. Somatic unwinding, fascia melt, and
              contact-based Ki transmission for full-system rewiring.
            </p>
            <p style={{ marginTop: 12 }}>
              <strong>
                Intense contact practice for those ready for forceful guidance,
                not gentle massage.
              </strong>
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>How Sessions Work</h2>
            <span className="section-note">
              Grounded, clear, and intentional. Nothing rushed, nothing left
              vague.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <div className="eyebrow">01</div>
              <h3>Arrival + Intention</h3>
              <p>
                We co-create a boundary map, tune your breath, and set an
                intention for the session. Expect clarity before touch.
              </p>
            </div>
            <div className="card">
              <div className="eyebrow">02</div>
              <h3>Deep Body + Energy</h3>
              <p>
                Somatic release meets subtle energy attunement. No choreography—
                every movement is guided by how your body responds.
              </p>
            </div>
            <div className="card">
              <div className="eyebrow">03</div>
              <h3>Integration</h3>
              <p>
                Re-ground with tea, reflection prompts, and a take-home practice.
                You leave regulated, present, and resourced.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Inquiry</h2>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>WhatsApp</h3>
              <p>Fastest channel. Send a few words about what you’re exploring.</p>
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
            <div className="card">
              <h3>Email</h3>
              <p>Prefer email? Share what you’re exploring and the best way to reply.</p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="mailto:hello@maxpetrusenko.com?subject=Somatic%20session%20inquiry"
                  target="_blank"
                  rel="noopener"
                >
                  Email
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Questions First?</h3>
              <p>Ask anything before you book. Boundaries and pacing are set together.</p>
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

        {/* Contact Improv - Instagram Reel Section */}
        <ScrollReveal>
          <section className="section">
            <div className="section-head">
              <h2>Contact Improv & Embodied Practice</h2>
              <span className="section-note">
                Movement. Connection. Presence. Sometimes bananas, sometimes pancakes.
              </span>
            </div>
            <div className="max-w-md mx-auto">
              <InstagramEmbed
                url="https://www.instagram.com/reel/DVjMRgUDv0P/"
                caption="We danced. We practiced. We rolled across the floor. Sometimes we were bananas. Sometimes we were pancakes. We laughed, we listened, we moved together. A beautiful night of contact improvisation."
              />
            </div>
            <p className="text-center text-sm text-[var(--muted)] mt-4 italic">
              Contact improv is about presence — listening through weight, momentum, and touch.
              My somatic work draws from this practice: attuning to what emerges, moment by moment.
            </p>
          </section>
        </ScrollReveal>

        {/* Living Testimonials */}
        <ScrollReveal delay={200}>
          <section className="section">
            <div className="section-head">
              <h2>Client Experiences</h2>
              <span className="section-note">
                Real words from real sessions. No cherry-picking.
              </span>
            </div>
            <div className="max-w-2xl mx-auto">
              <LivingTestimonials />
            </div>
          </section>
        </ScrollReveal>

        <section className="section">
          <div className="section-head">
            <h2>Frequently Asked Questions</h2>
          </div>
          <FaqSection
            columns={3}
            items={[
              {
                question: "Is this suitable for first-timers?",
                answer:
                  "Absolutely. We begin with breath, boundaries, and intention. The 60-minute Reset is perfect to arrive in your body without overwhelm if you're new to somatic or tantra practices.",
              },
              {
                question: "How do you handle boundaries and consent?",
                answer:
                  "We map what is welcomed and what is not before any touch. Consent is verbal, ongoing, and respected in every moment. You can pause or redirect anytime.",
              },
              {
                question: "What should I bring or prepare?",
                answer:
                  "Wear loose clothing, arrive hydrated, and avoid heavy meals for 2 hours beforehand. The studio is stocked with linens, oils, tea, and a private shower.",
              },
              {
                question: "Do you work with couples?",
                answer:
                  "Yes, I facilitate couple tantra and energy sessions when intentions are aligned. We run a 15-minute pre-call to set agreements and comfort levels.",
              },
              {
                question: "Where are you currently located?",
                answer:
                  "Private sessions are paused for now. Message with a few words about what you’re exploring to ask about fit and format options.",
              },
              {
                question: "What are the boundaries?",
                answer:
                  "Tantra massage in my practice is a somatic energy work and healing modality. Sessions are shaped around clear agreements and respectful boundaries.",
              },
            ]}
          />
        </section>
      </div>
    </>
  );
}
