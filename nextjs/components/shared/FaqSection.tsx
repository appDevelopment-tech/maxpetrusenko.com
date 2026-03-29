interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqItem[];
  columns?: 2 | 3;
}

export function FaqSection({ items, columns = 2 }: FaqSectionProps) {
  return (
    <section className="ui-fade-up delay-3">
      <div className={`grid gap-4 ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {items.map((item, index) => (
          <details
            key={index}
            className="group rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white/92 p-5 shadow-[0_8px_20px_rgba(13,15,20,0.06)] transition-shadow hover:shadow-[0_12px_28px_rgba(12,17,21,0.08)]"
          >
            <summary className="cursor-pointer list-none text-[0.95rem] font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.question}
                <span className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--muted)]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
