import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";

export const runtime = "edge";

export const metadata = generateMetadata({
  title: "AI Lab for Nadia — Source correction pending",
  description:
    "This share page is temporarily paused while the correct Bee meeting transcript is retrieved.",
  canonical: absoluteUrl("/ailab/nadia"),
  noindex: true,
});

export default function NadiaAiLabPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "AI Lab for Nadia — Source correction pending",
          description:
            "This share page is temporarily paused while the correct Bee meeting transcript is retrieved.",
          url: "/ailab/nadia",
          datePublished: "2026-05-29T00:00:00.000Z",
          dateModified: "2026-05-29T20:40:00.000Z",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "AI Lab", url: "/ailab" },
          { name: "Nadia", url: "/ailab/nadia" },
        ])}
      />

      <article className="container py-12 md:py-16">
        <div className="mb-8 inline-flex rounded-full border border-[rgba(15,126,169,0.18)] bg-white/45 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-tech)]">
          AI Lab · source correction
        </div>

        <section className="rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Do not share yet</p>
          <h1 className="max-w-[12ch] font-serif text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
            Source correction pending.
          </h1>
          <p className="mt-6 max-w-[760px] text-lg leading-relaxed text-[var(--ink-soft)] md:text-xl">
            The previous version of this page used the wrong transcript. The intended source is the Bee-recorded meeting from roughly 2–4 PM, not the “Folders for AI systems” transcript.
          </p>
          <p className="mt-4 max-w-[760px] text-lg leading-relaxed text-[var(--ink-soft)] md:text-xl">
            This page will be replaced with the correct Bee meeting summary once that source is retrieved and verified.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn secondary" href="/ailab">Back to AI Lab</Link>
          </div>
        </section>
      </article>
    </>
  );
}
