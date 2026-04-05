import type { Article } from "@/types";

interface BacklogSeed {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  series: string;
  checklist: string[];
}

const SEEDS: BacklogSeed[] = [
  {
    slug: "tantra-massage-meaning-vs-myths",
    title: "Tantra Massage Meaning vs Myths",
    excerpt:
      "A practical explanation of tantra massage scope, boundaries, and what clients should expect before booking.",
    tags: ["Spirituality", "Tantra", "Beginner Guide", "Boundaries"],
    series: "Tantra",
    checklist: [
      "State exactly what the session includes and excludes.",
      "Set verbal consent checkpoints before touch.",
      "Document intake, boundaries, and aftercare recommendations.",
    ],
  },
  {
    slug: "tantra-massage-benefits-for-men",
    title: "Tantra Massage Benefits for Men",
    excerpt:
      "How tantra work supports regulation, emotional range, and healthier intimacy patterns for men.",
    tags: ["Spirituality", "Tantra", "Men's Health", "Nervous System"],
    series: "Tantra",
    checklist: [
      "Start from regulation, not performance goals.",
      "Track breath depth and body tension before and after sessions.",
      "Use integration practices for 72 hours post-session.",
    ],
  },
  {
    slug: "tantra-massage-benefits-for-women",
    title: "Tantra Massage Benefits for Women",
    excerpt:
      "A boundaries-first guide to safety, pacing, and therapeutic outcomes in tantra sessions for women.",
    tags: ["Spirituality", "Tantra", "Women's Health", "Safety"],
    series: "Tantra",
    checklist: [
      "Screen practitioner ethics and boundary language in advance.",
      "Agree on pace and stop signals before session start.",
      "Plan hydration, rest, and integration time after the session.",
    ],
  },
  {
    slug: "how-to-choose-a-tantra-practitioner",
    title: "How to Choose a Tantra Practitioner",
    excerpt:
      "Due-diligence framework for selecting a practitioner with strong ethics, communication, and trauma-aware pacing.",
    tags: ["Spirituality", "Tantra", "Safety", "Client Guide"],
    series: "Tantra",
    checklist: [
      "Ask for explicit consent policy and scope statement.",
      "Review testimonials for boundaries and professionalism signals.",
      "Avoid practitioners who cannot explain aftercare.",
    ],
  },
  {
    slug: "tantra-for-couples-boundaries-and-aftercare",
    title: "Tantra for Couples: Boundaries and Aftercare",
    excerpt:
      "Session design for couples who want more trust, better communication, and clean integration after deep work.",
    tags: ["Spirituality", "Tantra", "Couples", "Integration"],
    series: "Tantra",
    checklist: [
      "Map individual boundaries before shared exercises.",
      "Define a shared intention and no-go zones.",
      "Schedule debrief and repair conversation after session.",
    ],
  },
  {
    slug: "ai-infrastructure-for-startups-minimum-stack",
    title: "AI Infrastructure for Startups: Minimum Stack",
    excerpt:
      "The minimum production setup for AI products: model gateway, retrieval layer, observability, and evaluation.",
    tags: ["Tech", "AI Infrastructure", "Startups", "Architecture"],
    series: "AI Infra",
    checklist: [
      "Separate app logic, model routing, and retrieval services.",
      "Add tracing and eval hooks before launch.",
      "Define failure budgets and rollback triggers.",
    ],
  },
  {
    slug: "llm-serving-architecture-latency-and-cost",
    title: "LLM Serving Architecture: Latency and Cost Controls",
    excerpt:
      "Architecture patterns to reduce response time and token spend without sacrificing output quality.",
    tags: ["Tech", "AI Infrastructure", "LLM", "Performance"],
    series: "AI Infra",
    checklist: [
      "Implement routing by request class and latency tier.",
      "Cache deterministic and semi-deterministic responses.",
      "Track cost per successful task, not per request.",
    ],
  },
  {
    slug: "ai-infrastructure-security-baseline",
    title: "AI Infrastructure Security Baseline",
    excerpt:
      "Core controls for secrets, access boundaries, auditability, and incident response in AI systems.",
    tags: ["Tech", "AI Infrastructure", "Security", "Operations"],
    series: "AI Infra",
    checklist: [
      "Use scoped API keys and short-lived credentials.",
      "Store prompts and completions with redaction policy.",
      "Run regular permission and secret-rotation drills.",
    ],
  },
  {
    slug: "llm-evaluation-metrics-that-actually-matter",
    title: "LLM Evaluation Metrics That Actually Matter",
    excerpt:
      "A concise framework for selecting evaluation metrics that map to business outcomes and reliability targets.",
    tags: ["Tech", "LLM Evals", "Metrics", "Reliability"],
    series: "LLM Evals",
    checklist: [
      "Prioritize task completion and correctness over style scores.",
      "Split metrics by quality, latency, and cost.",
      "Set release thresholds tied to user impact.",
    ],
  },
  {
    slug: "build-llm-eval-dataset-from-production-traces",
    title: "Build an LLM Eval Dataset from Production Traces",
    excerpt:
      "How to convert real user interactions into reusable test sets for regression and model comparison.",
    tags: ["Tech", "LLM Evals", "Datasets", "Operations"],
    series: "LLM Evals",
    checklist: [
      "Sample high-value and high-risk request classes.",
      "Label expected outcomes with reviewer guidelines.",
      "Version datasets with changelog and coverage tags.",
    ],
  },
  {
    slug: "offline-vs-online-llm-evals",
    title: "Offline vs Online LLM Evals",
    excerpt:
      "When to run synthetic benchmarks, when to measure in production, and how to combine both.",
    tags: ["Tech", "LLM Evals", "Experimentation", "MLOps"],
    series: "LLM Evals",
    checklist: [
      "Use offline evals for fast iteration loops.",
      "Use online evals to validate real traffic behavior.",
      "Tie both to one shared quality scorecard.",
    ],
  },
  {
    slug: "llm-as-judge-rubric-design",
    title: "LLM-as-Judge Rubric Design",
    excerpt:
      "Rubric patterns that improve consistency and reduce evaluator drift in LLM-as-judge pipelines.",
    tags: ["Tech", "LLM Evals", "LLM as Judge", "Quality"],
    series: "LLM Evals",
    checklist: [
      "Define pass/fail criteria before scoring prompts.",
      "Calibrate rubrics on known edge cases.",
      "Audit judge disagreement with human review samples.",
    ],
  },
  {
    slug: "pairwise-vs-absolute-llm-scoring",
    title: "Pairwise vs Absolute LLM Scoring",
    excerpt:
      "Tradeoffs between pairwise comparisons and absolute scorecards for prompt and model selection.",
    tags: ["Tech", "LLM Evals", "Benchmarking", "Model Selection"],
    series: "LLM Evals",
    checklist: [
      "Use pairwise for close candidate comparisons.",
      "Use absolute scoring for release gates.",
      "Track confidence intervals across runs.",
    ],
  },
  {
    slug: "tool-calling-evals-schema-and-retries",
    title: "Tool-Calling Evals: Schema and Retries",
    excerpt:
      "Evaluate function-calling reliability with schema compliance, retries, and side-effect safety checks.",
    tags: ["Tech", "LLM Evals", "Tool Calling", "Reliability"],
    series: "LLM Evals",
    checklist: [
      "Measure argument-schema validity rate.",
      "Track retry success and terminal failure classes.",
      "Isolate side effects in test sandboxes.",
    ],
  },
  {
    slug: "agent-evals-trajectory-quality",
    title: "Agent Evals: Trajectory Quality",
    excerpt:
      "How to score multi-step agent behavior, tool choice, and completion efficiency.",
    tags: ["Tech", "LLM Evals", "Agents", "Automation"],
    series: "LLM Evals",
    checklist: [
      "Define target path length and detour thresholds.",
      "Score tool choices against policy constraints.",
      "Review failed trajectories for repeat patterns.",
    ],
  },
  {
    slug: "ci-cd-eval-gates-for-llm-apps",
    title: "CI/CD Eval Gates for LLM Apps",
    excerpt:
      "A release pipeline pattern that blocks regressions with automated eval checks.",
    tags: ["Tech", "LLM Evals", "CI/CD", "Release Engineering"],
    series: "LLM Evals",
    checklist: [
      "Run smoke evals on every pull request.",
      "Run full suite before deploy to production.",
      "Fail release when critical thresholds drop.",
    ],
  },
  {
    slug: "hallucination-testing-reference-based-and-reference-free",
    title: "Hallucination Testing: Reference-Based and Reference-Free",
    excerpt:
      "Testing methods to catch factual drift, unsupported claims, and citation mismatches.",
    tags: ["Tech", "LLM Evals", "Hallucination", "Safety"],
    series: "LLM Evals",
    checklist: [
      "Use grounded reference sets for factual prompts.",
      "Add red-team prompts for unsupported assertions.",
      "Score citation completeness and quote accuracy.",
    ],
  },
  {
    slug: "llm-regression-dashboard-alerts-and-thresholds",
    title: "LLM Regression Dashboard: Alerts and Thresholds",
    excerpt:
      "Dashboard design for evaluation regressions, quality alerts, and deployment control loops.",
    tags: ["Tech", "LLM Evals", "Observability", "MLOps"],
    series: "LLM Evals",
    checklist: [
      "Track quality, latency, and cost on one panel.",
      "Set severity levels and on-call ownership.",
      "Attach rollback actions to severe alert classes.",
    ],
  },
  {
    slug: "hybrid-search-101-bm25-vector-reranking",
    title: "Hybrid Search 101: BM25, Vectors, and Reranking",
    excerpt:
      "A practical baseline for combining lexical and semantic retrieval with rerankers.",
    tags: ["Tech", "Hybrid Search", "Retrieval", "RAG"],
    series: "Hybrid",
    checklist: [
      "Keep lexical and vector scores visible for debugging.",
      "Normalize scores before fusion.",
      "Evaluate with relevance labels, not click-only metrics.",
    ],
  },
  {
    slug: "rrf-vs-weighted-fusion-for-hybrid-ranking",
    title: "RRF vs Weighted Fusion for Hybrid Ranking",
    excerpt:
      "How reciprocal rank fusion compares with weighted scoring for hybrid retrieval systems.",
    tags: ["Tech", "Hybrid Search", "Ranking", "Retrieval"],
    series: "Hybrid",
    checklist: [
      "Benchmark both strategies on the same query set.",
      "Inspect long-tail query performance separately.",
      "Tune weights only after error analysis.",
    ],
  },
  {
    slug: "hybrid-retrieval-with-acl-and-metadata-filters",
    title: "Hybrid Retrieval with ACL and Metadata Filters",
    excerpt:
      "Designing hybrid retrieval that respects tenant boundaries and metadata constraints.",
    tags: ["Tech", "Hybrid Search", "Security", "Multi-tenant"],
    series: "Hybrid",
    checklist: [
      "Apply ACL filters before ranking fusion.",
      "Partition indexes by tenant or policy boundary.",
      "Test leakage with adversarial access queries.",
    ],
  },
  {
    slug: "hybrid-search-in-elasticsearch-practical-patterns",
    title: "Hybrid Search in Elasticsearch: Practical Patterns",
    excerpt:
      "Query patterns and tuning workflow for hybrid retrieval in Elasticsearch deployments.",
    tags: ["Tech", "Hybrid Search", "Elasticsearch", "Implementation"],
    series: "Hybrid",
    checklist: [
      "Version analyzer settings alongside retrieval configs.",
      "Tune semantic weights by query class.",
      "Track recall and MRR after each change.",
    ],
  },
  {
    slug: "hybrid-search-in-weaviate-alpha-tuning",
    title: "Hybrid Search in Weaviate: Alpha Tuning",
    excerpt:
      "How to tune alpha and query parameters for balanced lexical-semantic retrieval in Weaviate.",
    tags: ["Tech", "Hybrid Search", "Weaviate", "Tuning"],
    series: "Hybrid",
    checklist: [
      "Start with baseline alpha and iterate in small steps.",
      "Measure precision by intent category.",
      "Review failure queries after each experiment.",
    ],
  },
  {
    slug: "hybrid-search-in-qdrant-quality-measurement",
    title: "Hybrid Search in Qdrant: Quality Measurement",
    excerpt:
      "Implementation notes for Qdrant hybrid queries with relevance measurement and diagnostics.",
    tags: ["Tech", "Hybrid Search", "Qdrant", "Quality"],
    series: "Hybrid",
    checklist: [
      "Log score components for each result row.",
      "Compare query performance by content type.",
      "Automate evaluation runs after index updates.",
    ],
  },
  {
    slug: "query-routing-lexical-vs-semantic-first",
    title: "Query Routing: Lexical-First vs Semantic-First",
    excerpt:
      "Routing strategies for deciding when lexical retrieval or semantic retrieval should lead.",
    tags: ["Tech", "Hybrid Search", "Query Routing", "Architecture"],
    series: "Hybrid",
    checklist: [
      "Classify query intent before retrieval selection.",
      "Route exact-match intents to lexical-first paths.",
      "Use semantic-first for abstract or paraphrased queries.",
    ],
  },
  {
    slug: "hybrid-reranker-architecture-for-support-assistants",
    title: "Hybrid + Reranker Architecture for Support Assistants",
    excerpt:
      "A retrieval architecture for support bots that balances recall, accuracy, and response speed.",
    tags: ["Tech", "Hybrid Search", "Reranking", "Support"],
    series: "Hybrid",
    checklist: [
      "Use hybrid retrieval for candidate generation.",
      "Apply reranker on top-N results only.",
      "Inject policy checks before final answer synthesis.",
    ],
  },
  {
    slug: "hybrid-retrieval-for-long-tail-and-exact-match-queries",
    title: "Hybrid Retrieval for Long-Tail and Exact-Match Queries",
    excerpt:
      "How hybrid stacks handle precise terminology and sparse long-tail intents without quality collapse.",
    tags: ["Tech", "Hybrid Search", "Long Tail", "Search Quality"],
    series: "Hybrid",
    checklist: [
      "Create dedicated query sets for exact-match terms.",
      "Tune lexical boosts for rare entity names.",
      "Audit semantic drift on specialized vocabularies.",
    ],
  },
  {
    slug: "hybrid-retrieval-debugging-irrelevant-chunks",
    title: "Hybrid Retrieval Debugging: Why Irrelevant Chunks Win",
    excerpt:
      "A debugging workflow for noisy retrieval results in hybrid pipelines.",
    tags: ["Tech", "Hybrid Search", "Debugging", "RAG"],
    series: "Hybrid",
    checklist: [
      "Inspect chunk boundaries for mixed-topic bleed.",
      "Compare lexical and vector score disagreements.",
      "Re-rank with metadata penalties for stale content.",
    ],
  },
  {
    slug: "rag-pipeline-architecture-end-to-end",
    title: "RAG Pipeline Architecture End-to-End",
    excerpt:
      "End-to-end blueprint for ingest, indexing, retrieval, generation, and evaluation in RAG systems.",
    tags: ["Tech", "RAG", "Architecture", "AI"],
    series: "RAG",
    checklist: [
      "Separate ingestion, retrieval, and generation services.",
      "Version prompts, indexes, and evaluation suites.",
      "Define ownership for each pipeline stage.",
    ],
  },
  {
    slug: "rag-chunking-strategies-fixed-semantic-structure-aware",
    title: "RAG Chunking Strategies: Fixed, Semantic, Structure-Aware",
    excerpt:
      "How to choose chunking methods by document type, query intent, and retrieval constraints.",
    tags: ["Tech", "RAG", "Chunking", "Retrieval"],
    series: "RAG",
    checklist: [
      "Choose chunking strategy per content family.",
      "Set overlap based on answer granularity.",
      "Validate with retrieval precision and context recall.",
    ],
  },
  {
    slug: "rag-embedding-model-selection-by-domain-and-budget",
    title: "RAG Embedding Model Selection by Domain and Budget",
    excerpt:
      "A model-selection matrix for retrieval quality, latency, and cost tradeoffs.",
    tags: ["Tech", "RAG", "Embeddings", "Cost"],
    series: "RAG",
    checklist: [
      "Benchmark candidate models on your own corpus.",
      "Track retrieval accuracy and token cost together.",
      "Re-evaluate after major corpus changes.",
    ],
  },
  {
    slug: "rag-context-assembly-topk-dedupe-and-citations",
    title: "RAG Context Assembly: Top-K, Dedupe, and Citations",
    excerpt:
      "Context-packing techniques that improve faithfulness while reducing prompt bloat.",
    tags: ["Tech", "RAG", "Prompting", "Citations"],
    series: "RAG",
    checklist: [
      "Tune top-k by query complexity class.",
      "Deduplicate overlapping chunks before prompt assembly.",
      "Attach source IDs for each context block.",
    ],
  },
  {
    slug: "rag-evaluation-faithfulness-relevance-and-context-precision",
    title: "RAG Evaluation: Faithfulness, Relevance, Context Precision",
    excerpt:
      "Metric set and review loop for reliable measurement of RAG quality.",
    tags: ["Tech", "RAG", "Evaluation", "Quality"],
    series: "RAG",
    checklist: [
      "Score answer faithfulness against provided context.",
      "Measure relevance for both retrieval and final output.",
      "Track context precision to reduce noise.",
    ],
  },
  {
    slug: "rag-freshness-incremental-indexing-and-stale-context",
    title: "RAG Freshness: Incremental Indexing and Stale Context",
    excerpt:
      "Freshness controls for living knowledge bases with frequent updates.",
    tags: ["Tech", "RAG", "Freshness", "Indexing"],
    series: "RAG",
    checklist: [
      "Schedule incremental indexing with change detection.",
      "Expire stale vectors with policy-based windows.",
      "Annotate context recency in retrieval metadata.",
    ],
  },
  {
    slug: "rag-guardrails-pii-injection-and-source-constraints",
    title: "RAG Guardrails: PII, Prompt Injection, Source Constraints",
    excerpt:
      "Guardrail design for secure, policy-compliant retrieval-augmented systems.",
    tags: ["Tech", "RAG", "Security", "Guardrails"],
    series: "RAG",
    checklist: [
      "Run input and context scanning for PII and abuse.",
      "Strip instruction-like payloads from retrieved text.",
      "Whitelist trusted source domains for critical workflows.",
    ],
  },
  {
    slug: "multi-tenant-rag-architecture-isolation-and-quotas",
    title: "Multi-Tenant RAG Architecture: Isolation and Quotas",
    excerpt:
      "Patterns for tenant isolation, cost control, and safe scaling in shared RAG infrastructure.",
    tags: ["Tech", "RAG", "Multi-tenant", "Architecture"],
    series: "RAG",
    checklist: [
      "Isolate indexes by tenant or strict namespace policy.",
      "Apply per-tenant token and retrieval quotas.",
      "Log tenant-level quality and spend metrics.",
    ],
  },
  {
    slug: "rag-latency-optimization-batching-and-caching",
    title: "RAG Latency Optimization: Batching and Caching",
    excerpt:
      "Latency reduction techniques for retrieval and generation stages in high-traffic RAG apps.",
    tags: ["Tech", "RAG", "Performance", "Optimization"],
    series: "RAG",
    checklist: [
      "Batch vector queries where possible.",
      "Cache retrieval candidates for repeated intents.",
      "Use smaller models for low-risk response classes.",
    ],
  },
  {
    slug: "rag-failure-analysis-empty-retrieval-noisy-context-hallucinated-joins",
    title: "RAG Failure Analysis: Empty Retrieval, Noisy Context, Hallucinated Joins",
    excerpt:
      "Failure taxonomy and remediation playbook for common RAG production incidents.",
    tags: ["Tech", "RAG", "Debugging", "Reliability"],
    series: "RAG",
    checklist: [
      "Classify failures by retrieval, synthesis, and policy layers.",
      "Attach remediation runbooks to each failure class.",
      "Feed failure samples back into eval datasets.",
    ],
  },
  {
    slug: "openclaw-onboarding-wizard-first-30-minutes",
    title: "OpenClaw Onboarding Wizard: First 30 Minutes",
    excerpt:
      "A quick-start setup flow for OpenClaw teams to move from install to first working automation.",
    tags: ["Tech", "OpenClaw", "Onboarding", "Automation"],
    series: "OpenClaw",
    checklist: [
      "Validate workspace, permissions, and environment setup.",
      "Run first workflow in a safe staging channel.",
      "Document owner and rollback command before launch.",
    ],
  },
  {
    slug: "openclaw-gateway-runbook-deploy-monitor-recover",
    title: "OpenClaw Gateway Runbook: Deploy, Monitor, Recover",
    excerpt:
      "Operations runbook for OpenClaw gateway reliability in production environments.",
    tags: ["Tech", "OpenClaw", "Runbook", "Operations"],
    series: "OpenClaw",
    checklist: [
      "Define startup, health, and shutdown checks.",
      "Set alerting for queue lag and gateway errors.",
      "Practice rollback and recovery drills monthly.",
    ],
  },
  {
    slug: "openclaw-plugins-install-config-and-safe-rollout",
    title: "OpenClaw Plugins: Install, Config, and Safe Rollout",
    excerpt:
      "Plugin lifecycle guidance from installation through staged rollout and rollback.",
    tags: ["Tech", "OpenClaw", "Plugins", "Deployment"],
    series: "OpenClaw",
    checklist: [
      "Pin plugin versions in deployment config.",
      "Validate plugin scopes before enabling in production.",
      "Roll out to pilot users first, then expand.",
    ],
  },
  {
    slug: "openclaw-microsoft-teams-plugin-setup-and-troubleshooting",
    title: "OpenClaw Microsoft Teams Plugin Setup and Troubleshooting",
    excerpt:
      "Microsoft Teams integration checklist with OAuth, permissions, and common error fixes.",
    tags: ["Tech", "OpenClaw", "Microsoft Teams", "Integrations"],
    series: "OpenClaw",
    checklist: [
      "Confirm app registration and callback URLs.",
      "Review Teams permission scopes with least privilege.",
      "Test fallback behavior on token-expiry failures.",
    ],
  },
  {
    slug: "openclaw-skills-architecture-bundled-local-workspace-precedence",
    title: "OpenClaw Skills Architecture: Bundled, Local, Workspace Precedence",
    excerpt:
      "How OpenClaw resolves skill precedence across bundled, local, and workspace layers.",
    tags: ["Tech", "OpenClaw", "Skills", "Architecture"],
    series: "OpenClaw",
    checklist: [
      "Define naming conventions to avoid collisions.",
      "Document precedence and override behavior.",
      "Add tests for skill-resolution edge cases.",
    ],
  },
  {
    slug: "openclaw-custom-skills-with-skill-md-examples",
    title: "OpenClaw Custom Skills with SKILL.md Examples",
    excerpt:
      "Patterns for creating reusable custom skills and documenting them cleanly with SKILL.md.",
    tags: ["Tech", "OpenClaw", "Skills", "Documentation"],
    series: "OpenClaw",
    checklist: [
      "Keep skill scope narrow and testable.",
      "Provide command examples and failure handling notes.",
      "Version skills with changelog entries.",
    ],
  },
  {
    slug: "openclaw-publishing-and-versioning-with-clawhub",
    title: "OpenClaw Publishing and Versioning with ClawHub",
    excerpt:
      "Release process for packaging, publishing, and versioning OpenClaw skills.",
    tags: ["Tech", "OpenClaw", "ClawHub", "Release"],
    series: "OpenClaw",
    checklist: [
      "Tag releases with semantic versioning.",
      "Publish release notes with migration guidance.",
      "Keep previous stable versions available.",
    ],
  },
  {
    slug: "openclaw-queue-and-concurrency-tuning",
    title: "OpenClaw Queue and Concurrency Tuning",
    excerpt:
      "Concurrency tuning for stable throughput, predictable latency, and low failure rates.",
    tags: ["Tech", "OpenClaw", "Performance", "Queueing"],
    series: "OpenClaw",
    checklist: [
      "Set queue limits by integration type.",
      "Throttle retries to avoid cascading failure.",
      "Monitor p95 latency and saturation indicators.",
    ],
  },
  {
    slug: "openclaw-macos-companion-permissions-local-and-remote-modes",
    title: "OpenClaw macOS Companion Permissions: Local and Remote Modes",
    excerpt:
      "Permission model and secure setup for OpenClaw companion workflows on macOS.",
    tags: ["Tech", "OpenClaw", "macOS", "Security"],
    series: "OpenClaw",
    checklist: [
      "Audit local permissions before enabling remote mode.",
      "Separate development and production profiles.",
      "Review device access and revoke stale grants.",
    ],
  },
  {
    slug: "openclaw-updates-and-rollback-strategy-for-teams",
    title: "OpenClaw Updates and Rollback Strategy for Teams",
    excerpt:
      "Update management workflow that minimizes downtime and supports fast rollback.",
    tags: ["Tech", "OpenClaw", "Operations", "Reliability"],
    series: "OpenClaw",
    checklist: [
      "Test upgrades in staging with representative workflows.",
      "Keep one-click rollback path documented.",
      "Communicate maintenance windows and owner roles.",
    ],
  },
  {
    slug: "somatic-work-for-anxiety-beginner-exercises",
    title: "Somatic Work for Anxiety: Beginner Exercises",
    excerpt:
      "Simple somatic drills for down-regulation that can be practiced safely at home.",
    tags: ["Spirituality", "Somatic", "Anxiety", "Beginner Guide"],
    series: "Somatic",
    checklist: [
      "Start with orientation and breath lengthening.",
      "Keep sessions short and repeatable.",
      "Track subjective calm before and after.",
    ],
  },
  {
    slug: "somatic-exercises-for-nervous-system-regulation",
    title: "Somatic Exercises for Nervous System Regulation",
    excerpt:
      "Daily somatic protocol for stabilizing activation and improving recovery capacity.",
    tags: ["Spirituality", "Somatic", "Nervous System", "Regulation"],
    series: "Somatic",
    checklist: [
      "Use consistent morning and evening anchors.",
      "Combine breath, movement, and grounding cues.",
      "Adjust intensity based on activation level.",
    ],
  },
  {
    slug: "somatic-trauma-informed-pacing",
    title: "Somatic Trauma-Informed Pacing",
    excerpt:
      "How to pace somatic work to avoid overwhelm and support safe integration.",
    tags: ["Spirituality", "Somatic", "Trauma-Informed", "Safety"],
    series: "Somatic",
    checklist: [
      "Work inside window-of-tolerance cues.",
      "Pause at first signs of flooding or shutdown.",
      "Integrate with rest and orienting after each cycle.",
    ],
  },
  {
    slug: "somatic-grounding-methods-orientation-and-breath",
    title: "Somatic Grounding Methods: Orientation and Breath",
    excerpt:
      "Practical grounding sequence using orientation, sensory scanning, and breath tracking.",
    tags: ["Spirituality", "Somatic", "Grounding", "Breathwork"],
    series: "Somatic",
    checklist: [
      "Orient visually to the room before closing eyes.",
      "Name physical support points in contact with the floor.",
      "Extend exhale gradually without strain.",
    ],
  },
  {
    slug: "somatic-therapy-vs-talk-therapy",
    title: "Somatic Therapy vs Talk Therapy",
    excerpt:
      "When body-based work is useful, when talk therapy is better, and how to combine both.",
    tags: ["Spirituality", "Somatic", "Therapy", "Education"],
    series: "Somatic",
    checklist: [
      "Clarify whether the goal is insight or regulation.",
      "Use somatic methods when verbal processing stalls.",
      "Coordinate with licensed providers when needed.",
    ],
  },
  {
    slug: "somatic-exercises-for-sleep-and-evening-downregulation",
    title: "Somatic Exercises for Sleep and Evening Down-Regulation",
    excerpt:
      "Evening routine to reduce activation and improve sleep onset consistency.",
    tags: ["Spirituality", "Somatic", "Sleep", "Recovery"],
    series: "Somatic",
    checklist: [
      "Lower sensory load 60 minutes before bed.",
      "Use slow rhythmic movement and longer exhales.",
      "Avoid high-intensity release work at night.",
    ],
  },
  {
    slug: "somatic-emotional-release-without-dissociation",
    title: "Somatic Emotional Release Without Dissociation",
    excerpt:
      "How to support emotional release while maintaining orientation and self-contact.",
    tags: ["Spirituality", "Somatic", "Emotional Release", "Safety"],
    series: "Somatic",
    checklist: [
      "Track body cues instead of narrative loops.",
      "Alternate activation with grounding intervals.",
      "Stop and re-orient if numbness increases.",
    ],
  },
  {
    slug: "somatic-self-practice-weekly-plan",
    title: "Somatic Self-Practice Weekly Plan",
    excerpt:
      "A practical weekly template for consistent somatic training without burnout.",
    tags: ["Spirituality", "Somatic", "Practice", "Routine"],
    series: "Somatic",
    checklist: [
      "Schedule short daily sessions before intensity sessions.",
      "Rotate regulation, mobility, and integration days.",
      "Review notes weekly and adjust load.",
    ],
  },
  {
    slug: "somatic-therapy-for-trauma-survivors-early-sessions",
    title: "Somatic Therapy for Trauma Survivors: Early Sessions",
    excerpt:
      "What to expect in early somatic sessions and how safety is established over time.",
    tags: ["Spirituality", "Somatic", "Trauma", "Client Guide"],
    series: "Somatic",
    checklist: [
      "Establish consent language and pacing agreements first.",
      "Focus on stabilization before deep release work.",
      "Use short integration cycles between sessions.",
    ],
  },
  {
    slug: "somatic-work-for-high-performers-stress-discharge",
    title: "Somatic Work for High Performers: Stress Discharge",
    excerpt:
      "Short somatic protocols for founders and builders to recover between deep-work cycles.",
    tags: ["Spirituality", "Somatic", "Performance", "Stress"],
    series: "Somatic",
    checklist: [
      "Run a 5-minute reset between high-focus blocks.",
      "Discharge activation before major decisions.",
      "Track energy quality, not only output volume.",
    ],
  },
  // ── Spirituality Discovery: Broader Reach ─────────────────────────
  {
    slug: "what-is-energy-work-complete-guide",
    title: "What Is Energy Work? A Complete Guide",
    excerpt:
      "A practical introduction to somatic energy work: what it is, how sessions work, what to expect, and how to find a qualified practitioner.",
    tags: ["Spirituality", "Energy Work", "Beginner Guide", "Somatic"],
    series: "Tantra",
    checklist: [
      "Define energy work in accessible, non-clinical language.",
      "Describe a typical session arc from intake to integration.",
      "Include safety and boundary guidelines for first-timers.",
    ],
  },
  {
    slug: "how-to-find-a-spiritual-teacher",
    title: "How to Find a Spiritual Teacher You Can Trust",
    excerpt:
      "A due-diligence framework for finding a spiritual teacher with strong ethics, clear boundaries, and real lineage credentials.",
    tags: ["Spirituality", "Spiritual Teacher", "Safety", "Client Guide"],
    series: "Tantra",
    checklist: [
      "Define what makes a teacher trustworthy vs performative.",
      "List red flags and green flags in teacher-student dynamics.",
      "Recommend verification steps for lineage and training claims.",
    ],
  },
  {
    slug: "shadow-work-for-beginners-practical-guide",
    title: "Shadow Work for Beginners: A Practical Guide",
    excerpt:
      "An accessible introduction to shadow work: what it is, why it matters, and simple somatic practices to begin exploring unconscious patterns safely.",
    tags: ["Spirituality", "Shadow Work", "Beginner Guide", "Somatic"],
    series: "Tantra",
    checklist: [
      "Define shadow work without jargon or spiritual gatekeeping.",
      "Offer 3 entry-level practices with safety notes.",
      "Distinguish somatic shadow work from therapy.",
    ],
  },
  {
    slug: "breathwork-for-nervous-system-regulation",
    title: "Breathwork for Nervous System Regulation",
    excerpt:
      "How specific breathing patterns shift the autonomic nervous system from activation toward calm. Practical techniques for daily regulation.",
    tags: ["Spirituality", "Breathwork", "Nervous System", "Regulation"],
    series: "Tantra",
    checklist: [
      "Explain autonomic nervous system basics simply.",
      "Teach 3 breath patterns with step-by-step instructions.",
      "Include contraindications and when to seek professional support.",
    ],
  },
  {
    slug: "meditation-for-software-developers",
    title: "Meditation for Software Developers",
    excerpt:
      "Why meditation improves debugging, code review, and technical decision-making. Practical protocols for engineers who want to start sitting.",
    tags: ["Bridge", "Meditation", "Developers", "Productivity"],
    series: "Bridge",
    checklist: [
      "Connect meditation benefits to specific engineering tasks.",
      "Offer a minimal viable practice for busy developers.",
      "Address common resistance from analytical minds.",
    ],
  },
  {
    slug: "programming-as-spiritual-practice",
    title: "Programming as Spiritual Practice",
    excerpt:
      "How writing code mirrors contemplative discipline: attention, debugging as inquiry, refactoring as letting go, and shipping as non-attachment.",
    tags: ["Bridge", "Consciousness", "Programming", "Philosophy"],
    series: "Bridge",
    checklist: [
      "Draw genuine parallels between code and contemplative practice.",
      "Avoid forced metaphors; ground in real engineering experience.",
      "Include reflection prompts for developer-practitioners.",
    ],
  },
];

interface TopicPerspective {
  key: string;
  title: string;
  focus: string;
  checklist: string[];
}

interface TopicSpec {
  slug: string;
  label: string;
  series: string;
  tags: string[];
  description: string;
}

const TOPIC_PERSPECTIVES: TopicPerspective[] = [
  {
    key: "fundamentals",
    title: "Fundamentals and Core Concepts",
    focus: "clarify definitions, scope, and baseline operating model",
    checklist: [
      "Define terms and boundaries before choosing tools.",
      "List assumptions and expected outcomes explicitly.",
      "Document the baseline state before any changes.",
    ],
  },
  {
    key: "beginner-roadmap",
    title: "Beginner Roadmap for the First 30 Days",
    focus: "move from theory to a practical first implementation",
    checklist: [
      "Pick one narrow use case to avoid scope drift.",
      "Set daily/weekly execution checkpoints.",
      "Review outcomes and adjust at day 30.",
    ],
  },
  {
    key: "advanced-patterns",
    title: "Advanced Patterns in Production",
    focus: "apply production-grade patterns and guardrails",
    checklist: [
      "Harden reliability before adding feature breadth.",
      "Instrument failures and retries from day one.",
      "Use controlled rollout to protect existing workflows.",
    ],
  },
  {
    key: "architecture",
    title: "Architecture and System Design",
    focus: "design durable systems with clear ownership boundaries",
    checklist: [
      "Separate core services by responsibility.",
      "Map data flow and failure boundaries.",
      "Define rollback and incident ownership early.",
    ],
  },
  {
    key: "failure-modes",
    title: "Failure Modes and Recovery Playbook",
    focus: "prevent avoidable failures and shorten recovery time",
    checklist: [
      "Catalog top failure classes from real usage.",
      "Attach mitigation and rollback actions to each class.",
      "Test the recovery path before production incidents.",
    ],
  },
  {
    key: "metrics-evals",
    title: "Metrics, Evaluation, and Quality Gates",
    focus: "measure quality with explicit release thresholds",
    checklist: [
      "Track outcome quality, latency, and cost together.",
      "Set pass/fail thresholds tied to user impact.",
      "Block release when critical metrics regress.",
    ],
  },
  {
    key: "ethics-risk",
    title: "Risk, Ethics, and Governance",
    focus: "reduce safety and compliance gaps in execution",
    checklist: [
      "Define acceptable and prohibited behaviors.",
      "Audit data handling and access controls regularly.",
      "Document escalation path for policy breaches.",
    ],
  },
  {
    key: "case-study",
    title: "Case Study Perspective: Wins and Trade-Offs",
    focus: "extract practical lessons from implementation outcomes",
    checklist: [
      "State starting context and constraints clearly.",
      "Quantify both improvements and costs.",
      "Capture what failed and what changed next.",
    ],
  },
  {
    key: "tooling-stack",
    title: "Tooling Stack and Integration Choices",
    focus: "choose stack components with explicit trade-off logic",
    checklist: [
      "Compare at least two viable tooling options.",
      "Decide based on reliability, maintainability, and cost.",
      "Document migration and rollback constraints.",
    ],
  },
  {
    key: "future-outlook",
    title: "Future Outlook: Next 3 Years",
    focus: "prepare strategy for near-term shifts and constraints",
    checklist: [
      "Identify durable capabilities versus hype cycles.",
      "Plan for model, policy, and tooling volatility.",
      "Maintain upgrade path without breaking reliability.",
    ],
  },
  {
    key: "prompt-design",
    title: "Prompt and Instruction Design",
    focus: "design prompts and instructions that survive real-world variance",
    checklist: [
      "Define output contract and failure boundaries before prompt writing.",
      "Stress-test with ambiguous and adversarial inputs.",
      "Version prompts and keep a rollback-ready changelog.",
    ],
  },
  {
    key: "data-modeling",
    title: "Data Modeling and Context Strategy",
    focus: "shape data and context flow for predictable system behavior",
    checklist: [
      "Define source-of-truth entities and freshness windows.",
      "Attach provenance IDs to retrieval context blocks.",
      "Reject context fragments without verifiable origin.",
    ],
  },
  {
    key: "integration-ops",
    title: "Integration and Ops Handoff",
    focus: "connect this capability into existing ops and ownership models",
    checklist: [
      "Map every dependency and downstream consumer.",
      "Define owner-on-call and escalation path before launch.",
      "Document handoff runbook with rollback steps.",
    ],
  },
  {
    key: "cost-roi",
    title: "Cost, ROI, and Unit Economics",
    focus: "optimize economic outcomes, not vanity usage metrics",
    checklist: [
      "Measure cost per successful outcome, not per request.",
      "Track payback period and ongoing operating cost.",
      "Cut low-ROI scope before adding net-new features.",
    ],
  },
  {
    key: "team-playbook",
    title: "Team Playbook and Operating Cadence",
    focus: "run a repeatable team rhythm that compounds quality over time",
    checklist: [
      "Set weekly review cadence for incidents and improvements.",
      "Assign explicit owners for quality, latency, and cost.",
      "Keep one shared playbook for implementation decisions.",
    ],
  },
  {
    key: "security-hardening",
    title: "Security Hardening Checklist",
    focus: "close common security gaps before scale exposes them",
    checklist: [
      "Apply least-privilege access and scoped credentials.",
      "Redact sensitive data in logs and traces.",
      "Run periodic penetration and abuse-path testing.",
    ],
  },
  {
    key: "compliance-readiness",
    title: "Compliance and Audit Readiness",
    focus: "prepare evidence trails and controls for audits early",
    checklist: [
      "Define control objectives mapped to policy requirements.",
      "Keep immutable records for key system decisions.",
      "Run quarterly mock audits to expose gaps.",
    ],
  },
  {
    key: "experimentation",
    title: "Experiment Design and Decision Quality",
    focus: "improve decisions through disciplined experiment structure",
    checklist: [
      "Write one hypothesis and one success metric per experiment.",
      "Separate exploratory tests from release-gate tests.",
      "Archive inconclusive results to prevent repeated mistakes.",
    ],
  },
  {
    key: "migration",
    title: "Migration and Legacy Modernization",
    focus: "move from legacy workflows without breaking critical operations",
    checklist: [
      "Run parallel systems during cutover period.",
      "Define rollback point for each migration phase.",
      "Migrate highest-risk flows first with guarded rollout.",
    ],
  },
  {
    key: "leadership-briefing",
    title: "Leadership Briefing and Strategic Bets",
    focus: "translate implementation signals into strategic decision inputs",
    checklist: [
      "Summarize risk, upside, and confidence in one page.",
      "Separate strategic bets from mandatory maintenance work.",
      "Review strategy monthly against measured delivery outcomes.",
    ],
  },
];

const USER_REQUEST_TOPICS: TopicSpec[] = [
  {
    slug: "ai",
    label: "AI",
    series: "AI Infra",
    tags: ["Tech", "AI", "Infrastructure", "Strategy"],
    description: "Practical AI implementation patterns for teams shipping real systems.",
  },
  {
    slug: "claude-code",
    label: "Claude Code",
    series: "AI Infra",
    tags: ["Tech", "Claude Code", "Automation", "Developer Tools"],
    description: "Deployment and workflow practices for Claude Code in production teams.",
  },
  {
    slug: "codex",
    label: "Codex",
    series: "AI Infra",
    tags: ["Tech", "Codex", "Developer Tools", "AI"],
    description: "Applied usage patterns for Codex across software delivery workflows.",
  },
  {
    slug: "n8n",
    label: "n8n",
    series: "AI Infra",
    tags: ["Tech", "n8n", "Automation", "Workflows"],
    description: "Reliable n8n architecture patterns for multi-step automation systems.",
  },
  {
    slug: "massage",
    label: "Massage",
    series: "Somatic",
    tags: ["Spirituality", "Massage", "Somatic", "Client Guide"],
    description: "Bodywork frameworks for safety, regulation, and integration quality.",
  },
  {
    slug: "psychology",
    label: "Psychology",
    series: "Somatic",
    tags: ["Spirituality", "Psychology", "Somatic", "Mental Health"],
    description: "Psychology-informed perspectives for safer and more effective somatic practice.",
  },
  {
    slug: "contact-improvisation",
    label: "Contact Improvisation",
    series: "Somatic",
    tags: ["Spirituality", "Contact Improvisation", "Movement", "Somatic"],
    description: "Contact improvisation lessons for embodied awareness and relational safety.",
  },
  {
    slug: "llms",
    label: "LLMs",
    series: "LLM Evals",
    tags: ["Tech", "LLMs", "Evaluation", "AI"],
    description: "System-level guidance for building and evaluating large language model workflows.",
  },
  {
    slug: "ai-research",
    label: "AI Research",
    series: "AI Infra",
    tags: ["Tech", "AI Research", "Methods", "Strategy"],
    description: "Research-to-production bridges for AI teams and technical founders.",
  },
  {
    slug: "history-of-tantra",
    label: "History of Tantra",
    series: "Tantra",
    tags: ["Spirituality", "Tantra", "History", "Education"],
    description: "Historical context and modern interpretation pathways for tantra practice.",
  },
  {
    slug: "seo",
    label: "SEO",
    series: "SEO",
    tags: ["Tech", "SEO", "Search", "Growth"],
    description: "Search visibility strategy grounded in technical quality and content trust signals.",
  },
  {
    slug: "ssr-ai-citations",
    label: "SSR and AI Citations",
    series: "SEO",
    tags: ["Tech", "SSR", "GEO", "AI Citations"],
    description:
      "Experimental playbooks for server-side rendering, crawler behavior differences, and citation growth across answer engines.",
  },
  {
    slug: "generative-engine-optimization",
    label: "Generative Engine Optimization (GEO)",
    series: "SEO",
    tags: ["Tech", "GEO", "AI Visibility", "Search"],
    description: "Practical GEO implementation for citation visibility in AI answer systems.",
  },
  {
    slug: "answer-engine-optimization",
    label: "Answer Engine Optimization (AEO)",
    series: "SEO",
    tags: ["Tech", "AEO", "Answer Engines", "Search"],
    description: "AEO execution patterns for extractable, high-confidence answers.",
  },
  {
    slug: "skills-md",
    label: "skills.md",
    series: "OpenClaw",
    tags: ["Tech", "Skills", "Documentation", "Automation"],
    description: "How to design high-quality skills.md files for repeatable agent behavior.",
  },
  {
    slug: "claude-md",
    label: "claude.md",
    series: "OpenClaw",
    tags: ["Tech", "Claude", "Documentation", "Workflows"],
    description: "Operational guidance for claude.md conventions and team adoption.",
  },
  {
    slug: "subagents",
    label: "Subagents",
    series: "OpenClaw",
    tags: ["Tech", "Subagents", "Automation", "Architecture"],
    description: "Design patterns for subagent coordination and production reliability.",
  },
  {
    slug: "cursor",
    label: "Cursor",
    series: "AI Infra",
    tags: ["Tech", "Cursor", "Developer Tools", "AI"],
    description: "Practical Cursor workflows for engineering teams shipping faster with guardrails.",
  },
  {
    slug: "bugbot-for-cursor",
    label: "Bugbot for Cursor",
    series: "AI Infra",
    tags: ["Tech", "Cursor", "Bugbot", "Quality"],
    description: "Using Bugbot with Cursor for robust bug triage, reproduction, and fixes.",
  },
  {
    slug: "ai-workflows",
    label: "AI Workflows",
    series: "AI Infra",
    tags: ["Tech", "AI Workflows", "Automation", "Operations"],
    description: "Execution frameworks for repeatable and observable AI workflow delivery.",
  },
  {
    slug: "ai-wearables",
    label: "AI Wearables",
    series: "AI Infra",
    tags: ["Tech", "AI Wearables", "Product", "Hardware"],
    description: "AI wearable product strategy from data capture to user trust and retention.",
  },
  {
    slug: "ai-development",
    label: "AI Development",
    series: "AI Infra",
    tags: ["Tech", "AI Development", "Engineering", "Delivery"],
    description: "End-to-end AI product development practices for speed and reliability.",
  },
  {
    slug: "ai-research-biology",
    label: "AI Research in Biology",
    series: "AI Infra",
    tags: ["Tech", "AI Research", "Biology", "Science"],
    description: "Applied AI research perspectives for biology-driven discovery and tooling.",
  },
  {
    slug: "singularity",
    label: "Singularity",
    series: "AI Infra",
    tags: ["Tech", "Singularity", "AI Strategy", "Future"],
    description: "Critical perspectives on singularity narratives and practical planning horizons.",
  },
  // ── Bridge: Neuroscience + Code ──────────────────────────────────
  {
    slug: "meditation-neuroscience",
    label: "Meditation and Neuroscience",
    series: "Bridge",
    tags: ["Bridge", "Meditation", "Neuroscience", "Consciousness"],
    description: "What changes in your brain when you meditate, explained for engineers who want evidence before committing to a practice.",
  },
  {
    slug: "flow-state-developers",
    label: "Flow State for Developers",
    series: "Bridge",
    tags: ["Bridge", "Flow State", "Productivity", "Neuroscience"],
    description: "The neuroscience of deep work and how developers can engineer reliable flow state entry.",
  },
  {
    slug: "nsdr-non-sleep-deep-rest",
    label: "NSDR (Non-Sleep Deep Rest)",
    series: "Bridge",
    tags: ["Bridge", "NSDR", "Recovery", "Neuroscience"],
    description: "A developer's guide to non-sleep deep rest for cognitive recovery between deep-work blocks.",
  },
  {
    slug: "breathwork-nervous-system",
    label: "Breathwork for Nervous System Regulation",
    series: "Bridge",
    tags: ["Bridge", "Breathwork", "Nervous System", "Regulation"],
    description: "Technical guide to breathwork protocols for nervous system regulation, with measurable HRV outcomes.",
  },
  {
    slug: "default-mode-network",
    label: "The Default Mode Network",
    series: "Bridge",
    tags: ["Bridge", "Default Mode Network", "Neuroscience", "Meditation"],
    description: "Why meditation rewires the default mode network and what that means for creative problem-solving in engineering.",
  },
  // ── Bridge: Eastern Philosophy + Engineering ─────────────────────
  {
    slug: "zen-and-engineering",
    label: "Zen and Engineering",
    series: "Bridge",
    tags: ["Bridge", "Zen", "Engineering", "Philosophy"],
    description: "Why beginner's mind from Zen practice makes better code and sharper architectural decisions.",
  },
  {
    slug: "dao-of-programming",
    label: "The Dao of Programming",
    series: "Bridge",
    tags: ["Bridge", "Dao", "Programming", "Philosophy"],
    description: "Dao principles applied to software design: yielding, simplicity, and wu wei in system architecture.",
  },
  {
    slug: "buddhist-impermanence-software",
    label: "Impermanence and Software",
    series: "Bridge",
    tags: ["Bridge", "Buddhism", "Software", "Philosophy"],
    description: "What Buddhism teaches about building systems that embrace change instead of resisting it.",
  },
  {
    slug: "stoic-philosophy-engineers",
    label: "Stoic Philosophy for Engineers",
    series: "Bridge",
    tags: ["Bridge", "Stoicism", "Engineering", "Philosophy"],
    description: "Marcus Aurelius, Seneca, and Epictetus applied to incident response, burnout, and engineering leadership.",
  },
  // ── Bridge: Consciousness x Technology Intersection ──────────────
  {
    slug: "consciousness-meets-technology",
    label: "Consciousness Meets Technology",
    series: "Bridge",
    tags: ["Bridge", "Consciousness", "Technology", "Intersection"],
    description: "A practitioner-engineer's map of where consciousness science, Eastern philosophy, and software engineering converge.",
  },
  {
    slug: "contemplative-technology-design",
    label: "Contemplative Technology Design",
    series: "Bridge",
    tags: ["Bridge", "Contemplative", "Technology", "Design"],
    description: "Designing software that supports awareness and presence instead of fragmenting attention.",
  },
  {
    slug: "ai-consciousness-hard-problem",
    label: "AI and the Hard Problem of Consciousness",
    series: "Bridge",
    tags: ["Bridge", "AI", "Consciousness", "Philosophy"],
    description: "What AI engineers should understand about the hard problem of consciousness and why it matters for agent design.",
  },
];

const EXTRA_TANTRA_TOPIC: TopicSpec = {
  slug: "tantra-practice",
  label: "Tantra Practice",
  series: "Tantra",
  tags: ["Spirituality", "Tantra", "Practice", "Integration"],
  description: "Additional tantra practice topics from multiple operational and relational perspectives.",
};

export interface ExpansionTopicGroup {
  slug: string;
  label: string;
  series: string;
}

export const TOPIC_PERSPECTIVE_KEYS: string[] = TOPIC_PERSPECTIVES.map(
  (perspective) => perspective.key
);

export const EXPANSION_TOPIC_GROUPS: ExpansionTopicGroup[] = [
  ...USER_REQUEST_TOPICS,
  EXTRA_TANTRA_TOPIC,
].map((topic) => ({
  slug: topic.slug,
  label: topic.label,
  series: topic.series,
}));

function createTopicSeeds(topic: TopicSpec): BacklogSeed[] {
  return TOPIC_PERSPECTIVES.map((perspective) => ({
    slug: `${topic.slug}-${perspective.key}`,
    title: `${topic.label}: ${perspective.title}`,
    excerpt: `${topic.description} This perspective focuses on how to ${perspective.focus}.`,
    tags: [...topic.tags, perspective.title],
    series: topic.series,
    checklist: perspective.checklist,
  }));
}

const USER_REQUEST_SEEDS: BacklogSeed[] = USER_REQUEST_TOPICS.flatMap((topic) =>
  createTopicSeeds(topic)
);

const EXTRA_TANTRA_SEEDS: BacklogSeed[] = createTopicSeeds(EXTRA_TANTRA_TOPIC);

const ALL_SEEDS: BacklogSeed[] = [...SEEDS, ...USER_REQUEST_SEEDS, ...EXTRA_TANTRA_SEEDS];

interface SourceLink {
  label: string;
  url: string;
}

interface SeriesProfile {
  reader: string;
  misconception: string;
  tension: string;
  definition: string;
  oldWay: string;
  newWay: string;
  failure: string;
  primaryAction: string;
  secondaryActions: string[];
  uncomfortableLine: string;
  sources: SourceLink[];
}

function getSeriesProfile(series: string): SeriesProfile {
  switch (series) {
    case "Tantra":
      return {
        reader: "first-time tantra clients and couples screening practitioners",
        misconception: "Most people assume tantra outcomes come from intensity; most outcomes actually come from pacing and consent quality.",
        tension: "Clients want deep transformation quickly, but nervous systems integrate safely only when intensity is matched to readiness.",
        definition:
          "Tantra session design is a consent-led protocol combining breath, touch boundaries, pacing, and integration windows to improve regulation and relational clarity.",
        oldWay: "Choose by marketing language, improvise boundaries in session, debrief late or never.",
        newWay: "Use explicit intake, verbal consent checkpoints, and post-session integration plan before booking.",
        failure:
          "A common rollback case: a session escalates too quickly, activation spikes, and both practitioner and client spend the next week repairing trust instead of integrating progress.",
        primaryAction: "Run a pre-booking safety screen and ask for the practitioner’s consent protocol in writing.",
        secondaryActions: [
          "Document non-negotiable boundaries before session start.",
          "Use stop/pause language and rehearse it once out loud.",
          "Schedule a 24-hour integration check-in after the session.",
        ],
        uncomfortableLine:
          "If you cannot state your boundaries clearly, the session will define them for you.",
        sources: [
          {
            label: "WHO - Mental Disorders Fact Sheet",
            url: "https://www.who.int/news-room/fact-sheets/detail/mental-disorders",
          },
          {
            label: "WHO - Self-Help Plus Stress Management Guide",
            url: "https://www.who.int/publications/i/item/9789240003927",
          },
          {
            label: "UN Women - Violence Against Women Facts and Figures",
            url: "https://www.unwomen.org/en/what-we-do/ending-violence-against-women/facts-and-figures",
          },
        ],
      };
    case "Somatic":
      return {
        reader: "people using somatic practice for anxiety, trauma recovery, or high-stress performance cycles",
        misconception: "People treat somatic work like a single exercise when it behaves more like a progressive training protocol.",
        tension: "You want rapid relief, but stable regulation usually requires repetition, titration, and recovery windows.",
        definition:
          "Somatic work is a body-first regulation method that uses breath, orientation, movement, and pacing to shift autonomic state safely over time.",
        oldWay: "Do random exercises when overwhelmed and stop when discomfort appears.",
        newWay: "Use a repeatable protocol, log state shifts, and progress intensity only after consistent recovery.",
        failure:
          "Typical failure pattern: over-activating release drills at night, sleep disruption increases, and the practice gets abandoned within one week.",
        primaryAction: "Adopt one 10-minute daily regulation protocol and track pre/post activation for two weeks.",
        secondaryActions: [
          "Use shorter sessions when activation is high.",
          "Pair release practices with orienting and grounding.",
          "Escalate depth only after sleep and mood stabilize.",
        ],
        uncomfortableLine:
          "If your protocol cannot survive a chaotic week, it is not a protocol yet.",
        sources: [
          {
            label: "NIMH - Anxiety Disorders",
            url: "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
          },
          {
            label: "APA - Trauma",
            url: "https://www.apa.org/topics/trauma",
          },
          {
            label: "WHO - Mental Disorders Fact Sheet",
            url: "https://www.who.int/news-room/fact-sheets/detail/mental-disorders",
          },
        ],
      };
    case "AI Infra":
      return {
        reader: "startup founders and platform leads shipping AI products with small teams",
        misconception: "Teams over-focus on model quality while underinvesting in reliability, security, and rollback design.",
        tension: "You need to ship fast, but infra debt compounds faster than feature velocity once traffic grows.",
        definition:
          "AI infrastructure is the production system around model calls: routing, retrieval, observability, security controls, and failure recovery.",
        oldWay: "Ship direct model calls from app code and patch incidents manually.",
        newWay: "Separate model gateway, policy layer, tracing, and controlled deploy paths from day one.",
        failure:
          "Observed rollback scenario: one provider outage with no routing fallback can stop revenue-critical flows for hours.",
        primaryAction: "Define a minimum production architecture with routing, tracing, and rollback before expanding features.",
        secondaryActions: [
          "Add token-cost and latency budgets per workflow.",
          "Implement scoped credentials and secret rotation.",
          "Run monthly incident rehearsal for provider failure.",
        ],
        uncomfortableLine:
          "If you cannot fail gracefully, you have not launched infrastructure, only a demo.",
        sources: [
          {
            label: "NIST AI Risk Management Framework",
            url: "https://www.nist.gov/itl/ai-risk-management-framework",
          },
          {
            label: "OWASP Top 10 for LLM Applications",
            url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
          },
          {
            label: "Anthropic - Test and Evaluate Overview",
            url: "https://docs.anthropic.com/en/docs/test-and-evaluate/overview",
          },
        ],
      };
    case "LLM Evals":
      return {
        reader: "AI product teams building repeatable quality gates before release",
        misconception: "Many teams still treat evaluation as a one-off benchmark instead of a continuous operating loop.",
        tension: "Shipping speed improves with automation, while trust improves only when evals catch regressions before users do.",
        definition:
          "LLM evaluation is a repeatable measurement system for output quality, safety, latency, and cost across representative tasks.",
        oldWay: "Manual spot checks and subjective reviewer opinions before launch.",
        newWay: "Versioned datasets, automated scoring, and release gates tied to clear thresholds.",
        failure:
          "Common rollback: prompt updates improve one task but silently break two adjacent workflows because no regression suite existed.",
        primaryAction: "Create one versioned eval set from production traces and enforce pass thresholds in CI.",
        secondaryActions: [
          "Track quality, latency, and cost in the same report.",
          "Use both human review and model-based judges.",
          "Block release when critical metrics regress.",
        ],
        uncomfortableLine:
          "If your team argues about quality after deployment, your evals started too late.",
        sources: [
          {
            label: "Anthropic - Test and Evaluate Overview",
            url: "https://docs.anthropic.com/en/docs/test-and-evaluate/overview",
          },
          {
            label: "LangSmith Evaluation Docs",
            url: "https://docs.smith.langchain.com/evaluation",
          },
          {
            label: "Ragas Documentation",
            url: "https://docs.ragas.io/en/stable/",
          },
        ],
      };
    case "Hybrid":
      return {
        reader: "search and RAG engineers tuning retrieval quality under real traffic",
        misconception: "Teams assume semantic retrieval alone can replace lexical signals across all query types.",
        tension: "Exact-match terms demand lexical precision while paraphrased intent demands semantic recall.",
        definition:
          "Hybrid retrieval combines lexical and vector search, then fuses and reranks results for higher recall and precision.",
        oldWay: "Single retrieval mode and ad-hoc tuning when relevance drops.",
        newWay: "Dual retrieval channels with measurable fusion strategy and error-driven tuning loops.",
        failure:
          "Typical rollback case: vector-only setup misses product codes and legal terms, causing high-confidence wrong answers.",
        primaryAction: "Benchmark BM25+vector+reranker with one labeled query set before scaling.",
        secondaryActions: [
          "Compare RRF and weighted fusion on long-tail queries.",
          "Log lexical and semantic score components for debugging.",
          "Add metadata/ACL filters before final ranking.",
        ],
        uncomfortableLine:
          "If you cannot explain why result #1 won, you are operating a black box, not search.",
        sources: [
          {
            label: "Elasticsearch - Hybrid Search",
            url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-text-hybrid-search.html",
          },
          {
            label: "Weaviate - Hybrid Search",
            url: "https://weaviate.io/developers/weaviate/search/hybrid",
          },
          {
            label: "Qdrant - Hybrid Queries",
            url: "https://qdrant.tech/documentation/concepts/hybrid-queries/",
          },
        ],
      };
    case "RAG":
      return {
        reader: "RAG builders responsible for answer quality, citations, and production reliability",
        misconception: "RAG is often treated as indexing plus prompt stuffing, but quality depends on pipeline discipline end-to-end.",
        tension: "You want broad coverage and low latency, but retrieval noise increases hallucination risk if context assembly is weak.",
        definition:
          "RAG is a retrieval-augmented generation pipeline that fetches external context, composes evidence, and generates answers with citations.",
        oldWay: "Static chunks, fixed top-k, no freshness policy, no evaluation loop.",
        newWay: "Adaptive retrieval, explicit context assembly rules, and continuous faithfulness evaluation.",
        failure:
          "Frequent rollback pattern: stale or noisy chunks enter prompts, and answers look fluent while silently diverging from source truth.",
        primaryAction: "Instrument retrieval and answer faithfulness metrics before optimizing model prompts.",
        secondaryActions: [
          "Benchmark chunking and embedding choices on your corpus.",
          "Add freshness and stale-index detection policies.",
          "Use citation checks as release criteria.",
        ],
        uncomfortableLine:
          "If retrieval quality is unknown, generation quality is mostly theater.",
        sources: [
          {
            label: "Original RAG Paper (Lewis et al., 2020)",
            url: "https://arxiv.org/abs/2005.11401",
          },
          {
            label: "Ragas Documentation",
            url: "https://docs.ragas.io/en/stable/",
          },
          {
            label: "Pinecone - Hybrid Search Guide",
            url: "https://docs.pinecone.io/guides/search/hybrid-search",
          },
        ],
      };
    case "OpenClaw":
      return {
        reader: "operators deploying OpenClaw for real team workflows and support automation",
        misconception: "Most rollout failures are blamed on tooling when process and ownership boundaries were never defined.",
        tension: "Teams want instant automation wins, but reliability comes from staged rollout and runbook discipline.",
        definition:
          "OpenClaw operations combine installation, skills governance, integration controls, and recovery procedures for dependable agent workflows.",
        oldWay: "Install fast, skip staging, and troubleshoot incidents directly in production.",
        newWay: "Use onboarding, staged rollout, permission reviews, and documented rollback paths.",
        failure:
          "Real rollback pattern: integration permission mismatch causes silent task failures until queue backlog reveals the incident.",
        primaryAction: "Run a staged OpenClaw launch with explicit owner, runbook, and rollback test.",
        secondaryActions: [
          "Validate plugin scopes before enabling production channels.",
          "Set queue/concurrency limits with alert thresholds.",
          "Version skills and publish release notes for every change.",
        ],
        uncomfortableLine:
          "If only one person can recover your automation stack, your uptime is borrowed time.",
        sources: [
          {
            label: "OpenClaw Docs",
            url: "https://docs.openclaw.ai/docs",
          },
          {
            label: "OpenClaw - Installation",
            url: "https://docs.openclaw.ai/docs/get-started/installation",
          },
          {
            label: "OpenClaw - Onboarding Wizard",
            url: "https://docs.openclaw.ai/docs/get-started/onboarding-wizard",
          },
        ],
      };
    case "Bridge":
      return {
        reader: "engineers who meditate, meditators who code, and anyone exploring the intersection of consciousness and technology",
        misconception: "Most people treat inner work and engineering as separate domains, but the deepest advances in both come from the same capacity: sustained, disciplined attention.",
        tension: "You want peak cognitive performance and deep inner clarity, but optimizing one without the other leads to burnout or disengagement.",
        definition:
          "Consciousness technology is the practice of applying contemplative methods (meditation, breathwork, somatic awareness, philosophical inquiry) to engineering work, and using engineering rigor (measurement, iteration, architecture) to deepen contemplative practice.",
        oldWay: "Treat meditation as a productivity hack, bolt on mindfulness apps, never integrate practice with actual work.",
        newWay: "Build a daily practice informed by neuroscience, ground it in a philosophical tradition, and use engineering discipline to measure and refine its impact on your work and life.",
        failure:
          "Common pattern: an engineer adopts meditation for productivity, drops it after three weeks because the ROI feels unclear, and never discovers the deeper cognitive and creative benefits that emerge after sustained practice.",
        primaryAction: "Choose one practice (breathwork, sitting meditation, or body scan) and run it for 30 days with a simple log of pre/post cognitive state.",
        secondaryActions: [
          "Read one primary source from a tradition that resonates (Zen, Stoic, Vedanta, or neuroscience).",
          "Pair your practice with one work ritual (pre-coding sit, post-incident debrief scan).",
          "Track one metric: attention quality, recovery speed, or creative output frequency.",
        ],
        uncomfortableLine:
          "If your inner practice cannot survive a production incident week, it is decoration, not infrastructure.",
        sources: [
          {
            label: "Huberman Lab - Meditation Neuroscience",
            url: "https://www.hubermanlab.com/newsletter/a-neurobiological-framework-for-meditation",
          },
          {
            label: "Integrated Information Theory (IIT) - Overview",
            url: "https://www.scholarpedia.org/article/Integrated_information_theory",
          },
          {
            label: "Global Workspace Theory",
            url: "https://www.scholarpedia.org/article/Global_workspace_theory",
          },
        ],
      };
    case "SEO":
      return {
        reader: "publishers and operators improving discoverability across search and answer engines",
        misconception: "Many teams still treat SEO as meta tags and keywords instead of content quality, crawlability, and evidence design.",
        tension: "You need broad discoverability, but quality systems reward clarity, structure, and trust signals over volume.",
        definition:
          "Modern SEO combines technical crawlability, canonical content structure, and evidence-backed answers that search and AI systems can extract confidently.",
        oldWay: "Publish broad content with weak structure and inconsistent internal links.",
        newWay: "Publish topic clusters with explicit definitions, source links, and crawl-priority pathways.",
        failure:
          "Common rollback: content velocity rises, but indexing and citation rates drop because information architecture and evidence quality were ignored.",
        primaryAction: "Choose one topic cluster and rebuild it with crawlability, answer extraction, and source-backed claims.",
        secondaryActions: [
          "Fix sitemap and canonical consistency before adding new pages.",
          "Add direct-answer blocks and implementation checklists.",
          "Track indexing, ranking, and citation changes weekly.",
        ],
        uncomfortableLine:
          "If your best page is hard to crawl, your strategy is invisible by design.",
        sources: [
          {
            label: "Google Search Central - SEO Starter Guide",
            url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
          },
          {
            label: "Google Search Central - Intro to Structured Data",
            url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
          },
          {
            label: "Google Search Central - Build and Submit a Sitemap",
            url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap",
          },
        ],
      };
    default:
      return {
        reader: "practitioners implementing this topic in production settings",
        misconception: "Most teams optimize for speed without a repeatable quality loop.",
        tension: "Fast shipping feels efficient until missing controls trigger expensive rework.",
        definition:
          "A production article should provide definitions, evidence, failure patterns, and execution steps that survive real constraints.",
        oldWay: "Publish generic advice without implementation detail.",
        newWay: "Publish explicit playbooks with evidence, limits, and measurable actions.",
        failure:
          "Common rollback: vague guidance leads to inconsistent implementation and repeated errors.",
        primaryAction: "Pick one measurable workflow and implement it end-to-end this week.",
        secondaryActions: [
          "Track outcomes with one baseline metric.",
          "Document failure cases and corrective actions.",
          "Share an implementation checklist with owners.",
        ],
        uncomfortableLine:
          "If guidance cannot be executed by Monday morning, it is still marketing copy.",
        sources: [
          {
            label: "Anthropic - Test and Evaluate Overview",
            url: "https://docs.anthropic.com/en/docs/test-and-evaluate/overview",
          },
          {
            label: "NIST AI Risk Management Framework",
            url: "https://www.nist.gov/itl/ai-risk-management-framework",
          },
          {
            label: "OWASP Top 10 for LLM Applications",
            url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
          },
        ],
      };
  }
}

function buildDirectAnswer(seed: BacklogSeed, profile: SeriesProfile): string {
  return `${seed.title} explains how ${profile.reader} can implement this topic with clear definitions, evidence-linked decisions, and failure-aware execution. The practical core is simple: replace ad-hoc tactics with explicit checkpoints, measurable outcomes, and a rollback path so quality improves instead of drifting after launch.`;
}

function buildFaqBlockquotes(seed: BacklogSeed): string {
  const faqs = [
    {
      q: `What is ${seed.title.toLowerCase()} in practical terms?`,
      a: `${seed.title} is an operating method: define scope, set constraints, run a controlled implementation, and verify outcomes before scaling.`,
    },
    {
      q: "Why does this matter now?",
      a: "Search and answer engines reward specific, verifiable guidance. Teams that publish implementation-ready pages become the cited source of truth.",
    },
    {
      q: "How does this work in production?",
      a: "Use staged rollout, objective checks, and post-change review loops. Keep one owner accountable for outcome and rollback readiness.",
    },
    {
      q: "What are the limits?",
      a: "No framework removes uncertainty. You still need context-specific tuning, realistic timelines, and disciplined quality checks.",
    },
    {
      q: "How do I implement this quickly?",
      a: "Start with one high-impact workflow, apply the checklist, and run a 30-day execution cycle before expanding scope.",
    },
  ];

  return faqs
    .map(
      (faq) =>
        `<blockquote><p><strong>Q:</strong> ${faq.q}<br/><strong>A:</strong> ${faq.a}</p></blockquote>`
    )
    .join("");
}

function getQuantifiedExampleContext(series: string): string {
  switch (series) {
    case "Tantra":
      return "tantra practice";
    case "Somatic":
      return "somatic regulation work";
    case "AI Infra":
      return "AI infrastructure rollout";
    case "LLM Evals":
      return "evaluation pipeline";
    case "Hybrid":
      return "retrieval stack";
    case "RAG":
      return "RAG pipeline";
    case "OpenClaw":
      return "OpenClaw rollout";
    case "Bridge":
      return "consciousness engineering practice";
    case "SEO":
      return "content system";
    default:
      return "workflow";
  }
}

function getTopicLabel(seed: BacklogSeed): string {
  return seed.title.split(":")[0];
}

function buildQuantifiedExample(seed: BacklogSeed): string {
  const context = getQuantifiedExampleContext(seed.series);
  const topicLabel = getTopicLabel(seed);

  switch (seed.series) {
    case "Tantra":
      return `For ${topicLabel}, if a tantra practice shows nervous system dysregulation in 4 of every 10 sessions, adding structured grounding can cut that to 1 of 10 within 30 days. The exact ratio depends on the practitioner and client context, but the pattern holds: deliberate checkpoints reduce avoidable setbacks.`;
    case "Bridge":
      return `For ${topicLabel}, a ${context} that ships misaligned outcomes in 5 of every 15 cycles can often be pulled down to 2 of 15 over a quarter once reflective checkpoints are in place. The numbers shift by context, but the mechanism is consistent: structured review surfaces blind spots earlier.`;
    case "AI Infra":
    case "LLM Evals":
    case "Hybrid":
    case "RAG":
    case "OpenClaw":
    case "SEO":
      return `For ${topicLabel}, a ${context} that fails 3 of every 20 runs can usually be pushed to 1 of 20 in 30 days. The exact numbers vary, but the mechanism is consistent: clear checkpoints plus rollback discipline reduce avoidable rework.`;
    default:
      return `For ${topicLabel}, a ${context} that currently underperforms in 3 of every 20 cycles can often be cut to 1 of 20 within 30 days. The exact figures depend on context, but structured checkpoints consistently reduce avoidable rework.`;
  }
}

function buildArticleContent(seed: BacklogSeed): string {
  const profile = getSeriesProfile(seed.series);
  const checklistHtml = seed.checklist.map((item) => `<li>${item}</li>`).join("");
  const sourcesHtml = profile.sources
    .map(
      (source) =>
        `<li><a href=\"${source.url}\" target=\"_blank\" rel=\"noopener\">${source.label}</a></li>`
    )
    .join("");
  const secondaryActionsHtml = profile.secondaryActions.map((item) => `<li>${item}</li>`).join("");

  return [
    `<blockquote><p><strong>Direct answer:</strong> ${buildDirectAnswer(seed, profile)}</p></blockquote>`,
    `<h2>Thesis and Tension</h2><p class=\"lead\">${profile.misconception} ${profile.tension} This article is written for ${profile.reader} who need execution clarity, not motivational abstractions.</p>`,
    `<blockquote><p><strong>Definition:</strong> ${profile.definition}</p></blockquote>`,
    `<h2>Authority and Evidence</h2><p>${seed.excerpt} The sources below are primary references used to anchor terminology, risk framing, and implementation priorities.</p><ul>${sourcesHtml}</ul>`,
    `<h2>Reality Contact: Failure, Limitation, and Rollback</h2><p>${profile.failure}</p><ul><li>Limitation: the first version will be incomplete, so start with one workflow.</li><li>Counterexample: broad rollout without ownership usually increases defect rate.</li><li>Rollback rule: define revert conditions before shipping changes.</li></ul>`,
    `<h2>Old Way vs New Way</h2><table><thead><tr><th>Old Way</th><th>New Way</th></tr></thead><tbody><tr><td>${profile.oldWay}</td><td>${profile.newWay}</td></tr></tbody></table>`,
    `<h2>Implementation Map</h2><ol>${checklistHtml}</ol>`,
    `<h2>Quantified Example (Hypothetical)</h2><p>${buildQuantifiedExample(seed)}</p>`,
    `<h2>Objections and FAQs</h2>${buildFaqBlockquotes(seed)}`,
    `<h2>Action Plan: 7, 14, and 30 Days</h2><p><strong>Primary action:</strong> ${profile.primaryAction}</p><p><strong>Secondary actions:</strong></p><ul>${secondaryActionsHtml}</ul><ol><li><strong>Day 1-7:</strong> Define scope, owner, and baseline metrics.</li><li><strong>Day 8-14:</strong> Run controlled implementation and collect failure logs.</li><li><strong>Day 15-30:</strong> Tune based on evidence, document runbook, and expand one step.</li></ol>`,
    `<h2>Conclusion Loop</h2><p>The initial tension was speed versus reliability. The resolution is not slower execution; it is structured execution. Keep evidence close, keep scope tight, and keep rollback ready. ${profile.uncomfortableLine}</p>`,
  ].join("");
}

/**
 * Keep publication dates honest and in the past.
 * If we want freshness, ship real edits and real publishes,
 * not future-dated placeholders.
 */
const BASE_PUBLICATION_DATE = new Date("2026-04-04T08:00:00.000Z");

function getBacklogCoverImage(seed: BacklogSeed): string {
  const isSpiritualityOrBridge = seed.tags.some(
    (tag) => tag.toLowerCase() === "spirituality" || tag.toLowerCase() === "bridge",
  );
  return isSpiritualityOrBridge
    ? "/images/generated/home-ambient-somatic.jpg"
    : "/images/generated/home-automation-portrait.jpg";
}

export const EXPANSION_ARTICLES: Article[] = ALL_SEEDS.map((seed, index) => {
  const date = new Date(BASE_PUBLICATION_DATE);
  date.setDate(date.getDate() - index);

  return {
    id: `local-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    excerpt: seed.excerpt,
    content: buildArticleContent(seed),
    image: getBacklogCoverImage(seed),
    link: `/blog/${seed.slug}`,
    publishedAt: date.toISOString(),
    tags: seed.tags,
    author: { name: "Max Petrusenko" },
  };
});
