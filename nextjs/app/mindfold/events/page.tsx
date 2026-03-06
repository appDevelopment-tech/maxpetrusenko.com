import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateMindfoldEventSchema,
  generateScheduleActionSchema,
  generateMindfoldFAQSchema,
} from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Mindfold Sanctuary | Events",
  description: "Upcoming Mindfold Sanctuary events, waivers, updates, and booking links.",
  ogType: "website",
  canonical: absoluteUrl("/mindfold/events"),
});

export default function MindfoldEventsPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Mindfold Sanctuary | Events",
          description: "Blindfolded presence journeys and events. All links for upcoming Mindfold experiences.",
          url: "/mindfold/events",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Mindfold", url: "/mindfold/events" },
        ])}
      />
      <JsonLd type="Event" data={generateMindfoldEventSchema()} />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("mindfold")} />
      <JsonLd type="FAQPage" data={generateMindfoldFAQSchema()} />

      <div className="hero-image-section ui-immersive-hero ui-fade-up delay-1">
        <div className="hero-image-overlay"></div>
        <Image
          src="/images/bali/DSC05052.jpg"
          alt="Mindfold immersive event atmosphere"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
          quality={86}
        />
        <div className="hero-image-content">
          <h1>Mindfold Sanctuary</h1>
          <p>Blindfolded presence journeys and events</p>
        </div>
      </div>

      <div className="container">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot"></span> Mindfold Sanctuary
            </div>
            <h1>Blindfolded presence journeys & events</h1>
            <p>
              All links for upcoming Mindfold experiences: dates, waivers, code of
              conduct, and how to get updates. Reach out to reserve your spot.
            </p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20next%20Mindfold%20event.%20City%3A%20____.%20Date%3A%20____.%20Questions%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Join via WhatsApp
              </a>
              <a
                className="btn secondary"
                href="https://form.jotform.com/242798411650965"
                target="_blank"
                rel="noopener"
              >
                Fill Waiver
              </a>
            </div>
            <div className="hero-cta-note">
              Upcoming dates announced through WhatsApp and text updates.
            </div>
          </div>

          <div className="hero-card">
            <h3>Quick links</h3>
            <div className="tiles">
              <a
                className="tile"
                href="https://form.jotform.com/242798411650965"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">Waiver</span>
                  <span className="tile-desc">Required before attending.</span>
                </div>
                <span className="badge mindfold">Complete</span>
              </a>
              <a className="tile" href="#updates">
                <div className="tile-meta">
                  <span className="tile-title">Text Updates</span>
                  <span className="tile-desc">Be first to know dates.</span>
                </div>
                <span className="badge mindfold">Join</span>
              </a>
              <a
                className="tile"
                href="https://patreon.com/mindfold"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">Memberships</span>
                  <span className="tile-desc">Support & member perks.</span>
                </div>
                <span className="badge mindfold">Patreon</span>
              </a>
              <a
                className="tile"
                href="https://mindfold.canny.io/feedback"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">Feedback</span>
                  <span className="tile-desc">Share requests or ideas.</span>
                </div>
                <span className="badge mindfold">Add</span>
              </a>
              <a
                className="tile"
                href="https://www.instagram.com/p/C9ivYB1u2-6/"
                target="_blank"
                rel="noopener"
              >
                <div className="tile-meta">
                  <span className="tile-title">Mindfold live</span>
                  <span className="tile-desc">
                    100 people at a music festival learning how to feel.
                  </span>
                </div>
                <span className="badge mindfold">Watch</span>
              </a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Upcoming sessions</h2>
            <span className="section-note">
              Ask for next date or request a private journey.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Group journey</h3>
              <p>
                Drop into presence with sensory subtraction. Location shared after
                RSVP.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn primary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20the%20next%20Mindfold%20group%20journey.%20City%2Fdates%20that%20work%20for%20me%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  RSVP
                </a>
                <a
                  className="btn secondary"
                  href="https://form.jotform.com/242798411650965"
                  target="_blank"
                  rel="noopener"
                >
                  Waiver
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Private / corporate</h3>
              <p>
                Request a custom session for your team or small group; we align
                on setting and pacing together.
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a
                  className="btn secondary"
                  href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20private%20Mindfold%20journey.%20Group%20size%3A%20____.%20Preferred%20date%2Fcity%3A%20____.%20Notes%3A%20____."
                  target="_blank"
                  rel="noopener"
                >
                  Inquire
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Stay in the loop</h3>
              <p>Get text updates when new dates drop. Reply STOP anytime.</p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a className="btn secondary" href="#updates">
                  Join updates
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Guides & resources</h2>
            <span className="section-note">
              Read before arriving; share with friends you invite.
            </span>
          </div>
          <div className="cards-3 grid">
            <div className="card">
              <h3>Code of conduct</h3>
              <ul className="list">
                <li>Refrain from unnecessary talking during workshop.</li>
                <li>
                  Take care of yourself and others. No lifts; keep feet low if
                  walking.
                </li>
                <li>
                  When blindfolded, avoid large steps; crawling/rolling is
                  welcome.
                </li>
                <li>Stay attuned; move slowly around others.</li>
                <li>
                  If you touch a private area inadvertently, don&apos;t linger.
                </li>
                <li>
                  Respect verbal and nonverbal consent; this is a non-sexual
                  space.
                </li>
                <li>
                  No intoxicants, scents, or jewelry/watches. Devices off.
                </li>
                <li>No smoking or alcohol before the event.</li>
              </ul>
              <div className="hero-actions" style={{ marginTop: 14 }}>
                <a
                  className="btn secondary"
                  href="https://blindfold.maxpetrusenko.com/code-of-conduct"
                  target="_blank"
                  rel="noopener"
                >
                  Full conduct
                </a>
              </div>
            </div>
            <div className="card">
              <h3>Prep & practice</h3>
              <p>
                Arrive 10 minutes early, wear comfortable clothing, light meal,
                hydrate. Short guided meditations to land:
              </p>
              <ul className="list" style={{ marginTop: 10 }}>
                <li>
                  <a
                    href="https://www.youtube.com/watch?v=LClUFbijH4c"
                    target="_blank"
                    rel="noopener"
                  >
                    1-minute guided
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/watch?v=rStafj2SCn0"
                    target="_blank"
                    rel="noopener"
                  >
                    5-minute guided
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/watch?v=bIOwHvunqTo"
                    target="_blank"
                    rel="noopener"
                  >
                    10-minute guided
                  </a>
                </li>
              </ul>
            </div>
            <div className="card">
              <h3>Stay connected</h3>
              <ul className="list">
                <li>
                  <a
                    href="https://www.instagram.com/blindfold.miami"
                    target="_blank"
                    rel="noopener"
                  >
                    Instagram
                  </a>{" "}
                  for photos and drops.
                </li>
                <li>
                  <a
                    href="https://medium.com/dare-to-be-better/12-reasons-to-try-blindfold-contact-jam-a-dance-with-your-inner-self-3f94242d801a"
                    target="_blank"
                    rel="noopener"
                  >
                    12 reasons to try Blindfold
                  </a>
                  .
                </li>
                <li>
                  <a
                    href="https://patreon.com/mindfold"
                    target="_blank"
                    rel="noopener"
                  >
                    Memberships
                  </a>{" "}
                  for member circles.
                </li>
                <li>
                  <a
                    href="https://mindfold.canny.io/feedback"
                    target="_blank"
                    rel="noopener"
                  >
                    Leave feedback
                  </a>{" "}
                  or feature requests.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Mindfold FAQ</h2>
            <span className="section-note">
              Clear expectations, boundaries, and what to bring.
            </span>
          </div>
          <div className="cards-3 grid">
            <details className="faq-item card">
              <summary>What is a Mindfold journey?</summary>
              <p>
                A blindfolded presence practice for groups. With sensory subtraction
                and slow movement, participants drop into embodied awareness in a
                non-verbal, non-sexual container.
              </p>
            </details>
            <details className="faq-item card">
              <summary>Is it safe for first-timers?</summary>
              <p>
                Yes. We start with safety guidance, consent agreements, and clear
                opt-outs. You can pause or step out at any time.
              </p>
            </details>
            <details className="faq-item card">
              <summary>What should I bring or wear?</summary>
              <p>
                Comfortable clothing and water. Arrive 10 minutes early. No perfumes,
                jewelry, or intoxicants. Phones stay off.
              </p>
            </details>
            <details className="faq-item card">
              <summary>Is Mindfold sexual?</summary>
              <p>
                No. Mindfold is non-sexual. The focus is nervous system regulation,
                embodied awareness, and respectful boundaries.
              </p>
            </details>
            <details className="faq-item card">
              <summary>Where are events held?</summary>
              <p>
                Locations vary by city and are shared after RSVP. Events are hosted
                in calm, private spaces with clear guidelines.
              </p>
            </details>
            <details className="faq-item card">
              <summary>How do I get updates?</summary>
              <p>
                Join the text updates form below or message on WhatsApp to get the
                next date and location.
              </p>
            </details>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>See it in action</h2>
            <span className="section-note">
              100 people at a music festival learning how to feel.
            </span>
          </div>
          <a
            className="embed-image"
            href="https://www.instagram.com/p/C9ivYB1u2-6/"
            target="_blank"
            rel="noopener"
            aria-label="Watch Mindfold live session"
          >
            <Image
              src="https://static.wixstatic.com/media/f6c00d_70158acbc6524e2ca139603802c01494f000.jpg/v1/fill/w_720,h_402,al_c,q_80,enc_avif,quality_auto/f6c00d_70158acbc6524e2ca139603802c01494f000.jpg"
              alt="Mindfold live session at a music festival"
              width={720}
              height={402}
            />
          </a>
        </section>

        <section className="section" id="updates">
          <div className="section-head">
            <h2>Text updates</h2>
            <span className="section-note">
              Get Mindfold Sanctuary event texts. Reply STOP anytime.
            </span>
          </div>
          <div
            style={{
              background:
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: 18,
              borderRadius: 15,
              color: "white",
              textAlign: "center",
              margin: "0 auto",
              maxWidth: 760,
              width: "100%",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: 18,
                fontWeight: 300,
              }}
            >
              Mindfold Sanctuary Text Updates
            </h3>
            <form
              action="https://docs.google.com/forms/d/e/1FAIpQLSca1rppS7ebqX8_po5aIVJS8IuQWwKv51x2ZatRDKKyFQ9g7A/formResponse"
              method="POST"
              target="_blank"
            >
              <input
                type="tel"
                name="entry.292183109"
                placeholder="Phone number"
                required
                style={{
                  width: "100%",
                  padding: 12,
                  margin: "8px 0",
                  border: "none",
                  borderRadius: 25,
                  textAlign: "center",
                  fontSize: 16,
                }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  fontSize: 11,
                  lineHeight: 1.4,
                  cursor: "pointer",
                  marginTop: 12,
                  textAlign: "left",
                }}
              >
                <input
                  type="checkbox"
                  name="entry.901918916"
                  value="Yes, I consent to receive SMS updates"
                  required
                  style={{ margin: "2px 6px 0 0" }}
                />
                <span>
                  I agree to receive text messages from Mindfold Sanctuary about
                  events & workshops. Msg & data rates may apply. Reply STOP to
                  opt-out.
                </span>
              </label>
              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "#ff6b6b",
                  color: "white",
                  padding: 12,
                  border: "none",
                  borderRadius: 25,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 16,
                  margin: "15px 0 8px 0",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 15px rgba(255,107,107,0.3)",
                }}
              >
                Join the Journey
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
