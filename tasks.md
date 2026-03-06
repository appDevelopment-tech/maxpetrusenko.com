# Tasks

## Current
- [x] Improve crawl discovery for `Discovered - currently not indexed` URLs: `/tech/articles/*`, `/tech/case-studies`, `/spirituality/blog`, `/somatic/approach`, `/somatic/training`, `/performance`, `/tech/mindfold`.
- [x] Keep `Page with redirect` URLs intentionally redirected (`http`/bare host, `/home`, `/mindfold`), ensure they are absent from sitemap/internal canonical links, then re-run validation.
- [x] Add Mindfold FAQPage schema for events page.
- [x] Add a visible GEO facts block (current base + service area) on the homepage.
- [x] Add a lightweight logo/brand image and wire it into structured data `image` fields.
- [x] Align external bios (LinkedIn/GitHub/X) with current positioning.
- [x] Decide Mindfold/Atelier canonical behavior (subdomain vs main).
- [x] Update robots rules to disallow legacy `/atelier/` and `/mindfold/` paths if needed.

## Content Backlog (Google-Driven, Feb 2026)
- [x] [Tantra 1/5] Tantra massage meaning vs myths: what it is and what it is not.
- [x] [Tantra 2/5] Tantra massage benefits for men: regulation, intimacy, and limits.
- [x] [Tantra 3/5] Tantra massage benefits for women: safety, pacing, and outcomes.
- [x] [Tantra 4/5] How to choose a tantra practitioner: red flags, ethics, and consent checks.
- [x] [Tantra 5/5] Tantra for couples: boundaries-first session structure and aftercare.
- [x] [AI Infra 1/3] AI infrastructure for startups: minimum production stack (model, vector DB, observability, evals).
- [x] [AI Infra 2/3] LLM serving architecture: latency, caching, retries, and cost controls.
- [x] [AI Infra 3/3] AI infrastructure security baseline: secrets, access scopes, and incident runbooks.
- [x] [LLM Evals 1/10] LLM evaluation metrics that actually matter: task success, faithfulness, and reliability.
- [x] [LLM Evals 2/10] How to build your first eval dataset from production traces.
- [x] [LLM Evals 3/10] Offline vs online evals: when to use each and how to combine them.
- [x] [LLM Evals 4/10] LLM-as-judge playbook: rubric design, failure modes, and guardrails.
- [x] [LLM Evals 5/10] Pairwise evals vs absolute scoring for prompt and model selection.
- [x] [LLM Evals 6/10] Tool-calling evals: schema correctness, retries, and side effects.
- [x] [LLM Evals 7/10] Agent evals: trajectory quality, tool choice, and completion criteria.
- [x] [LLM Evals 8/10] CI/CD for LLM apps: eval gates before release.
- [x] [LLM Evals 9/10] Hallucination testing: reference-based and reference-free checks.
- [x] [LLM Evals 10/10] Regression eval dashboard: alerts, thresholds, and release policies.
- [x] [Hybrid 1/10] Hybrid search 101: BM25 + vectors + reranking.
- [x] [Hybrid 2/10] RRF vs weighted fusion: choosing the right hybrid ranking strategy.
- [x] [Hybrid 3/10] Hybrid retrieval with ACL and metadata filters at scale.
- [x] [Hybrid 4/10] Hybrid search in Elasticsearch: practical query patterns.
- [x] [Hybrid 5/10] Hybrid search in Weaviate: alpha tuning and distance thresholds.
- [x] [Hybrid 6/10] Hybrid search in Qdrant: query API and quality measurement.
- [x] [Hybrid 7/10] Query routing hybrid approach: lexical first vs semantic first.
- [x] [Hybrid 8/10] Hybrid + reranker architecture for customer support assistants.
- [x] [Hybrid 9/10] Hybrid retrieval for long-tail queries and exact-match terms.
- [x] [Hybrid 10/10] Hybrid retrieval debugging: why irrelevant chunks still win.
- [x] [RAG 1/10] RAG pipeline architecture end-to-end (ingest, index, retrieve, generate, evaluate).
- [x] [RAG 2/10] RAG chunking strategies: fixed, semantic, and structure-aware chunking.
- [x] [RAG 3/10] RAG embedding model selection by domain and budget.
- [x] [RAG 4/10] RAG context assembly: top-k, dedupe, and citation packing.
- [x] [RAG 5/10] RAG evaluation metrics: faithfulness, answer relevance, and context precision.
- [x] [RAG 6/10] RAG freshness strategy: incremental indexing and stale-context handling.
- [x] [RAG 7/10] RAG guardrails: PII filtering, prompt injection defense, and source constraints.
- [x] [RAG 8/10] Multi-tenant RAG architecture: isolation, quotas, and permissions.
- [x] [RAG 9/10] RAG latency optimization: retrieval budgets, batching, and caching.
- [x] [RAG 10/10] RAG failure analysis: empty retrievals, noisy context, and hallucinated joins.
- [x] [OpenClaw 1/10] OpenClaw onboarding wizard: first 30 minutes from zero to working gateway.
- [x] [OpenClaw 2/10] OpenClaw gateway runbook: deploy, monitor, and recover.
- [x] [OpenClaw 3/10] OpenClaw plugins deep dive: install, config, and safe rollout.
- [x] [OpenClaw 4/10] OpenClaw Microsoft Teams plugin setup and troubleshooting.
- [x] [OpenClaw 5/10] OpenClaw skills architecture: bundled, local, and workspace precedence.
- [x] [OpenClaw 6/10] Creating custom OpenClaw skills with `SKILL.md` and real examples.
- [x] [OpenClaw 7/10] Publishing and versioning skills with ClawHub.
- [x] [OpenClaw 8/10] OpenClaw queue and concurrency tuning for stable auto-replies.
- [x] [OpenClaw 9/10] OpenClaw macOS companion permissions and local/remote modes.
- [x] [OpenClaw 10/10] OpenClaw updates and rollback strategy for production teams.
- [x] [Somatic 1/10] Somatic work for anxiety: beginner exercises you can do in 10 minutes.
- [x] [Somatic 2/10] Somatic exercises for nervous system regulation (daily protocol).
- [x] [Somatic 3/10] Somatic trauma-informed pacing: how to avoid overwhelm.
- [x] [Somatic 4/10] Somatic grounding methods (5-4-3-2-1, orientation, breath tracking).
- [x] [Somatic 5/10] Somatic therapy vs talk therapy: when each approach helps.
- [x] [Somatic 6/10] Somatic exercises for sleep and evening down-regulation.
- [x] [Somatic 7/10] Somatic techniques for emotional release without dissociation.
- [x] [Somatic 8/10] Somatic self-practice at home: weekly plan for consistency.
- [x] [Somatic 9/10] Somatic therapy for trauma survivors: what to expect in early sessions.
- [x] [Somatic 10/10] Somatic work for high performers: stress discharge between deep-work blocks.

## Content Backlog Expansion (Requested Topics, Feb 2026)
- [x] Publish 10 perspective-based `/blog/*` articles for `AI`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Claude Code`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Codex`.
- [x] Publish 10 perspective-based `/blog/*` articles for `n8n`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Massage`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Psychology`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Contact Improvisation`.
- [x] Publish 10 perspective-based `/blog/*` articles for `LLMs`.
- [x] Publish 10 perspective-based `/blog/*` articles for `AI Research`.
- [x] Publish 10 perspective-based `/blog/*` articles for `History of Tantra`.
- [x] Publish 10 perspective-based `/blog/*` articles for `SEO`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Generative Engine Optimization (GEO)`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Answer Engine Optimization (AEO)`.
- [x] Publish 10 perspective-based `/blog/*` articles for `skills.md`.
- [x] Publish 10 perspective-based `/blog/*` articles for `claude.md`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Subagents`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Cursor`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Bugbot for Cursor`.
- [x] Publish 10 perspective-based `/blog/*` articles for `AI Workflows`.
- [x] Publish 10 perspective-based `/blog/*` articles for `AI Wearables`.
- [x] Publish 10 perspective-based `/blog/*` articles for `AI Development`.
- [x] Publish 10 perspective-based `/blog/*` articles for `AI Research in Biology`.
- [x] Publish 10 perspective-based `/blog/*` articles for `Singularity`.
- [x] Publish 10 additional perspective-based `/blog/*` articles for `Tantra Practice`.

## Content Backlog Expansion Round 2 (Feb 2026)
- [x] Publish an additional 10 perspective-based `/blog/*` articles for each requested topic cluster (20 total per requested topic).
- [x] Publish an additional 10 perspective-based `/blog/*` articles for `Tantra Practice` (20 total in that cluster).
- [x] Add `/blog/topics` crawl hub with direct links to every topic-cluster article.
- [x] Add intra-cluster related links on `/blog/[slug]` pages for stronger crawl depth.
- [x] Add `/blog/topics` to sitemap and priority internal links (`/blog`, `/`, footer).
- [x] Create Search Console validation runbook for sitemap resubmission and revalidation (`GSC_VALIDATION_WORKFLOW.md`).

## Thread-Inspired GEO Tasks (X, Feb 2026)
- [x] Add a dedicated cluster for SSR + AI citation strategy (`SSR and AI Citations`) with multi-perspective articles.
- [x] Add backlog items from thread themes: crawler differences, distribution vs backlinks, and transparent benchmarking.
- [x] Include practical response content to "What is SSR?" and "content-to-citation strategy" questions in the new cluster.
- [x] Add topic-hub `ItemList` structured data for `/blog/topics` to improve extraction/citation signals.
- [x] Add automated topic-cluster integrity verification (`nextjs/scripts/verify-topic-clusters.mjs`) and wire it into test/predeploy.
- [x] Extend UI scan coverage with `/blog/topics` and `/blog/ssr-ai-citations-fundamentals`.

## Completed
- [x] Fixed homepage structured data conflict by preventing duplicate `FAQPage` JSON-LD emission (implemented Feb 23, 2026; revalidation pending in Search Console).
- [x] Audited homepage structured data and kept a single full `FAQPage` entity on `/`.
- [x] Implemented hard stop for legacy `/_/view` with explicit `410 Gone` + `X-Robots-Tag: noindex, nofollow` and removed `/_/` robots disallow to allow recrawl.
- [x] Canonical host set to `https://www.maxpetrusenko.com`.
- [x] Title duplication removed from page metadata.
- [x] Medium slug extraction fixed and sitemap deduped.
- [x] `llm.txt` and `llms.txt` served from `nextjs/public/`.
