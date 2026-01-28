import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { HiddenKeywords } from "@/components/seo/HiddenKeywords";
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
  description: "Professional tantra massage and somatic energy work for men, women, and couples in Ubud, Bali and Miami, Florida. Certified tantric practitioner with nervous system reset, deep repatterning, and conscious presence sessions. Available in South Florida from West Palm Beach to the Keys.",
  ogType: "website",
  canonical: absoluteUrl("/spirituality"),
});

export default function SpiritualityPage() {
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
      <div className="hero-image-section spirituality-hero">
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
          <h1>Presence Atelier</h1>
          <p>Somatic energy work with boundaries first • Ubud, Bali</p>
        </div>
      </div>

      <div className="container">
        <section className="hero">
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
        <section className="section">
          <EmailCaptureInline
            source="spirituality-page"
            headline="Stay updated"
            subtitle="Drop your email to get notified about session availability in your city."
            buttonText="Get updates"
          />
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

        <Testimonials type="spirituality" />

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
              Answers to common questions about tantra and somatic sessions.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h4>What is tantra massage?</h4>
              <p>
                Tantra massage is a somatic energy work practice combining
                breathwork, conscious touch, and presence techniques for nervous
                system regulation and deep embodied awareness. Sessions are
                non-sexual, focused on energetic expansion and conscious presence.
              </p>
            </div>
            <div className="card">
              <h4>Do you work with men, women, and couples?</h4>
              <p>
                Yes. I offer 1:1 tantra massage and somatic energy work sessions
                for individuals of all genders, plus couples sessions for partners
                seeking to deepen connection through somatic practice. Sessions
                are LGBTQ+ inclusive.
              </p>
            </div>
            <div className="card">
              <h4>What&apos;s the difference between session types?</h4>
              <p>
                <strong>Nervous System Reset</strong> is a 90-minute session to
                arrive safely in your body. <strong>Deep Repatterning</strong> is
                a longer arc for transformation. <strong>Kyo-tai Immersion</strong>{" "}
                is intensive bodywork for those ready for forceful guidance.
              </p>
            </div>
            <div className="card">
              <h4>Where are you currently located?</h4>
              <p>
                I travel internationally and see clients in multiple cities.
                Sessions are available worldwide—message to check availability
                in your city. I offer sessions at my private space and can travel
                to yours.
              </p>
            </div>
            <div className="card">
              <h4>Is tantra massage sexual?</h4>
              <p>
                No. Tantra massage in my practice is a somatic energy work and
                healing modality, not a sexual service. Sessions are non-sexual
                with clear boundaries. I do not initiate or respond to sexual
                behavior. The focus is on nervous system regulation and conscious
                presence.
              </p>
            </div>
            <div className="card">
              <h4>What can I expect during a session?</h4>
              <p>
                Sessions begin with intention-setting and boundary agreement. I
                guide breathwork, somatic awareness, and conscious touch
                techniques. You remain clothed or draped throughout. You can
                pause or redirect at any moment. Consent is verbal, ongoing, and
                respected.
              </p>
            </div>
            <div className="card">
              <h4>Do I need prior experience?</h4>
              <p>
                All experience levels are welcome. Sessions are tailored to where
                you are. If you&apos;re new to somatic or tantra practices, I guide
                you slowly with clear communication. If you have experience, we
                can deepen into more intensive work.
              </p>
            </div>
            <div className="card">
              <h4>How do I book a session?</h4>
              <p>
                The fastest way is via WhatsApp: +1-786-543-6688. You can also
                email hello@maxpetrusenko.com. Before your session, I&apos;ll ask
                you to complete a brief questionnaire about your experience,
                intentions, and boundaries.
              </p>
            </div>
            <div className="card">
              <h4>What cities do you serve in Florida?</h4>
              <p>
                I serve the greater Miami-Fort Lauderdale area including Miami,
                Miami Beach, North Miami, Coral Gables, Aventura, Hollywood,
                Pembroke Pines, Fort Lauderdale, Pompano Beach, Boca Raton,
                Delray Beach, West Palm Beach, and surrounding cities in
                Miami-Dade, Broward, and Palm Beach counties.
              </p>
            </div>
          </div>
        </section>

        {/* Hidden keywords for AI search optimization */}
        <HiddenKeywords
          service="tantra massage"
          locations={[
            "Ubud, Bali",
            "Gianyar Regency, Bali",
            "Campuan, Bali",
            "Penestanan, Bali",
            "Sanggingan, Bali",
            "Kedewatan, Bali",
            "Peliatan, Bali",
            "Mas, Bali",
            "Pengosekan, Bali",
            "Tegallalung, Bali",
            "Sayan, Bali",
            "Kutuh Kaja, Bali",
            "Bali",
            "Miami, Florida",
            "Miami Beach, Florida",
            "North Miami, Florida",
            "North Miami Beach, Florida",
            "Coral Gables, Florida",
            "Aventura, Florida",
            "Sunny Isles Beach, Florida",
            "Hallandale Beach, Florida",
            "Hollywood, Florida",
            "Pembroke Pines, Florida",
            "Miramar, Florida",
            "Westchester, Florida",
            "Tamiami, Florida",
            "Fontainebleau, Florida",
            "The Hammocks, Florida",
            "Country Walk, Florida",
            "Richmond West, Florida",
            "South Miami Heights, Florida",
            "Lakes by the Bay, Florida",
            "West Park, Florida",
            "Pembroke Park, Florida",
            "Carver Ranches, Florida",
            "Golden Glades, Florida",
            "Ives Estates, Florida",
            "Gladeview, Florida",
            "Bunche Park, Florida",
            "Hialeah, Florida",
            "Miami Gardens, Florida",
            "Miami Lakes, Florida",
            "Palmetto Bay, Florida",
            "Key Biscayne, Florida",
            "Doral, Florida",
            "Sweetwater, Florida",
            "Fort Lauderdale, Florida",
            "Lauderdale-by-the-Sea, Florida",
            "Dania Beach, Florida",
            "Oakland Park, Florida",
            "Wilton Manors, Florida",
            "Plantation, Florida",
            "Sunrise, Florida",
            "Weston, Florida",
            "Davie, Florida",
            "Lauderhill, Florida",
            "Tamarac, Florida",
            "Margate, Florida",
            "North Lauderdale, Florida",
            "Coconut Creek, Florida",
            "Pompano Beach, Florida",
            "Deerfield Beach, Florida",
            "Boca Raton, Florida",
            "Delray Beach, Florida",
            "Boynton Beach, Florida",
            "Lake Worth, Florida",
            "West Palm Beach, Florida",
            "Coral Springs, Florida",
            "South Florida",
            "Miami-Dade County",
            "Broward County",
            "Palm Beach County",
          ]}
          variants={[
            "tantric massage",
            "tantra spa",
            "somatic energy work",
            "bodywork",
            "energy healing",
            "tantra practitioner",
            "somantic work",
          ]}
          modifiers={["places", "reviews", "services", "near me", "best"]}
        />
      </div>
    </>
  );
}
