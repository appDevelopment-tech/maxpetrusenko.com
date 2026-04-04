import Link from "next/link";
import Image from "next/image";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
  generatePersonSchema,
  generateWebPageSchema,
} from "@/lib/seo/structured-data";
import type { BrandedReferencePageConfig } from "@/lib/brand/reference-pages";
import type { ReactNode } from "react";

interface BrandedReferencePageProps {
  config: BrandedReferencePageConfig;
  children?: ReactNode;
}

export function BrandedReferencePage({
  config,
  children,
}: BrandedReferencePageProps) {
  const route = `/${config.slug}`;
  const itemList = config.routeCards.map((card) => ({
    name: card.title,
    url: card.href,
  }));

  return (
    <>
      <JsonLd type="Person" data={generatePersonSchema()} />
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: config.title,
          description: config.description,
          url: route,
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: config.title, url: route },
        ])}
      />
      <JsonLd
        type="ItemList"
        data={generateItemListSchema(itemList, {
          name: `${config.title} reference links`,
          description: config.description,
        })}
      />

      <div className="hero-portrait-wrap">
        <div className="hero-portrait-bg">
          <Image
            src={config.heroImage}
            alt={config.title}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 36%" }}
            quality={86}
          />
          <div className="hero-portrait-overlay" />
          <div className="hero-portrait-bottom" />
        </div>
        <section className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-28 md:px-6 md:py-32">
          <div>
            <p className="blur-in inline-flex items-center rounded-full border border-[rgba(15,126,169,0.22)] px-4 py-1 text-xs font-semibold text-[var(--accent-tech)]">
              {config.eyebrow}
            </p>
            <h1 className="clip-reveal clip-reveal-d1 mt-5 max-w-[13ch] font-serif text-[clamp(2.35rem,4.8vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
              {config.h1}
            </h1>
            <p className="blur-in blur-in-d2 mt-5 max-w-[560px] text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              {config.intro}
            </p>
            <div className="blur-in blur-in-d3 mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] shadow-[0_4px_16px_rgba(12,17,21,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(12,17,21,0.24)]"
                href={config.primaryCta.href}
              >
                {config.primaryCta.label}
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--line)] bg-transparent px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-spirit)]"
                href={config.secondaryCta.href}
              >
                {config.secondaryCta.label}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="container">
        <section className="section ui-fade-up delay-2">
          <DirectAnswer
            label="Direct answer"
            question={config.question}
            answer={config.answer}
            displayAnswer={config.displayAnswer}
            schemaType="FAQPage"
            variant="embedded"
          />
        </section>

        <section className="section ui-fade-up delay-3" style={{ paddingTop: 0 }}>
          <div className="cards-2 grid">
            <div className="card">
              <h2>Quick facts</h2>
              <ul className="list" style={{ marginTop: 14 }}>
                {config.quickFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2>Related searches</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {config.searchPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="tag"
                    style={{ textDecoration: "none" }}
                  >
                    {phrase}
                  </span>
                ))}
              </div>
              <p className="text-muted" style={{ marginTop: 16 }}>
                Canonical route:{" "}
                <a href={absoluteUrl(route)}>{absoluteUrl(route)}</a>
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Best pages for this query</h2>
            <span className="section-note">Internal routes that answer the intent cleanly</span>
          </div>
          <div className="cards-3 grid">
            {config.routeCards.map((card) => (
              <Link key={card.href} className="card card-with-actions" href={card.href}>
                <div className="eyebrow">{card.badge}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="card-actions-spacer"></div>
                <div className="hero-actions" style={{ marginTop: 12 }}>
                  <span className="btn secondary sm">Open</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {children}
      </div>
    </>
  );
}
