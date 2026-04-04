/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { useEffect } from "react";

/**
 * Hero Exploration 3: "Kinetic Precision"
 * StarBorder on featured testimonial (1 use), ShinyText on badge (1 use),
 * portrait photo as hero background, dark contrast zone with generated image,
 * border-left stripes on path cards.
 */

export default function HeroExplore3() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("exp3-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".exp3-reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="exp3-root">
      <style>{`
        @property --star-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

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

        .exp3-root {
          --exp-ink: #0c1115;
          --exp-ink-soft: #1c242c;
          --exp-sand: #f7f1e6;
          --exp-paper: #ffffff;
          --exp-accent-tech: #0f7ea9;
          --exp-accent-spirit: #0e615d;
          --exp-accent-mindfold: #d2a35d;
          --exp-muted: #4b535c;
          --exp-line: #e6e0d8;
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 15%, rgba(210,163,93,0.14), transparent 30%),
            radial-gradient(circle at 80% 5%, rgba(14,97,93,0.16), transparent 25%),
            var(--exp-sand);
          color: var(--exp-ink);
          font-family: var(--font-sans, "DM Sans", system-ui, sans-serif);
          -webkit-font-smoothing: antialiased;
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Nav */
        .exp3-nav-wrap {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          background: rgba(247,241,230,0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--exp-line);
        }
        .exp3-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 1rem;
          height: 64px;
        }
        .exp3-nav-logo {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--exp-ink);
          letter-spacing: 0.02em;
        }
        .exp3-nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .exp3-nav-links a {
          text-decoration: none;
          color: var(--exp-muted);
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .exp3-nav-links a:hover { color: var(--exp-ink); }
        .exp3-nav-cta {
          padding: 0.5rem 1.25rem !important;
          background: var(--exp-ink) !important;
          color: var(--exp-sand) !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          transition: transform 0.2s, opacity 0.2s !important;
        }
        .exp3-nav-cta:hover { opacity: 0.85; transform: translateY(-1px); }

        /* Hero with portrait background */
        .exp3-hero-wrap {
          position: relative;
          z-index: 1;
          min-height: 90vh;
          display: flex;
          align-items: center;
        }
        .exp3-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .exp3-hero-bg-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(90deg,
              var(--exp-sand) 0%,
              rgba(247,241,230,0.92) 35%,
              rgba(247,241,230,0.6) 55%,
              rgba(247,241,230,0.2) 75%,
              transparent 100%);
        }
        .exp3-hero-bg-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 120px;
          z-index: 2;
          background: linear-gradient(180deg, transparent, var(--exp-sand));
        }

        .exp3-hero {
          position: relative;
          z-index: 3;
          max-width: 1080px;
          width: 100%;
          margin: 0 auto;
          padding: 7rem 1rem 4rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
        }
        .exp3-hero-content { max-width: 520px; }

        /* ShinyText badge (1 use only) */
        .exp3-shiny-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          border: 1px solid rgba(14,97,93,0.2);
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          background-image: linear-gradient(120deg,
            var(--exp-accent-spirit) 0%, var(--exp-accent-spirit) 35%,
            var(--exp-sand) 50%,
            var(--exp-accent-spirit) 65%, var(--exp-accent-spirit) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: exp3-shiny 3.5s linear infinite;
        }
        @keyframes exp3-shiny {
          0% { background-position: 150% center; }
          100% { background-position: -50% center; }
        }

        .exp3-title {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: clamp(2.4rem, 4.8vw, 3.75rem);
          font-weight: 700;
          line-height: 1.06;
          letter-spacing: -0.01em;
          color: var(--exp-ink);
          margin-bottom: 1.25rem;
        }
        .exp3-title .accent-word { color: var(--exp-accent-spirit); }
        .exp3-sub {
          font-size: 1.05rem;
          color: var(--exp-ink-soft);
          line-height: 1.65;
          max-width: 440px;
          margin-bottom: 2rem;
        }
        .exp3-buttons {
          display: flex;
          gap: 0.875rem;
          flex-wrap: wrap;
        }
        .exp3-btn-dark {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          background: var(--exp-ink);
          color: var(--exp-sand);
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 10px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(12,17,21,0.18);
        }
        .exp3-btn-dark:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(12,17,21,0.24);
        }
        .exp3-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          background: transparent;
          color: var(--exp-ink);
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 10px;
          border: 1.5px solid var(--exp-line);
          text-decoration: none;
          transition: border-color 0.2s, transform 0.2s;
        }
        .exp3-btn-outline:hover {
          border-color: var(--exp-accent-tech);
          transform: translateY(-1px);
        }

        /* StarBorder testimonial card (1 use only) */
        .exp3-featured {
          position: relative;
          border-radius: 24px;
          overflow: visible;
        }
        .exp3-featured::before {
          content: '';
          position: absolute;
          inset: -1.5px;
          border-radius: 25.5px;
          background: conic-gradient(
            from var(--star-angle, 0deg),
            transparent 0%,
            var(--exp-accent-tech) 8%,
            transparent 16%,
            transparent 42%,
            var(--exp-accent-mindfold) 50%,
            transparent 58%,
            transparent 84%,
            var(--exp-accent-spirit) 92%,
            transparent 100%
          );
          z-index: 0;
          animation: exp3-star-spin 6s linear infinite;
        }
        .exp3-featured::after {
          content: '';
          position: absolute;
          inset: 1.5px;
          border-radius: 22.5px;
          background: var(--exp-paper);
          z-index: 0;
        }
        @keyframes exp3-star-spin {
          0% { --star-angle: 0deg; }
          100% { --star-angle: 360deg; }
        }
        .exp3-featured-inner {
          position: relative;
          z-index: 1;
          background: var(--exp-paper);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .exp3-featured-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .exp3-featured-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--exp-accent-spirit), var(--exp-accent-tech));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .exp3-featured-name { font-weight: 600; font-size: 0.9rem; }
        .exp3-featured-role { font-size: 0.78rem; color: var(--exp-muted); }
        .exp3-featured-quote {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 1.15rem;
          font-weight: 500;
          line-height: 1.55;
          color: var(--exp-ink-soft);
          font-style: italic;
          letter-spacing: 0.01em;
        }
        .exp3-featured-result {
          display: flex;
          gap: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--exp-line);
        }
        .exp3-result-item { flex: 1; }
        .exp3-result-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--exp-accent-tech);
          letter-spacing: -0.03em;
        }
        .exp3-result-label {
          font-size: 0.75rem;
          color: var(--exp-muted);
          margin-top: 0.125rem;
        }

        /* Dark contrast zone with generated bg */
        .exp3-dark-zone {
          position: relative;
          z-index: 1;
          background: #070b12;
          margin-top: 2rem;
          padding: 5rem 1rem;
          overflow: hidden;
        }
        .exp3-dark-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.35;
          mix-blend-mode: screen;
        }
        .exp3-dark-gradient {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            radial-gradient(circle at 20% 30%, rgba(15,126,169,0.14), transparent 35%),
            radial-gradient(circle at 80% 70%, rgba(210,163,93,0.1), transparent 30%),
            linear-gradient(145deg, #070b12 0%, #0a1220 58%, #0b1623 100%);
        }
        .exp3-dark-inner {
          position: relative;
          z-index: 2;
          max-width: 1080px;
          margin: 0 auto;
        }
        .exp3-dark-eyebrow {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--exp-accent-mindfold);
          margin-bottom: 0.5rem;
        }
        .exp3-dark-title {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: clamp(1.6rem, 2.8vw, 2.25rem);
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #e2e8f0;
          margin-bottom: 0.5rem;
        }
        .exp3-dark-sub {
          color: #8899aa;
          font-size: 1rem;
          max-width: 520px;
        }

        /* Path cards with border-left stripe */
        .exp3-path-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 2.5rem;
        }
        .exp3-path-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 2rem;
          backdrop-filter: blur(8px);
          transition: border-color 0.3s, transform 0.3s;
          border-left: 3px solid transparent;
        }
        .exp3-path-card:hover {
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-3px);
        }
        .exp3-path-card.tech-path { border-left-color: var(--exp-accent-tech); }
        .exp3-path-card.spirit-path { border-left-color: var(--exp-accent-spirit); }
        .exp3-path-card h3 {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 1.35rem;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: 0.02em;
          margin-bottom: 0.75rem;
        }
        .exp3-path-card p {
          color: #8899aa;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 1.25rem;
        }
        .exp3-path-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .exp3-path-tag {
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .exp3-path-tag.tech {
          background: rgba(15,126,169,0.15);
          color: var(--exp-accent-tech);
        }
        .exp3-path-tag.spirit {
          background: rgba(14,97,93,0.15);
          color: #2eb8a8;
        }

        /* Blur in */
        .exp3-blur-in {
          opacity: 0;
          filter: blur(10px);
          transform: translateY(16px);
          animation: exp3-blur-in 0.75s ease-out forwards;
        }
        .exp3-blur-d1 { animation-delay: 0.12s; }
        .exp3-blur-d2 { animation-delay: 0.24s; }
        .exp3-blur-d3 { animation-delay: 0.36s; }
        .exp3-blur-d4 { animation-delay: 0.5s; }
        @keyframes exp3-blur-in {
          0%   { opacity: 0; filter: blur(10px); transform: translateY(16px); }
          60%  { opacity: 0.7; filter: blur(3px); transform: translateY(3px); }
          100% { opacity: 1; filter: blur(0); transform: translateY(0); }
        }

        /* Reveal */
        .exp3-reveal {
          opacity: 0;
          transform: translateY(24px);
          filter: blur(3px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1),
                      transform 0.65s cubic-bezier(0.16,1,0.3,1),
                      filter 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        .exp3-visible {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
        .exp3-stagger-1 { transition-delay: 100ms; }
        .exp3-stagger-2 { transition-delay: 200ms; }

        /* Responsive */
        @media (max-width: 768px) {
          .exp3-hero {
            grid-template-columns: 1fr;
            padding: 5.5rem 1rem 2rem;
            gap: 2rem;
          }
          .exp3-hero-bg-overlay {
            background: linear-gradient(180deg,
              rgba(247,241,230,0.5) 0%,
              rgba(247,241,230,0.85) 40%,
              var(--exp-sand) 80%);
          }
          .exp3-hero-content { max-width: none; }
          .exp3-path-grid { grid-template-columns: 1fr; }
          .exp3-nav-links { display: none; }
          .exp3-buttons { flex-direction: column; }
          .exp3-buttons a { text-align: center; justify-content: center; }
          .exp3-featured-result { flex-direction: column; gap: 0.75rem; }
          .exp3-dark-zone { margin-top: 1rem; padding: 3.5rem 1rem; }
          .exp3-hero-wrap { min-height: auto; }
        }
        @media (prefers-reduced-motion: reduce) {
          .exp3-blur-in { animation: none; opacity: 1; filter: none; transform: none; }
          .exp3-reveal { transition: none; opacity: 1; filter: none; transform: none; }
          .exp3-featured::before { animation: none; }
          .exp3-shiny-badge { animation: none; }
        }
      `}</style>

      <div className="exp3-nav-wrap">
        <nav className="exp3-nav">
          <div className="exp3-nav-logo">Max Petrusenko</div>
          <ul className="exp3-nav-links">
            <li><a href="#">Tech</a></li>
            <li><a href="#">Somatic</a></li>
            <li><a href="#">Writing</a></li>
            <li><a href="#" className="exp3-nav-cta">Let&apos;s talk</a></li>
          </ul>
        </nav>
      </div>

      {/* Hero with portrait background */}
      <div className="exp3-hero-wrap">
        <div className="exp3-hero-bg">
          <Image
            src="/images/DSC05871.jpg"
            alt="Max Petrusenko"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 36%" }}
            quality={88}
          />
          <div className="exp3-hero-bg-overlay" />
          <div className="exp3-hero-bg-bottom" />
        </div>

        <section className="exp3-hero">
          <div className="exp3-hero-content">
            <div className="exp3-shiny-badge exp3-blur-in">Open for Q2 projects</div>
            <h1 className="exp3-title exp3-blur-in exp3-blur-d1">
              Systems for <span className="accent-word">scale</span>.<br />
              Presence for depth.
            </h1>
            <p className="exp3-sub exp3-blur-in exp3-blur-d2">
              I build AI automation for SaaS founders and hold somatic space for
              people ready to feel more. Two crafts, one practitioner.
            </p>
            <div className="exp3-buttons exp3-blur-in exp3-blur-d3">
              <a href="#" className="exp3-btn-dark">Book a strategy call &rarr;</a>
              <a href="#" className="exp3-btn-outline">Explore my work</a>
            </div>
          </div>

          <div className="exp3-featured exp3-blur-in exp3-blur-d4">
            <div className="exp3-featured-inner">
              <div className="exp3-featured-header">
                <div className="exp3-featured-avatar">JR</div>
                <div>
                  <div className="exp3-featured-name">Jake R.</div>
                  <div className="exp3-featured-role">CEO, Series A SaaS</div>
                </div>
              </div>
              <div className="exp3-featured-quote">
                &ldquo;Max automated our entire onboarding pipeline. What took 6 hours
                now runs in 12 minutes with zero manual steps.&rdquo;
              </div>
              <div className="exp3-featured-result">
                <div className="exp3-result-item">
                  <div className="exp3-result-value">6h &rarr; 12m</div>
                  <div className="exp3-result-label">Onboarding time</div>
                </div>
                <div className="exp3-result-item">
                  <div className="exp3-result-value">$48k</div>
                  <div className="exp3-result-label">Annual savings</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Dark contrast zone with generated bg image */}
      <div className="exp3-dark-zone">
        <div className="exp3-dark-bg">
          <Image
            src="/images/generated/home-hero-generated.jpg"
            alt="Abstract AI atmosphere"
            fill
            sizes="100vw"
            quality={68}
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="exp3-dark-gradient" />
        <div className="exp3-dark-inner">
          <div className="exp3-dark-eyebrow exp3-reveal">Two Paths</div>
          <h2 className="exp3-dark-title exp3-reveal">Choose your entry point</h2>
          <p className="exp3-dark-sub exp3-reveal">
            Both paths share the same foundation: clarity, precision, and deep
            attention to how systems actually work.
          </p>

          <div className="exp3-path-grid">
            <div className="exp3-path-card tech-path exp3-reveal exp3-stagger-1">
              <h3>AI Workflow Automation</h3>
              <p>
                Custom pipelines that eliminate repetitive ops. I audit your stack,
                identify bottlenecks, and build automations that save real hours
                every week.
              </p>
              <div className="exp3-path-tags">
                <span className="exp3-path-tag tech">Zapier</span>
                <span className="exp3-path-tag tech">n8n</span>
                <span className="exp3-path-tag tech">Make</span>
                <span className="exp3-path-tag tech">Custom Code</span>
              </div>
            </div>
            <div className="exp3-path-card spirit-path exp3-reveal exp3-stagger-2">
              <h3>Somatic Bodywork</h3>
              <p>
                Breathwork, movement, and hands-on sessions that restore nervous
                system capacity. For founders who build fast and want to feel
                whole doing it.
              </p>
              <div className="exp3-path-tags">
                <span className="exp3-path-tag spirit">Breathwork</span>
                <span className="exp3-path-tag spirit">Movement</span>
                <span className="exp3-path-tag spirit">Mindfold</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
