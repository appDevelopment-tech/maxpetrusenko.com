import type { HomeFaqEntry } from "@/lib/seo/home-faq";

const laneLabel: Record<HomeFaqEntry["lane"], string> = {
  general: "General",
  tech: "Tech",
  somatic: "Somatic",
};

export function HomeFaqSection({ faqEntries }: { faqEntries: HomeFaqEntry[] }) {
  return (
    <section className="ui-fade-up delay-4 rounded-[24px] border border-[rgba(12,17,21,0.09)] bg-white/88 p-6 shadow-[0_15px_40px_rgba(12,17,21,0.08)] md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-tech)]">
            Direct Answers
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)] md:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>
        <p className="max-w-xl text-sm text-[var(--muted)]">
          Clean answers for humans, search engines, and AI retrieval. Same source powers the visible section and the homepage FAQ schema.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {faqEntries.map((entry) => (
          <details
            key={entry.question}
            className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white px-5 py-4 transition hover:border-[rgba(14,97,93,0.24)]"
          >
            <summary className="cursor-pointer list-none">
              <span className="inline-flex rounded-full bg-[rgba(12,17,21,0.06)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {laneLabel[entry.lane]}
              </span>
              <span className="mt-3 block pr-5 text-base font-semibold text-[var(--ink)]">
                {entry.question}
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {entry.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
