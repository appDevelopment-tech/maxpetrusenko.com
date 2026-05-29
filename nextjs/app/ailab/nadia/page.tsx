import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";
import { NadiaTabs } from "./NadiaTabs";

export const runtime = "edge";

const PAGE_TITLE = "AI Lab for Nadia — transcript and summary";
const PAGE_DESCRIPTION =
  "Nadia's AI Lab session with two tabs: the verified transcript and a public-safe summary of AI-agent workflow lessons.";
const PAGE_URL = "/ailab/nadia";
const DATE_PUBLISHED = "2026-05-29T00:00:00.000Z";
const DATE_MODIFIED = "2026-05-29T21:55:00.000Z";

export const metadata = generateMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: absoluteUrl(PAGE_URL),
  keywords: ["AI Lab", "Nadia", "AI agents", "transcript", "agent workflows", "QA testing", "Max Petrusenko"],
  noindex: true,
});

export default function NadiaAiLabPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          datePublished: DATE_PUBLISHED,
          dateModified: DATE_MODIFIED,
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "AI Lab", url: "/ailab" },
          { name: "Nadia", url: PAGE_URL },
        ])}
      />

      <article className="container py-12 md:py-16">
        <div className="mb-8 inline-flex rounded-full border border-[rgba(15,126,169,0.18)] bg-white/45 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-tech)]">
          AI Lab · Nadia · transcript + summary
        </div>

        <header className="max-w-[980px]">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
            Bee transcript · May 29, 2026
          </p>
          <h1 className="max-w-[13ch] font-serif text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
            Working with AI agents.
          </h1>
          <p className="mt-6 max-w-[820px] text-lg leading-relaxed text-[var(--ink-soft)] md:text-xl">
            Two tabs: the source transcript from the AI Lab session, and a cleaned summary of the practical lessons on context, tools, skills, verification, and QA workflows.
          </p>
        </header>

        <NadiaTabs />

        <section className="mt-10 rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Source note</p>
          <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">
            Transcript and summary are separated.
          </h2>
          <p className="mt-4 max-w-[840px] text-lg leading-relaxed text-[var(--ink-soft)]">
            The Transcript tab is the Bee-recorded AI Lab conversation from the verified 2–4 PM source window. The Summary tab is the edited lesson version. The unrelated post-session account/photo-storage tail is not included.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn secondary" href="/ailab">Back to AI Lab</Link>
            <Link className="btn" href="/tech">Explore AI automation work</Link>
          </div>
        </section>
      </article>
    </>
  );
}
