/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Hero Exploration 2: "Warm Depth"
 * Centered hero with portrait photo background, atmospheric layers,
 * spotlight cards, surface layering, and scroll-reveal with blur.
 */

export default function HeroExplore2() {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Spotlight card mouse tracking
    const cards = cardsRef.current?.querySelectorAll<HTMLElement>(".spotlight-card");
    if (!cards) return;
    const handlers = new Map<HTMLElement, (e: MouseEvent) => void>();
    cards.forEach((card) => {
      const handler = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", ((e.clientX - rect.left) / rect.width * 100) + "%");
        card.style.setProperty("--mouse-y", ((e.clientY - rect.top) / rect.height * 100) + "%");
      };
      handlers.set(card, handler);
      card.addEventListener("mousemove", handler);
    });
    return () => {
      cards.forEach((card) => {
        const handler = handlers.get(card);
        if (handler) card.removeEventListener("mousemove", handler);
      });
    };
  }, []);

  useEffect(() => {
    // Scroll reveal with IntersectionObserver
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("exp-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".exp-reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="exp2-root">
      <style>{`
        /* Hide site chrome — explore pages are standalone */
        header,
        .route-hero,
        footer {
          display: none !important;
        }
        main.page {
          padding: 0 !important;
          margin: 0 !important;
        }

        .exp2-root {
          --exp-ink: #0c1115;
          --exp-ink-soft: #1c242c;
          --exp-sand: #f7f1e6;
          --exp-sand-deep: #efe7d8;
          --exp-paper: #ffffff;
          --exp-accent-tech: #0f7ea9;
          --exp-accent-spirit: #0e615d;
          --exp-accent-mindfold: #d2a35d;
          --exp-muted: #4b535c;
          --exp-line: #e6e0d8;
          min-height: 100vh;
          background: var(--exp-sand);
          color: var(--exp-ink);
          font-family: var(--font-sans, "DM Sans", system-ui, sans-serif);
          -webkit-font-smoothing: antialiased;
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Atmospheric fixed layer */
        .exp2-atmo {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 60% 50% at 15% 10%, rgba(210,163,93,0.2), transparent),
            radial-gradient(ellipse 50% 40% at 85% 5%, rgba(14,97,93,0.22), transparent),
            radial-gradient(ellipse 40% 30% at 50% 80%, rgba(15,126,169,0.08), transparent);
        }

        /* Hero portrait section */
        .exp2-portrait {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 55vh;
          min-height: 400px;
          max-height: 600px;
          overflow: hidden;
        }
        .exp2-portrait-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(180deg,
            rgba(247,241,230,0) 0%,
            rgba(247,241,230,0.3) 50%,
            rgba(247,241,230,0.95) 85%,
            var(--exp-sand) 100%);
        }
        .exp2-portrait-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 30%, rgba(14,97,93,0.08), transparent);
        }

        /* Hero content */
        .exp2-hero {
          position: relative;
          z-index: 2;
          max-width: 1080px;
          margin: -6rem auto 0;
          padding: 0 1rem 3rem;
          text-align: center;
        }
        .exp2-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          background: rgba(14,97,93,0.08);
          border: 1px solid rgba(14,97,93,0.15);
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--exp-accent-spirit);
          margin-bottom: 1.5rem;
        }
        .exp2-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--exp-accent-spirit);
          animation: exp2-pulse 2s ease-in-out infinite;
        }
        @keyframes exp2-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,97,93,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(14,97,93,0); }
        }
        .exp2-title {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 600;
          line-height: 1.08;
          letter-spacing: 0.02em;
          color: var(--exp-ink);
          max-width: 720px;
          margin: 0 auto 1.25rem;
        }
        .exp2-title em {
          font-style: normal;
          color: var(--exp-accent-tech);
        }
        .exp2-sub {
          font-size: 1.1rem;
          color: var(--exp-ink-soft);
          line-height: 1.65;
          max-width: 540px;
          margin: 0 auto 2.25rem;
        }
        .exp2-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3.5rem;
        }
        .exp2-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: var(--exp-accent-spirit);
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(14,97,93,0.26);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .exp2-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(14,97,93,0.32);
        }
        .exp2-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: var(--exp-paper);
          color: var(--exp-ink);
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 12px;
          border: 1px solid var(--exp-line);
          text-decoration: none;
          transition: transform 0.2s, border-color 0.2s;
        }
        .exp2-btn-secondary:hover {
          transform: translateY(-1px);
          border-color: rgba(14,97,93,0.3);
        }

        /* Spotlight cards */
        .exp2-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .spotlight-card {
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(12,17,21,0.07);
          border-radius: 20px;
          padding: 1.75rem;
          text-align: left;
          transition: transform 0.3s cubic-bezier(0.2,0.8,0.2,1),
                      box-shadow 0.3s cubic-bezier(0.2,0.8,0.2,1),
                      border-color 0.3s;
          --mouse-x: 50%;
          --mouse-y: 50%;
        }
        .spotlight-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y),
            var(--spotlight-color, rgba(14,97,93,0.06)), transparent 40%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: 0;
        }
        .spotlight-card:hover::before { opacity: 1; }
        .spotlight-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 48px rgba(12,17,21,0.1);
          border-color: rgba(14,97,93,0.18);
        }
        .spotlight-card > * { position: relative; z-index: 1; }
        .exp2-card-accent {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          margin-bottom: 1rem;
        }
        .exp2-card-accent.tech { background: var(--exp-accent-tech); }
        .exp2-card-accent.spirit { background: var(--exp-accent-spirit); }
        .exp2-card-accent.mindfold { background: var(--exp-accent-mindfold); }
        .spotlight-card h3 {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 1.15rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-bottom: 0.5rem;
        }
        .spotlight-card p {
          color: var(--exp-muted);
          font-size: 0.85rem;
          line-height: 1.6;
        }

        /* Proof strip */
        .exp2-proof {
          position: relative;
          z-index: 1;
          max-width: 1080px;
          margin: 0 auto;
          padding: 3rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3rem;
          flex-wrap: wrap;
        }
        .exp2-proof::before {
          content: '';
          position: absolute;
          top: 0; left: 1rem; right: 1rem;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--exp-line), transparent);
        }
        .exp2-proof-value {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 2rem;
          font-weight: 600;
          color: var(--exp-ink);
          letter-spacing: -0.02em;
          text-align: center;
        }
        .exp2-proof-label {
          font-size: 0.8rem;
          color: var(--exp-muted);
          margin-top: 0.25rem;
          text-align: center;
        }

        /* Ambient somatic band */
        .exp2-ambient-section {
          position: relative;
          z-index: 1;
          max-width: 1080px;
          margin: 0 auto;
          padding: 3rem 1rem;
        }
        .exp2-ambient-card {
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(12,17,21,0.09);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(12,17,21,0.08);
        }
        .exp2-ambient-band {
          position: relative;
          height: 140px;
          overflow: hidden;
        }
        .exp2-ambient-band::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 40px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.85));
        }
        .exp2-ambient-body {
          padding: 1.5rem 2rem 2rem;
        }
        .exp2-section-eyebrow {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--exp-accent-mindfold);
          margin-bottom: 0.5rem;
        }
        .exp2-section-title {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: clamp(1.6rem, 2.8vw, 2.25rem);
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--exp-ink);
        }
        .exp2-location-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .exp2-location-item {
          background: var(--exp-sand-deep);
          border: 1px solid rgba(12,17,21,0.05);
          border-radius: 16px;
          padding: 1.25rem;
          transition: background 0.3s;
        }
        .exp2-location-item:hover {
          background: var(--exp-paper);
        }
        .exp2-location-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .exp2-location-label.tech { color: var(--exp-accent-tech); }
        .exp2-location-label.spirit { color: var(--exp-accent-spirit); }
        .exp2-location-label.mindfold { color: var(--exp-accent-mindfold); }
        .exp2-location-text {
          font-size: 0.875rem;
          color: var(--exp-ink-soft);
        }

        /* Reveal animation */
        .exp-reveal {
          opacity: 0;
          transform: translateY(24px);
          filter: blur(3px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1),
                      transform 0.65s cubic-bezier(0.16,1,0.3,1),
                      filter 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        .exp-visible {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
        .exp-stagger-1 { transition-delay: 80ms; }
        .exp-stagger-2 { transition-delay: 160ms; }
        .exp-stagger-3 { transition-delay: 240ms; }

        /* Responsive */
        @media (max-width: 768px) {
          .exp2-portrait { height: 45vh; min-height: 300px; }
          .exp2-hero { margin-top: -4rem; }
          .exp2-cards { grid-template-columns: 1fr; max-width: 400px; }
          .exp2-actions { flex-direction: column; align-items: center; }
          .exp2-proof { gap: 2rem; }
          .exp2-location-grid { grid-template-columns: 1fr; }
          .exp2-ambient-body { padding: 1.25rem 1.5rem 1.5rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .exp-reveal { transition: none; opacity: 1; filter: none; transform: none; }
          .exp2-badge-dot { animation: none; }
        }
      `}</style>

      <div className="exp2-atmo" />

      {/* Hero portrait */}
      <div className="exp2-portrait">
        <Image
          src="/images/DSC05871.jpg"
          alt="Max Petrusenko"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 36%" }}
          quality={88}
        />
        <div className="exp2-portrait-overlay" />
      </div>

      {/* Hero content overlapping portrait */}
      <section className="exp2-hero">
        <div className="exp2-badge">
          <span className="exp2-badge-dot" />
          Available for consulting
        </div>
        <h1 className="exp2-title">
          Automate your ops.<br />Reconnect with your <em>body</em>.
        </h1>
        <p className="exp2-sub">
          SaaS automation consulting and somatic bodywork. Two paths for founders
          who build fast and want to feel whole doing it.
        </p>
        <div className="exp2-actions">
          <a href="#" className="exp2-btn-primary">Book a call &rarr;</a>
          <a href="#" className="exp2-btn-secondary">Read my writing</a>
        </div>

        <div className="exp2-cards" ref={cardsRef}>
          <div
            className="spotlight-card exp-reveal"
            style={{ "--spotlight-color": "rgba(15,126,169,0.07)" } as React.CSSProperties}
          >
            <div className="exp2-card-accent tech" />
            <h3>AI Workflows</h3>
            <p>Custom automation pipelines. Zapier, Make, n8n, and code. Less manual, more leverage.</p>
          </div>
          <div
            className="spotlight-card exp-reveal exp-stagger-1"
            style={{ "--spotlight-color": "rgba(14,97,93,0.07)" } as React.CSSProperties}
          >
            <div className="exp2-card-accent spirit" />
            <h3>Somatic Practice</h3>
            <p>Breathwork, movement, and bodywork that restores nervous system capacity.</p>
          </div>
          <div
            className="spotlight-card exp-reveal exp-stagger-2"
            style={{ "--spotlight-color": "rgba(210,163,93,0.08)" } as React.CSSProperties}
          >
            <div className="exp2-card-accent mindfold" />
            <h3>Mindfold Events</h3>
            <p>Blindfolded group experiences blending sound, breath, and conscious movement.</p>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <div className="exp2-proof exp-reveal">
        <div>
          <div className="exp2-proof-value">$253k</div>
          <div className="exp2-proof-label">Annual savings delivered</div>
        </div>
        <div>
          <div className="exp2-proof-value">200+</div>
          <div className="exp2-proof-label">Sessions facilitated</div>
        </div>
        <div>
          <div className="exp2-proof-value">4.9/5</div>
          <div className="exp2-proof-label">Client experience</div>
        </div>
        <div>
          <div className="exp2-proof-value">By request</div>
          <div className="exp2-proof-label">Based in</div>
        </div>
      </div>

      {/* Ambient somatic section with real image */}
      <section className="exp2-ambient-section">
        <div className="exp2-ambient-card exp-reveal">
          <div className="exp2-ambient-band">
            <Image
              src="/images/generated/home-ambient-somatic.jpg"
              alt="Calm ambient atmosphere"
              fill
              sizes="(max-width: 768px) 100vw, 1080px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="exp2-ambient-body">
            <div className="exp2-section-eyebrow">Area Served</div>
            <h2 className="exp2-section-title">In person and worldwide</h2>
            <div className="exp2-location-grid">
              <div className="exp2-location-item">
                <div className="exp2-location-label spirit">Somatic Work</div>
                <div className="exp2-location-text">private sessions by request</div>
              </div>
              <div className="exp2-location-item">
                <div className="exp2-location-label tech">Tech Consulting</div>
                <div className="exp2-location-text">Miami, Florida, USA</div>
              </div>
              <div className="exp2-location-item">
                <div className="exp2-location-label mindfold">Remote</div>
                <div className="exp2-location-text">Worldwide consulting</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
