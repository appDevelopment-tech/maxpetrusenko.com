import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container py-10 md:py-14">
      <div className="rounded-[24px] border border-[rgba(12,17,21,0.08)] bg-white/88 p-6 shadow-[0_15px_40px_rgba(12,17,21,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
          This page does not exist.
        </h1>
        <p className="mt-3 max-w-[42rem] text-sm leading-7 text-[var(--muted)] md:text-base">
          The page may have moved, or the link is stale.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-[10px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--sand)]"
          >
            Back home
          </Link>
          <Link
            href="/tech"
            className="inline-flex items-center rounded-[10px] border border-[rgba(12,17,21,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ink)]"
          >
            Explore tech
          </Link>
        </div>
      </div>
    </section>
  );
}
