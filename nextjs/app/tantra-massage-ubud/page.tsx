import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { Testimonials } from "@/components/testimonials/Testimonials";
import {
  generateOrganizationSchema,
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateLocalBusinessSchemaUbud,
  generateFAQSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Tantra Massage Ubud, Bali | Professional Somatic Energy Work",
  description: "Professional tantra massage in Ubud, Bali. Available year-round for nervous system reset, trauma release, and couples tantra sessions. Fast WhatsApp response. Certified practitioner serving Campuan, Penestanan, Sanggingan, and all of Gianyar Regency.",
  ogType: "website",
  canonical: absoluteUrl("/tantra-massage-ubud"),
});

const UBD_VILLAGES = [
  "Ubud", "Campuan", "Penestanan", "Sanggingan", "Kedewatan",
  "Peliatan", "Mas", "Pengosekan", "Tegallalung", "Sayan", "Kutuh Kaja"
];

export default function TantraMassageUbudPage() {
  return (
    <>
      <JsonLd type="Organization" data={generateOrganizationSchema()} />
      <JsonLd type="LocalBusiness" data={generateLocalBusinessSchemaUbud()} />
      <JsonLd type="FAQPage" data={generateFAQSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Tantra Massage Ubud, Bali | Professional Somatic Energy Work",
          description: "Professional tantra massage in Ubud, Bali. Available year-round for nervous system reset, trauma release, and couples tantra sessions.",
          url: "/tantra-massage-ubud",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tantra Massage Ubud", url: "/tantra-massage-ubud" },
        ])}
      />

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Ubud, Bali
            </div>
            <h1>Tantra Massage Ubud — Available Now</h1>
            <p>
              Professional tantra massage and somatic energy work in Ubud, Bali.
              Available <strong>year-round</strong> with fast WhatsApp response.
              Nervous system reset, trauma release, and couples sessions.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20in%20Ubud%20and%20interested%20in%20booking%20a%20tantra%20session.%20When%20are%20you%20available%3F"
                target="_blank"
                rel="noopener"
              >
                WhatsApp for Fast Response
              </a>
              <Link className="btn secondary" href="/spirituality">
                View All Services
              </Link>
            </div>
            <div className="hero-cta-note">
              <strong>🔥 Available in Ubud today</strong> • Sessions 7 days a week • Professional team
            </div>
          </div>

          <div className="hero-card">
            <h3>Session Types</h3>
            <div className="tiles">
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Nervous System Reset</span>
                  <span className="tile-desc">90 min • IDR 2,500,000</span>
                </div>
                <span className="badge spirit">Popular</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Deep Repatterning</span>
                  <span className="tile-desc">120 min • IDR 3,500,000</span>
                </div>
                <span className="badge spirit">Deep</span>
              </div>
              <div className="tile">
                <div className="tile-meta">
                  <span className="tile-title">Couples Tantra</span>
                  <span className="tile-desc">120 min • IDR 5,000,000</span>
                </div>
                <span className="badge spirit">Partners</span>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: "0.85em", textAlign: "center" }}>
              <em>Serving all Ubud villages: {UBD_VILLAGES.slice(0, 5).join(", ")} + more</em>
            </p>
          </div>
        </section>

        {/* Availability banner */}
        <div className="urgent-cta-bar">
          <span className="urgent-icon">📍</span>
          <span><strong>Based in Ubud year-round</strong> — Professional team available 7 days a week</span>
          <a
            href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20in%20Ubud%20and%20interested%20in%20booking%20a%20tantra%20session.%20When%20are%20you%20available%3F"
            className="btn primary sm"
            target="_blank"
            rel="noopener"
          >
            Check Availability →
          </a>
        </div>

        {/* What to expect section */}
        <section className="section">
          <div className="section-head">
            <h2>What to Expect</h2>
            <span className="section-note">
              Professional tantra massage in a safe, sacred container
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>🙏 Safe Container</h3>
              <p>
                Consent-first approach with clear boundaries. You remain clothed
                or draped throughout. Every session begins with intention-setting
                and boundary agreement.
              </p>
            </div>
            <div className="card">
              <h3>🌿 Nervous System Focus</h3>
              <p>
                Unlike spa massage, tantra works with your nervous system directly.
                Breathwork, conscious touch, and energy awareness create lasting
                regulation, not just temporary relaxation.
              </p>
            </div>
            <div className="card">
              <h3>⚡ Fast Response</h3>
              <p>
                Located in Ubud with WhatsApp booking. Most inquiries answered
                within 30 minutes during business hours. Same-day sessions often
                available.
              </p>
            </div>
          </div>
        </section>

        {/* Why choose us */}
        <section className="section">
          <div className="section-head">
            <h2>Why Choose Tantra in Ubud?</h2>
            <span className="section-note">
              Ubud is the spiritual heart of Bali — the perfect setting for transformation
            </span>
          </div>
          <div className="split">
            <div className="card">
              <h3>Sacred Environment</h3>
              <p>
                Private temple space in Ubud surrounded by rice terraces and jungle.
                The setting supports deep work — away from tourist crowds, in nature&apos;s
                embrace.
              </p>
            </div>
            <div className="card">
              <h3>Year-Round Availability</h3>
              <p>
                Unlike visiting practitioners who come for season, I maintain a
                permanent base in Ubud. Available 7 days a week, year-round.
                No waiting for retreat dates.
              </p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Certified Training</h3>
            <p>
              Shambhavi Mahamudra (Isha), Kriya Yoga (Yogananda lineage), Tantra
              Massage Certification (Satyarti), Amenti Dance Workshops. This isn&apos;t
              weekend training — it&apos;s years of embodied practice.
            </p>
          </div>
        </section>

        {/* Bali location showcase with images */}
        <section className="section">
          <div className="section-head">
            <h2>The Space in Ubud</h2>
            <span className="section-note">
              Private temple space surrounded by Bali rice terraces and jungle
            </span>
          </div>
          <div className="split" style={{ alignItems: "stretch" }}>
            <div className="image-showcase-card" style={{ position: "relative", height: "400px", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <Image
                src="/images/bali/DSC04819.jpg"
                alt="Bali rice terraces near Ubud session space"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
                quality={85}
              />
            </div>
            <div className="image-showcase-card" style={{ position: "relative", height: "400px", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <Image
                src="/images/DSC05868.jpg"
                alt="Practitioner presence for tantra sessions in Ubud"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
                quality={90}
                priority
              />
            </div>
          </div>
          <div className="card" style={{ marginTop: 14, position: "relative", height: "250px", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <Image
              src="/images/bali/DSC04934.jpg"
              alt="Natural surroundings for tantra sessions in Ubud"
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              style={{ objectFit: "cover" }}
              quality={85}
            />
          </div>
          <p style={{ marginTop: 16, textAlign: "center", color: "var(--color-text-muted)" }}>
            Sessions held in private Ubud temple space • Mobile sessions available to your villa
          </p>
        </section>

        {/* Testimonials from Ubud clients */}
        <section className="section">
          <div className="section-head">
            <h2>What Clients Say</h2>
            <span className="section-note">
              Real transformations from tantra sessions in Ubud
            </span>
          </div>
          <Testimonials type="spirituality" limit={3} />
        </section>

        {/* Detailed FAQ */}
        <section className="section">
          <div className="section-head">
            <h2>Frequently Asked Questions</h2>
            <span className="section-note">
              Everything you need to know before booking tantra in Ubud
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h4>Where exactly are you located in Ubud?</h4>
              <p>
                I&apos;m based in central Ubud, Gianyar Regency. I offer sessions at my
                private temple space and can travel to your villa or hotel throughout
                Ubud and surrounding villages including Campuan, Penestanan,
                Sanggingan, Kedewatan, and more.
              </p>
            </div>
            <div className="card">
              <h4>How soon can I book a session?</h4>
              <p>
                Same-day sessions are often available. WhatsApp is the fastest way
                to check availability and book. Most inquiries are answered within
                30 minutes during business hours (9am-7pm Bali time).
              </p>
            </div>
            <div className="card">
              <h4>Is tantra massage sexual?</h4>
              <p>
                No. Tantra massage in my practice is a somatic energy work and
                healing modality. Sessions are non-sexual with clear boundaries.
                The focus is on nervous system regulation, not gratification.
              </p>
            </div>
            <div className="card">
              <h4>What should I wear/bring?</h4>
              <p>
                Wear loose, comfortable clothing. The studio provides everything:
                linens, organic oils, tea, shower facilities. Just bring yourself
                and your intentions. Arrive hydrated and avoid heavy meals 2 hours
                before.
              </p>
            </div>
            <div className="card">
              <h4>Do you work with first-timers?</h4>
              <p>
                Absolutely. Many clients are new to tantra or somatic work. Sessions
                are tailored to your experience level. If you&apos;re nervous, we start
                extra slow with clear communication throughout.
              </p>
            </div>
            <div className="card">
              <h4>What&apos;s the difference between session types?</h4>
              <p>
                <strong>Nervous System Reset</strong> (90 min) is for stress relief
                and grounding. <strong>Deep Repatterning</strong> (120 min) is for
                trauma work and lasting change. <strong>Couples Tantra</strong> (120 min)
                is for partners deepening connection.
              </p>
            </div>
            <div className="card">
              <h4>Can you come to my villa/hotel?</h4>
              <p>
                Yes, I offer mobile sessions throughout Ubud and surrounding villages.
                Additional travel fee applies depending on location. WhatsApp me your
                location for a quote.
              </p>
            </div>
            <div className="card">
              <h4>Do you offer discounts for multiple sessions?</h4>
              <p>
                Yes, package pricing available for 3+ sessions. Many clients find
                that 3-5 sessions create the most profound transformation. Ask about
                packages when you book.
              </p>
            </div>
            <div className="card">
              <h4>What forms of payment do you accept?</h4>
              <p>
                Cash (IDR), transfer to Indonesian bank, Wise transfer, or credit
                card via secure payment link. Payment is collected before the
                session begins.
              </p>
            </div>
          </div>
        </section>

        {/* Service area map */}
        <section className="section">
          <div className="section-head">
            <h2>Service Areas in Bali</h2>
            <span className="section-note">
              Professional tantra massage throughout Ubud and Gianyar Regency
            </span>
          </div>
          <div className="card">
            <h3>Villages Served from Ubud Base</h3>
            <p style={{ marginBottom: 12 }}>
              Available year-round for sessions at my private temple space or your
              villa/hotel throughout these Ubud-area villages:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {UBD_VILLAGES.map((village) => (
                <span
                  key={village}
                  style={{
                    background: "var(--accent-spirit)",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.85em",
                  }}
                >
                  {village}
                </span>
              ))}
              <span
                style={{
                  background: "var(--color-text-muted)",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "0.85em",
                }}
              >
                + All Gianyar Regency
              </span>
            </div>
            <p style={{ marginTop: 12, fontSize: "0.9em" }}>
              <strong>Travel to your location:</strong> Mobile sessions available
              throughout Ubud and surrounding areas. Small travel fee may apply
              for locations outside central Ubud.
            </p>
          </div>
        </section>

        {/* CTA section */}
        <section className="section">
          <div className="card" style={{ textAlign: "center", padding: "40px" }}>
            <h2>Ready to Book Your Tantra Session in Ubud?</h2>
            <p style={{ marginBottom: 20 }}>
              Fast WhatsApp response • Available 7 days a week • Professional year-round service
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20in%20Ubud%20and%20interested%20in%20booking%20a%20tantra%20session.%20When%20are%20you%20available%3F"
                target="_blank"
                rel="noopener"
              >
                WhatsApp: +1-786-543-6688
              </a>
              <Link className="btn secondary" href="/spirituality">
                View All Services
              </Link>
            </div>
            <p style={{ marginTop: 16, fontSize: "0.85em", color: "var(--color-text-muted)" }}>
              Or email: <a href="mailto:hello@maxpetrusenko.com">hello@maxpetrusenko.com</a>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
