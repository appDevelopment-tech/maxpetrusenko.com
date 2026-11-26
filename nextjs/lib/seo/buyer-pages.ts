/**
 * seo-p1-2026-11 H006: buyer-intent landing pages, one per purchase-intent keyword.
 * Keyword sits in the slug, title, and H1. Site-scope flag: seo_h006_buyer_pages.
 * `title` is the core title; the root template adds " | Max Petrusenko", keep <= 43 chars.
 */
export interface BuyerPage {
  slug: string;
  path: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  /** 40-60 words, answer first, keyword in the first sentence. */
  answer: string;
  buyer: string;
  cta: { label: string; subject: string };
  deliverables: Array<{ name: string; detail: string }>;
  process: string[];
  fit: { good: string[]; notGood: string[] };
  faq: Array<{ q: string; a: string }>;
  related: Array<{ href: string; anchor: string }>;
}

const TIMELINE =
  "Simple setups take one to two weeks and custom systems three to six. The timeline is agreed during discovery, before any build starts.";

function page(p: Omit<BuyerPage, "path">): BuyerPage {
  return { ...p, path: `/${p.slug}` };
}

export const buyerPages: BuyerPage[] = [
  page({
    slug: "hire-n8n-developer",
    keyword: "hire n8n developer",
    title: "Hire an n8n Developer for Your Workflows",
    description:
      "Hire an n8n developer to build, fix, or take over production workflows: API integrations, error handling, retries, monitoring. Remote, one engineer.",
    h1: "Hire an n8n Developer",
    answer:
      "Hire an n8n developer when workflows keep breaking, tools do not talk to each other, or a team still copies data by hand. I design, build, and hand off n8n workflows with error branches, retries, and monitoring. One engineer, remote, timeline agreed before work starts.",
    buyer: "Operations leads, founders, and agencies with a backlog of manual steps between tools.",
    cta: { label: "Send me the workflow", subject: "Hire n8n developer" },
    deliverables: [
      { name: "New workflows", detail: "Lead routing, content distribution, document handling, and AI steps wired into the tools you already use." },
      { name: "Rescue of broken workflows", detail: "Audit of failing runs, fixes for the root cause, then retries and alerts so the next failure is visible." },
      { name: "Custom nodes", detail: "TypeScript nodes when no built-in node fits your API or business rule." },
      { name: "Handoff", detail: "Documented workflows and a walkthrough so your team can run them without me." },
    ],
    process: [
      "You send the process, the tools involved, and what a good outcome looks like.",
      "I reply with scope, a rough timeline, and a fixed price or a day rate.",
      "I build in your n8n instance, test against real data, and show you each workflow running.",
      "Handoff with documentation and monitoring in place.",
    ],
    fit: {
      good: ["You already know which process hurts", "Your tools expose an API or webhook", "You want a working handoff, not an ongoing dependency"],
      notGood: ["You need a no code tool picked from scratch", "You want a 24/7 on call retainer from day one"],
    },
    faq: [
      { q: "How long does an n8n build take?", a: TIMELINE },
      { q: "Can you work in my existing n8n instance?", a: "Yes. Cloud or self-hosted. I work in a staging copy first when you have live workflows." },
      { q: "Do you fix workflows someone else built?", a: "Yes. I start with an audit of recent failed runs, then fix causes before adding anything new." },
    ],
    related: [
      { href: "/n8n-automation", anchor: "n8n automation consulting overview" },
      { href: "/tech/articles/n8n-workflow-automation", anchor: "n8n workflow automation guide" },
      { href: "/hire-ai-automation-consultant", anchor: "Hire an AI automation consultant" },
    ],
  }),
  page({
    slug: "hire-ai-automation-consultant",
    keyword: "hire AI automation consultant",
    title: "Hire an AI Automation Consultant",
    description:
      "Hire an AI automation consultant to map a process, build the workflow with Claude Code, n8n, or the ChatGPT API, and hand it off. Remote, one engineer.",
    h1: "Hire an AI Automation Consultant",
    answer:
      "Hire an AI automation consultant when a repeated business process eats hours and the steps are clear enough to write down. I scope it, build it with Claude Code, n8n, or ChatGPT API integrations, test it on your data, and hand it off. Work is remote and the timeline is agreed first.",
    buyer: "Small teams and founders who want one accountable engineer instead of an agency.",
    cta: { label: "Describe your process", subject: "Hire AI automation consultant" },
    deliverables: [
      { name: "Process mapping", detail: "A written map of the current steps, owners, and where time is lost, before anything is built." },
      { name: "Workflow build", detail: "Content workflows, API integrations, and business process automation, with error handling." },
      { name: "AI steps with guardrails", detail: "Classification, summarizing, drafting, and data enrichment with review points where a person decides." },
      { name: "Handoff and documentation", detail: "Runbook, access list, and a walkthrough." },
    ],
    process: [
      "Discovery call or written brief. I ask what the process costs you today.",
      "Scope and quote in writing, with the timeline.",
      "Build in short slices; you see each one working before the next starts.",
      "Handoff, then a short window for fixes.",
    ],
    fit: {
      good: ["A repeated process with clear inputs and outputs", "You can share access to the tools involved", "You want it documented and owned by your team"],
      notGood: ["You want a vague AI strategy deck", "The process is not written down and no one owns it"],
    },
    faq: [
      { q: "What do you build with?", a: "Claude Code, n8n, and ChatGPT API integrations, chosen per job. I pick the smallest tool that holds up in production." },
      { q: "How long does it take?", a: TIMELINE },
      { q: "Do you work remotely?", a: "Yes. Remote first, with calls in US time zones." },
    ],
    related: [
      { href: "/tech/ai-automation", anchor: "AI automation services" },
      { href: "/ai-workflow-automation", anchor: "AI workflow automation" },
      { href: "/tech/case-studies", anchor: "Automation case studies" },
      { href: "/ai-automation-for-small-business", anchor: "AI automation for small business" },
    ],
  }),
  page({
    slug: "ai-automation-for-small-business",
    keyword: "AI automation for small business",
    title: "AI Automation for Small Business Teams",
    description:
      "AI automation for small business: lead capture, follow ups, content scheduling, and reporting built on n8n and Claude Code. Scoped, priced, and handed off.",
    h1: "AI Automation for Small Business",
    answer:
      "AI automation for small business works best on tasks that repeat weekly: routing leads, sending follow ups, scheduling content, and pulling reports. I build these on n8n, Claude Code, and ChatGPT integrations, test them on your real data, and hand over documentation so you are not locked in.",
    buyer: "Owners and small teams without an in-house developer.",
    cta: { label: "Tell me what repeats", subject: "AI automation for small business" },
    deliverables: [
      { name: "Lead capture and routing", detail: "Form to CRM, notification, and spreadsheet without copy and paste." },
      { name: "Follow up and reminders", detail: "Drafts and timed messages with a person approving anything customer facing." },
      { name: "Content scheduling", detail: "One draft pushed to the channels you use, in the format each expects." },
      { name: "Weekly reporting", detail: "Numbers pulled from your tools into one report on a schedule." },
    ],
    process: [
      "You list the tasks that repeat and the tools you use.",
      "I pick the one with the clearest payoff and quote it.",
      "Build, test on real data, and show it running.",
      "Handoff, then the next task if it makes sense.",
    ],
    fit: {
      good: ["Tasks repeat every week", "You use tools with an API", "You want to start with one small build"],
      notGood: ["You want a full platform migration", "No one on your side can approve the output"],
    },
    faq: [
      { q: "Do I need a developer on my team?", a: "No. I build it, document it, and show you how to run it." },
      { q: "What does it cost?", a: "Quoted per build after discovery, as a fixed price or day rate. No quote is given before I see the process." },
      { q: "How long until it works?", a: TIMELINE },
    ],
    related: [
      { href: "/hire-n8n-developer", anchor: "Hire an n8n developer" },
      { href: "/hire-ai-automation-consultant", anchor: "Hire an AI automation consultant" },
      { href: "/tech/ai-automation", anchor: "AI automation services" },
    ],
  }),
  page({
    slug: "aeo-consulting-services",
    keyword: "AEO consulting services",
    title: "AEO Consulting Services for B2B Sites",
    description:
      "AEO consulting services: audit how ChatGPT, Claude, and Perplexity cite your site, fix structure and trust signals, and track citations weekly.",
    h1: "AEO Consulting Services",
    answer:
      "AEO consulting services help your pages get quoted by ChatGPT, Claude, Perplexity, and Google AI Overviews. I audit how answer engines read your site today, fix page structure and trust signals, add structured data where it fits, and set up weekly citation tracking so you can see what moved.",
    buyer: "Marketing leads and founders whose buyers now ask AI tools before they search.",
    cta: { label: "Request an AEO audit", subject: "AEO consulting services" },
    deliverables: [
      { name: "Citation audit", detail: "Which prompts name your competitors, which name you, and which pages get quoted." },
      { name: "Page fixes", detail: "Answer first structure, clear headings, and accurate structured data on the pages that matter." },
      { name: "Crawler and indexing check", detail: "Robots, sitemap, canonicals, and AI crawler access verified." },
      { name: "Weekly tracking", detail: "A short routine to measure citations and decide the next fix." },
    ],
    process: [
      "You share the site and the prompts your buyers use.",
      "I run the audit and send findings ranked by effort and likely effect.",
      "We agree the fix list; I implement or hand it to your developer.",
      "Weekly check on citations and referral traffic.",
    ],
    fit: {
      good: ["You publish pages that answer buyer questions", "You can change page content or have a developer who can", "You will track results for several weeks"],
      notGood: ["You need a guaranteed ranking or citation", "You want results in a few days"],
    },
    faq: [
      { q: "Can you guarantee citations?", a: "No. No one controls what an answer engine quotes. I fix what is in your control and measure the result." },
      { q: "How is AEO different from SEO?", a: "SEO targets rankings in a results list. AEO targets being quoted in a generated answer. The two overlap, and both start with clear, crawlable pages." },
      { q: "Where do I read more first?", a: "The AEO guide on this site covers how answer engines pick sources and a checklist you can run yourself." },
    ],
    related: [
      { href: "/tech/articles/answer-engine-optimization-aeo", anchor: "Answer engine optimization guide" },
      { href: "/max-petrusenko-aeo-geo", anchor: "AEO and GEO work by Max Petrusenko" },
      { href: "/tech/articles/generative-engine-optimization-geo", anchor: "GEO framework and roadmap" },
    ],
  }),
];

export function getBuyerPage(slug: string): BuyerPage {
  const found = buyerPages.find((p) => p.slug === slug);
  if (!found) throw new Error(`Unknown buyer page: ${slug}`);
  return found;
}
