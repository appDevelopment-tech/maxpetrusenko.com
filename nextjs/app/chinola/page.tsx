import Link from "next/link";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "Chinola Vision Demo",
  description:
    "Client preview of a day one passion fruit detection prototype using annotated video.",
  canonical: absoluteUrl("/chinola"),
  noindex: true,
});

const videoUrl = "/chinola/passion-fruit-demo.mp4";

export default function ChinolaPage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: "Chinola Vision Demo",
          description:
            "Client preview of a day one passion fruit detection prototype using annotated video.",
          url: "/chinola",
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Chinola", url: "/chinola" },
        ])}
      />

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-6 md:px-6 md:pb-20 md:pt-10">
        <div className="grid gap-7 lg:grid-cols-[1fr_320px] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-[rgba(14,97,93,0.18)] bg-white/55 px-4 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent-spirit)]">
              Chinola farm vision
            </p>
            <h1 className="mt-4 max-w-[760px] font-serif text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[0.98] text-[var(--ink)]">
              Passion fruit detection preview
            </h1>
            <p className="mt-4 max-w-[720px] text-[1.02rem] leading-relaxed text-[var(--ink-soft)] md:text-[1.12rem]">
              Day one prototype showing detected passion fruit in public video footage.
              This is a visual proof point, not a final farm yield report.
            </p>

            <div className="mt-7 overflow-hidden rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-[#07110f] shadow-[0_24px_80px_rgba(12,17,21,0.22)]">
              <video
                className="block aspect-video w-full bg-[#07110f]"
                controls
                playsInline
                preload="metadata"
              >
                <source src={videoUrl} type="video/mp4" />
                <a href={videoUrl}>Open the annotated video</a>
              </video>
            </div>
          </div>

          <aside className="rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-white/70 p-5 shadow-[0_14px_42px_rgba(12,17,21,0.08)]">
            <h2 className="font-serif text-[1.55rem] font-semibold text-[var(--ink)]">
              Demo notes
            </h2>
            <dl className="mt-4 space-y-4 text-sm text-[var(--ink-soft)]">
              <div>
                <dt className="font-bold text-[var(--ink)]">Object</dt>
                <dd>Passion fruit only</dd>
              </div>
              <div>
                <dt className="font-bold text-[var(--ink)]">Source</dt>
                <dd>Public practice footage</dd>
              </div>
              <div>
                <dt className="font-bold text-[var(--ink)]">Status</dt>
                <dd>Prototype detector, tuned for client review</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3">
              <a className="btn primary w-full" href={videoUrl}>
                Open video file
              </a>
              <Link className="btn secondary w-full" href="/">
                Back to Max
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
