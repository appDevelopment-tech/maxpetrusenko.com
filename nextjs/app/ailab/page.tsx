import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";

export const runtime = "edge";

export const metadata = generateMetadata({
  title: "AI Lab",
  description: "Shareable AI Lab lessons and project notes.",
  canonical: absoluteUrl("/ailab"),
  keywords: ["AI Lab", "AI lessons", "Max Petrusenko"],
});

export default function AiLabIndexPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "AI Lab",
          description: "Shareable AI Lab lessons and project notes.",
          url: "/ailab",
          datePublished: "2026-05-29T00:00:00.000Z",
          dateModified: "2026-05-29T00:00:00.000Z",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "AI Lab", url: "/ailab" },
        ])}
      />
      <section className="container py-12 md:py-16">
        <p className="mb-4 inline-flex rounded-full border border-[rgba(15,126,169,0.18)] bg-white/45 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-tech)]">
          AI Lab
        </p>
        <h1 className="max-w-[10ch] font-serif text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
          Shareable lessons.
        </h1>
        <p className="mt-5 max-w-[680px] text-lg leading-relaxed text-[var(--ink-soft)]">
          Small public pages for AI Lab sessions, transcripts, and source-backed summaries.
        </p>
        <div className="mt-8 rounded-[24px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6 shadow-[0_18px_50px_rgba(12,17,21,0.08)]">
          <Link className="block rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(12,17,21,0.10)]" href="/ailab/nadia">
            <span className="block font-serif text-2xl font-bold text-[var(--ink)]">Folders for AI systems</span>
            <span className="mt-2 block text-[var(--ink-soft)]">Transcript and source-backed summary prepared for Nadia.</span>
          </Link>
        </div>
      </section>
    </>
  );
}
