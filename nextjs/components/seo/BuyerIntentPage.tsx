import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";
import { absoluteUrl, generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { FLAG, isSiteFlagOn } from "@/lib/seo/flags";
import { getBuyerPage, type BuyerPage } from "@/lib/seo/buyer-pages";

const EMAIL = "hello@maxpetrusenko.com";

function mailto(page: BuyerPage): string {
  const subject = encodeURIComponent(page.cta.subject);
  const body = encodeURIComponent("Hi Max, here is what I need: ____. Tools involved: ____. Target date: ____.");
  return `mailto:${EMAIL}?subject=${subject}&body=${body}`;
}

/** Metadata for a buyer page; the page 404s when seo_h006_buyer_pages is off. */
export function buyerMetadata(slug: string) {
  const page = getBuyerPage(slug);
  return buildMetadata({
    title: page.title,
    description: page.description,
    ogType: "website",
    canonical: absoluteUrl(page.path),
    keywords: [page.keyword],
  });
}

export function BuyerIntentPage({ slug }: { slug: string }) {
  if (!isSiteFlagOn(FLAG.buyerPages)) notFound();
  const page = getBuyerPage(slug);
  const cta = (
    <a
      className="inline-flex items-center rounded-[10px] bg-[var(--ink)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)]"
      href={mailto(page)}
    >
      {page.cta.label}
    </a>
  );

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({ title: page.title, description: page.description, url: page.path })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: page.h1, url: page.path },
        ])}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />

      <article className="mx-auto w-full max-w-[760px] px-4 py-28 md:px-6 md:py-32">
        <h1 className="font-serif text-[clamp(2.1rem,4.4vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-[var(--ink)]">
          {page.h1}
        </h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">{page.answer}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">Built for: {page.buyer}</p>
        <div className="mt-8">{cta}</div>

        <h2 className="mt-14 font-serif text-2xl font-semibold text-[var(--ink)]">What you get</h2>
        <ul className="mt-4 grid gap-4">
          {page.deliverables.map((d) => (
            <li key={d.name} className="card" style={{ padding: "20px", borderLeft: "4px solid var(--accent-tech)" }}>
              <h3 className="font-semibold text-[var(--ink)]">{d.name}</h3>
              <p className="mt-1 text-[var(--muted)]">{d.detail}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-serif text-2xl font-semibold text-[var(--ink)]">How it works</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-[var(--ink-soft)]">
          {page.process.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2 className="mt-14 font-serif text-2xl font-semibold text-[var(--ink)]">Good fit, and not</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ul className="list-disc space-y-2 pl-5 text-[var(--ink-soft)]">
            {page.fit.good.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <ul className="list-disc space-y-2 pl-5 text-[var(--muted)]">
            {page.fit.notGood.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <h2 className="mt-14 font-serif text-2xl font-semibold text-[var(--ink)]">Questions</h2>
        <dl className="mt-4 space-y-5">
          {page.faq.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold text-[var(--ink)]">{item.q}</dt>
              <dd className="mt-1 text-[var(--ink-soft)]">{item.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12">{cta}</div>

        <nav aria-label="Related" className="mt-14">
          <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Related</h2>
          <ul className="mt-3 space-y-1">
            {page.related.map((r) => (
              <li key={r.href}>
                <Link className="text-[var(--accent-tech)] underline" href={r.href}>
                  {r.anchor}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </>
  );
}
