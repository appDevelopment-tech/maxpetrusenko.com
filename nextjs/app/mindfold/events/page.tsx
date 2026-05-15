import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  generateWebPageSchema,
  generateBreadcrumbSchema,
  generateMindfoldEventSchema,
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
      <JsonLd type="FAQPage" data={generateMindfoldFAQSchema()} />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src="/images/DSC05764.jpg"
            alt="Mindfold immersive event atmosphere"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            quality={86}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(210,163,93,0.24)] px-4 py-1 text-xs font-semibold text-[var(--accent-mindfold)]">
              Mindfold Sanctuary
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[12ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              Blindfolded presence journeys, live.
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[520px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              Dates, waivers, code of conduct, and the fastest way to reserve your
              spot for the next Mindfold experience.
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20the%20next%20Mindfold%20event.%20City%3A%20____.%20Date%3A%20____.%20Questions%3A%20____."
                target="_blank"
                rel="noopener"
              >
                Join via WhatsApp
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-mindfold)]"
                href="https://form.jotform.com/242798411650965"
                target="_blank"
                rel="noopener"
              >
                Fill waiver
              </a>
            </div>
          </div>
        </section>
      </div>

      <section className="dark-zone mt-8 px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(210,163,93,0.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(15,126,169,0.08),transparent_30%),linear-gradient(145deg,#111826_0%,#1b1f28_58%,#2a2014_100%)]" />
        <div className="dark-zone-inner">
          <p className="section-eyebrow text-[var(--accent-mindfold)]">Before you join</p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.8vw,2.25rem)] font-semibold tracking-wide text-[#e2e8f0]">
            Reserve, sign, arrive ready.
          </h2>
          <p className="mt-2 max-w-[560px] text-[var(--dark-zone-muted)]">
            Everything needed before the next journey: waiver, updates, memberships,
            and where to send requests.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <a className="dark-zone-card card-stripe-mindfold" href="https://form.jotform.com/242798411650965" target="_blank" rel="noopener">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Waiver</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">Required before attending any live experience.</p>
            </a>
            <a className="dark-zone-card card-stripe-mindfold" href="#updates">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Text updates</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">Get new dates first and reply when a city matches.</p>
            </a>
            <a className="dark-zone-card card-stripe-mindfold" href="https://patreon.com/mindfold" target="_blank" rel="noopener">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Memberships</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">Support the project and unlock member perks.</p>
            </a>
            <a className="dark-zone-card card-stripe-mindfold" href="https://mindfold.canny.io/feedback" target="_blank" rel="noopener">
              <h3 className="font-serif text-[1.2rem] font-semibold text-[#e2e8f0]">Feedback</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dark-zone-muted)]">Share ideas, requests, and venue leads.</p>
            </a>
          </div>
        </div>
      </section>

      <div className="container">

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
                  Respect verbal and nonverbal consent; this is a clear-boundary
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
                non-verbal, clear-boundary container.
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
              <summary>What are the boundaries?</summary>
              <p>
                Mindfold centers nervous system regulation, embodied awareness,
                and respectful boundaries.
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
            className="bg-[var(--dark-zone)] card-stripe-mindfold"
            style={{
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
                  background: "var(--accent-mindfold, #f59e0b)",
                  color: "white",
                  padding: 12,
                  border: "none",
                  borderRadius: 25,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 16,
                  margin: "15px 0 8px 0",
                  transition: "all 0.3s",
                  boxShadow: "0 4px 15px rgba(245,158,11,0.3)",
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
