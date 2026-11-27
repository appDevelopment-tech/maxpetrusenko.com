/**
 * Search Console snippet fixes (2026-11-27). Pages with high impressions and CTR under 1%:
 * title and meta description rewritten to match the query the page actually ranks for.
 * Applied in generateMetadata for every arm (control and A/B variants), so the snippet
 * is the same for all visitors. `title` is the core title; the root template appends
 * " | Max Petrusenko", so keep it <= 43 chars. Description <= 155 chars.
 */
export interface SnippetOverride {
  title: string;
  description: string;
}

export const snippetOverrides: Record<string, SnippetOverride> = {
  "/tech/articles/chatgpt-api-integration": {
    title: "OpenAI API Best Practices for Production",
    description:
      "OpenAI API best practices for production: keep keys server-side, structure prompts, validate function calls, add retrieval, and retry with backoff.",
  },
  "/blog/rrf-vs-weighted-fusion-for-hybrid-ranking": {
    title: "Reciprocal Rank Fusion vs Weighted Fusion",
    description:
      "What reciprocal rank fusion is, why k=60 is the usual default, and when weighted score fusion beats RRF for hybrid search ranking.",
  },
  "/blog/hybrid-search-101-bm25-vector-reranking": {
    title: "Hybrid Search: BM25, Vectors, Reranking",
    description:
      "A practical hybrid search baseline: combine BM25 keyword search with vector retrieval, fuse the two rankings, and add a reranker.",
  },
  "/blog/generative-engine-optimization-cost-roi": {
    title: "GEO ROI: Cost and How to Measure It",
    description:
      "What generative engine optimization costs and how to measure GEO ROI: budget, citations in AI answers, referral traffic, and unit economics.",
  },
  "/blog/rag-chunking-strategies-fixed-semantic-structure-aware": {
    title: "RAG Chunking Strategies: Which to Use",
    description:
      "RAG chunking strategies compared: fixed-size, semantic, and structure-aware chunking, and how to choose by document type and query intent.",
  },
  "/blog/claude-code-migration": {
    title: "Claude Code for Large Codebase Migration",
    description:
      "How to use Claude Code for legacy modernization and large codebase migration: workflow, review gates, and keeping critical operations running.",
  },
  "/blog/ai-wearables-beginner-roadmap": {
    title: "AI Wearables Roadmap for Your First 30 Days",
    description:
      "Do AI wearables learn from your habits? A 30-day beginner roadmap from data capture to user trust and retention for AI wearable products.",
  },
  "/blog/seo-architecture": {
    title: "SEO Architecture: Site Structure for Search",
    description:
      "SEO architecture explained: how URL structure, page hierarchy, internal links, canonicals and sitemaps make a site easy for crawlers to understand.",
  },
  "/blog/seo-fundamentals": {
    title: "SEO Fundamentals: Core Concepts That Last",
    description:
      "SEO fundamentals that still apply: crawlability, content that matches search intent, internal links, and the technical basics worth getting right first.",
  },
  "/blog/bugbot-for-cursor-fundamentals": {
    title: "Cursor Bugbot: What It Is and How It Works",
    description:
      "Cursor Bugbot explained: how it reviews pull requests and flags bugs, plus the core concepts and a baseline setup for using it on a team.",
  },
  "/blog/codex-data-modeling": {
    title: "OpenAI Codex: Data and Context Strategy",
    description:
      "How to shape data and context flow when using OpenAI Codex in software delivery, for predictable agent behavior and measurable adoption.",
  },
  "/blog/openclaw-queue-and-concurrency-tuning": {
    title: "OpenClaw Queue Backpressure and Concurrency",
    description:
      "OpenClaw queue backpressure and concurrency tuning: how to set limits for stable throughput, predictable latency, and low failure rates.",
  },
  "/blog/offline-vs-online-llm-evals": {
    title: "LLM Evals: Offline vs Online Platforms",
    description:
      "Offline vs online evaluation for LLM apps: what each measures, when to use which, and how to combine them in one evaluation platform setup.",
  },
  "/blog/topics": {
    title: "AI, GEO, RAG and Agent Engineering Topics",
    description:
      "Browse Max Petrusenko's articles by topic: RAG and hybrid search, GEO and SEO, AI coding agents, LLM evaluation, and automation.",
  },
  "/blog": {
    title: "Blog: RAG, GEO, AI Agents and Automation",
    description:
      "Articles by Max Petrusenko on RAG and hybrid search, generative engine optimization, AI coding agents, LLM evals, and automation systems.",
  },
};
