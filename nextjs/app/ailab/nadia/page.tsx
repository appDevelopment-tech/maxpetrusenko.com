import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";

export const runtime = "edge";

const PAGE_TITLE = "AI Lab for Nadia — working with AI agents";
const PAGE_DESCRIPTION =
  "A public-safe summary of Nadia's AI Lab session on context, tools, skills, verification, and practical agent workflows.";
const PAGE_URL = "/ailab/nadia";
const DATE_PUBLISHED = "2026-05-29T00:00:00.000Z";
const DATE_MODIFIED = "2026-05-29T21:20:00.000Z";

const principles = [
  {
    title: "Context before instructions",
    body:
      "The agent can only work with what it can actually see: the right folder, repo, page, browser session, task description, and expected output.",
  },
  {
    title: "The interface, model, and tools are separate",
    body:
      "Cursor, Codex, Claude, GPT, Hermes, and browser automation are different layers. If one setup stalls, the fix may be the model, the interface, or tool access — not more prompting.",
  },
  {
    title: "Authenticated pages need real access",
    body:
      "Being logged in as a person does not automatically mean the agent can inspect the same page. Private app testing needs safe local browser/tool setup, not copied passwords.",
  },
  {
    title: "Tools are capabilities; skills are repeatable methods",
    body:
      "A browser, terminal, GitHub, search, and file access are tools. A QA audit, bug report, research pass, or verification checklist is a skill.",
  },
  {
    title: "Trust exploration, verify conclusions",
    body:
      "Agents can find useful bugs, but they can also confidently report things that are not true. Good workflow means checking reproduction steps before sharing findings.",
  },
  {
    title: "Parallel agents come after one clear workflow",
    body:
      "Multiple agents help when each has a bounded job: QA, UX review, technical debugging, research, or report writing. Without boundaries, they create more noise.",
  },
];

const qaWorkflow = [
  "Open the correct app, folder, repo, or page before asking for help.",
  "Tell the agent its role: QA tester, debugger, product reviewer, developer, or researcher.",
  "Specify the output: bug report, audit, test plan, reproduction steps, or implementation plan.",
  "Ask it to inspect core flows: signup/login, forms, navigation, buttons, error states, empty states, and mobile behavior.",
  "Require every issue to include steps to reproduce, expected result, actual result, severity, evidence, and verification status.",
  "Manually verify the top findings before filing or sharing them.",
];

const promptStarters = [
  "Act as a QA tester. Inspect this web app and create a bug report. For every issue include page, steps to reproduce, expected result, actual result, severity, evidence, and whether it was verified. Do not invent bugs; mark uncertain items clearly.",
  "Before you start, tell me what context you can access: files, browser, repo, page, terminal, search, or none. If you cannot see the app, say exactly what access is missing.",
  "Review this agent's report. Separate verified issues from guesses, missing evidence, and follow-up checks.",
];

const phrases = [
  {
    ru: "Не думай, что агент видит то же самое, что видишь ты.",
    en: "Do not assume the agent sees what you see.",
  },
  {
    ru: "Инструмент — это что агент может использовать. Скилл — это как и когда это использовать.",
    en: "A tool is what the agent can use. A skill is knowing when and how to use it.",
  },
  {
    ru: "Отдельный навык — понимать, когда модель ошибается.",
    en: "A separate skill is learning when the model is wrong.",
  },
];

export const metadata = generateMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: absoluteUrl(PAGE_URL),
  keywords: ["AI Lab", "Nadia", "AI agents", "agent workflows", "QA testing", "Max Petrusenko"],
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
          AI Lab · Nadia · source verified
        </div>

        <header className="max-w-[980px]">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
            Bee transcript summary · May 29, 2026
          </p>
          <h1 className="max-w-[13ch] font-serif text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
            Working with AI agents.
          </h1>
          <p className="mt-6 max-w-[820px] text-lg leading-relaxed text-[var(--ink-soft)] md:text-xl">
            This page condenses the useful parts of Nadia's AI Lab session: how to give an agent context, how to choose tools and models, how to test web apps without hallucinated bug reports, and how repeated work becomes reusable skills.
          </p>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-[24px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6 shadow-[0_18px_50px_rgba(12,17,21,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-tech)]">Core idea</p>
            <p className="mt-3 text-lg font-semibold leading-snug text-[var(--ink)]">
              Agents do not need magic prompts. They need access, boundaries, tools, and verification.
            </p>
          </div>
          <div className="rounded-[24px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6 shadow-[0_18px_50px_rgba(12,17,21,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-tech)]">Best first move</p>
            <p className="mt-3 text-lg font-semibold leading-snug text-[var(--ink)]">
              Ask the agent what it can see before asking it to debug, browse, file bugs, or change code.
            </p>
          </div>
          <div className="rounded-[24px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6 shadow-[0_18px_50px_rgba(12,17,21,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-tech)]">Safety rule</p>
            <p className="mt-3 text-lg font-semibold leading-snug text-[var(--ink)]">
              Never paste passwords into shared prompts or reports. Give the agent safe local access instead.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Mental model</p>
          <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">
            The stack: interface → model → tools → skills → verification.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {principles.map((principle) => (
              <div key={principle.title} className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white/65 p-5">
                <h3 className="font-serif text-xl font-bold text-[var(--ink)]">{principle.title}</h3>
                <p className="mt-2 leading-relaxed text-[var(--ink-soft)]">{principle.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Practical QA workflow</p>
          <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">
            How to use an agent to test a web app without filing nonsense.
          </h2>
          <ol className="mt-7 grid gap-3 md:grid-cols-2">
            {qaWorkflow.map((item, index) => (
              <li key={item} className="rounded-2xl border border-[rgba(12,17,21,0.08)] bg-white/65 p-5 leading-relaxed text-[var(--ink-soft)]">
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-tech)] text-sm font-bold text-white">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Session phrases</p>
            <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[var(--ink)]">Keep these.</h2>
            <div className="mt-6 space-y-4">
              {phrases.map((phrase) => (
                <blockquote key={phrase.en} className="rounded-2xl border-l-4 border-[var(--accent-tech)] bg-white/65 p-5">
                  <p className="font-semibold leading-relaxed text-[var(--ink)]">{phrase.ru}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{phrase.en}</p>
                </blockquote>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Prompt starters</p>
            <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[var(--ink)]">Copy these into your agent.</h2>
            <div className="mt-6 space-y-4">
              {promptStarters.map((prompt) => (
                <pre key={prompt} className="whitespace-pre-wrap rounded-2xl border border-[rgba(12,17,21,0.08)] bg-[rgba(12,17,21,0.04)] p-4 text-sm leading-relaxed text-[var(--ink)]">
                  {prompt}
                </pre>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-7 shadow-[0_24px_70px_rgba(12,17,21,0.10)] backdrop-blur md:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[var(--muted)]">Source note</p>
          <h2 className="font-serif text-3xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">
            This is a summary, not a raw transcript dump.
          </h2>
          <p className="mt-4 max-w-[840px] text-lg leading-relaxed text-[var(--ink-soft)]">
            The source was the Bee-recorded AI Lab conversation from the 2–4 PM window. Private, personal, account, and credential-adjacent material was intentionally removed. The useful public lesson is the workflow: context first, tool access second, verification always.
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
