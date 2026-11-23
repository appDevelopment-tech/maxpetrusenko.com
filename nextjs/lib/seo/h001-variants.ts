/**
 * H001 striking-distance refresh (flag seo_h001). Copy for pages whose GSC queries sit at
 * positions 2-20. A path absent from this map is control. Variant swaps title, H1, first
 * paragraph and adds one H2 section phrased like the target query. Blog pages replace the
 * excerpt with `lead`; the tech page prepends it to the existing lead (seoLeadPrefix).
 * `title` is the core title; the root template appends " | Max Petrusenko", so keep <= 43 chars.
 * Section copy is general guidance only: no stats, no claims about product behaviour.
 */
export interface StrikingVariant {
  query: string;
  title: string;
  h1: string;
  /** First paragraph: replaces the current subtitle or lead. */
  lead: string;
  h2: string;
  body: string;
}

export const strikingVariants: Record<string, StrikingVariant> = {
  "/tech/articles/chatgpt-api-integration": {
    query: "openai api best practices",
    title: "OpenAI API Best Practices for Production",
    h1: "OpenAI API Best Practices: Integrating ChatGPT in Production",
    lead: "These OpenAI API best practices cover authentication, prompt structure, function calling, retrieval, and error handling for ChatGPT integrations that have to stay up.",
    h2: "OpenAI API best practices at a glance",
    body: "Keep keys on the server, structure your prompts clearly, validate function call arguments, and retry failed requests with backoff.",
  },
  "/blog/seo-architecture": {
    query: "seo architecture",
    title: "SEO Architecture: Site Structure for Search",
    h1: "SEO Architecture: How to Structure a Site for Search",
    lead: "SEO architecture is how a site's pages, URLs, internal links, and templates are organized so crawlers can find and understand them.",
    h2: "What is SEO architecture?",
    body: "It covers URL structure, page hierarchy, internal linking, canonicals, and sitemaps. Get these right before tuning individual pages.",
  },
  "/blog/generative-engine-optimization-cost-roi": {
    query: "geo roi",
    title: "GEO ROI: Cost and How to Measure It",
    h1: "GEO ROI: What Generative Engine Optimization Costs and How to Measure It",
    lead: "GEO ROI compares what you spend on generative engine optimization with what AI answer engines send back: citations, referral traffic, and leads.",
    h2: "How do you measure the ROI of generative engine optimization?",
    body: "Pick a baseline before you start, then track citations in AI answers, referral visits from AI tools, and conversions from those visits. Compare against total cost, including content and tooling time.",
  },
  "/blog/seo-data-modeling": {
    query: "seo data model",
    title: "SEO Data Model: Design for Search",
    h1: "SEO Data Model: How to Design Data for Search",
    lead: "An SEO data model defines the entities, fields, and relationships that drive your pages, so titles, URLs, links, and structured data come from one source.",
    h2: "What goes into an SEO data model?",
    body: "Typically page entities, their URLs and canonicals, metadata fields, relationships between pages, and the structured data generated from them.",
  },
  "/blog/ai-wearables-cost-roi": {
    query: "are ai wearables more expensive than regular wearables",
    title: "AI Wearables Cost and ROI Compared",
    h1: "AI Wearables Cost and ROI: Are They More Expensive Than Regular Wearables?",
    lead: "Are AI wearables more expensive than regular wearables? Compare sticker price and running cost (subscriptions, replacements) against the features you actually use.",
    h2: "Are AI wearables more expensive than regular wearables?",
    body: "Compare device price, subscriptions, replacement cycle, and the features you would use weekly. Check current prices before buying, since they change often.",
  },
  "/blog/meditation-for-software-developers": {
    query: "meditation for developers",
    title: "Meditation for Developers: A Starter Guide",
    h1: "Meditation for Developers: A Practical Starter Guide",
    lead: "Meditation for developers starts small: a few minutes of sitting, tied to the work you already do, such as debugging and code review.",
    h2: "Why meditation for developers?",
    body: "Engineering work rewards sustained attention. A short daily sit is one way to practice noticing when your attention has drifted.",
  },
  "/blog/rrf-vs-weighted-fusion-for-hybrid-ranking": {
    query: "reciprocal rank fusion",
    title: "Reciprocal Rank Fusion vs Weighted Fusion",
    h1: "Reciprocal Rank Fusion (RRF) vs Weighted Fusion for Hybrid Ranking",
    lead: "Reciprocal rank fusion (RRF) merges ranked lists by position instead of raw score, which makes it a common default for hybrid search.",
    h2: "What is reciprocal rank fusion?",
    body: "RRF scores each result by 1 divided by a constant plus its rank in each list, then sums across lists. Weighted fusion instead blends normalized scores with tuned weights.",
  },
  "/blog/bugbot-for-cursor-migration": {
    query: "replace codeql with cursor bugbot",
    title: "Replace CodeQL with Cursor Bugbot",
    h1: "Replace CodeQL with Cursor Bugbot: Migration Path and Timeline",
    lead: "Moving PR security checks from CodeQL to Cursor Bugbot works best in phases: run both, compare findings, then retire the checks Bugbot covers.",
    h2: "Migration path and timeline for replacing CodeQL with Bugbot",
    body: "Run both tools on pull requests, compare what each flags, map your custom CodeQL queries to what Bugbot covers, then switch required checks. Timeline depends on repo count and custom query volume.",
  },
  "/blog/offline-vs-online-llm-evals": {
    query: "best online and offline evaluation platforms for llm apps",
    title: "LLM Evals: Offline vs Online Platforms",
    h1: "Offline vs Online LLM Evals: Choosing Evaluation Platforms for LLM Apps",
    lead: "Offline evals test a model against fixed datasets before release; online evals score real traffic after it. Most LLM apps need both.",
    h2: "How to choose online and offline evaluation platforms",
    body: "Look for dataset versioning, custom scorers, production trace capture, and one shared scorecard across both modes.",
  },
  "/blog/hybrid-search-101-bm25-vector-reranking": {
    query: "hybrid search expert",
    title: "Hybrid Search: BM25, Vectors, Reranking",
    h1: "Hybrid Search 101: BM25, Vector Search, and Reranking",
    lead: "Hybrid search combines BM25 keyword matching with vector similarity, then reranks the merged results.",
    h2: "What is hybrid search, and how does BM25 fit in?",
    body: "BM25 scores exact term overlap, vectors capture meaning, and a reranker orders the combined candidates. Keep each score visible while you debug.",
  },
  "/blog/seo-fundamentals": {
    query: "seo fundamentals",
    title: "SEO Fundamentals and Core Concepts",
    h1: "SEO Fundamentals: Core Concepts Explained",
    lead: "SEO fundamentals are crawlability, indexing, relevance, and trust: the basics that make a page eligible to rank.",
    h2: "SEO fundamentals and concepts",
    body: "Search engines crawl pages, index their content, and rank results by relevance and quality signals. Everything else builds on that sequence.",
  },
  "/blog/openclaw-queue-and-concurrency-tuning": {
    query: "openclaw queue backpressure policy",
    title: "OpenClaw Queue Backpressure and Concurrency",
    h1: "OpenClaw Queue Backpressure and Concurrency Tuning",
    lead: "Queue backpressure in OpenClaw comes down to limits: how many runs wait, how many run at once, and what happens when the queue is full.",
    h2: "Backpressure policy for OpenClaw queues",
    body: "Set queue limits per integration type, throttle retries, and watch p95 latency and saturation. Check the official OpenClaw docs for the exact settings in your version.",
  },
  "/blog/n8n-compliance-readiness": {
    query: "does n8n support audit logging for compliance",
    title: "n8n Audit Logging and Compliance Readiness",
    h1: "n8n Compliance Readiness: Audit Logging and Controls",
    lead: "Compliance readiness for n8n starts with audit logging: a record of who changed a workflow, who ran it, and what data it touched.",
    h2: "Does n8n support audit logging for compliance needs?",
    body: "Check your n8n edition and version against your own audit requirements, then confirm where logs are stored and how long they are kept.",
  },
  "/blog/codex-data-modeling": {
    query: "codex data",
    title: "Codex Data Modeling Guide",
    h1: "Codex Data Modeling: Structuring Data for Codex Workflows",
    lead: "Codex data modeling is about shaping the schemas and records your Codex workflows read and write, so results stay consistent and easy to check.",
    h2: "What is Codex data modeling?",
    body: "Define the entities, fields, and relationships up front, then keep the model in the repo where the agent can read it.",
  },
};
