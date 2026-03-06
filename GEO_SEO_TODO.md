# AI-First SEO & GEO Implementation Checklist

For: maxpetrusenko.com (Next.js app in /nextjs)
Last Updated: 2026-03-06

---

## PHASE 0 — IDENTITY & POSITIONING

- [x] Canonical name and focus appear in page titles and descriptions
- [x] Add a compact "entity card" block on the homepage (who/what/where/offer)
- [x] Align external bios (LinkedIn, GitHub, X) with the same positioning (copy prepared in `EXTERNAL_BIO_COPY.md`)

---

## PHASE 1 — DISCOVERY & CRAWLABILITY

- [x] `robots.txt` at site root
- [x] `sitemap.xml` at site root
- [x] `llms.txt` at site root
- [x] Noindex duplicate `links/index.html` (N/A for Next.js routes)
- [x] Mindfold canonical set to https://www.mindfoldsanctuary.com/ (subdomain will 301 later)
- [x] Atelier canonical set to https://atelier.maxpetrusenko.com/
- [x] Subdomain/site `robots.txt`, `sitemap.xml`, and `llms.txt` added for Mindfold + Atelier
- [x] Blog now uses local authored routes as primary (`/tech/articles/*`, `/spirituality/blog/*`) with live Medium RSS (no static fallback)
- [x] `/tech/articles` hub route added (resolves breadcrumb target and strengthens internal links)
- [x] Sitemap mismatch fixed for missing `/tech/articles/seo-is-dead` and `/tech/articles/generative-engine-optimization-geo`
- [x] Replaced sitemap-wide `lastModified: new Date()` with route/content-derived dates
- [x] Removed non-canonical Medium fallback `/blog/*` URLs from sitemap and 301 non-canonical `/blog/[slug]` requests to their canonical local or external article URL
- [x] Multi-article `/blog/tag/*` archives are indexable and included in the sitemap; singleton tag pages 301 to the article and missing legacy tags 301 to `/blog/topics` (2026-03-06)
- [x] `/spirituality/articles` hub added with linked long-form pages
- [x] Legacy `/_/view` now returns explicit `410 Gone` with `X-Robots-Tag: noindex, nofollow`
- [x] Removed `/_/` robots disallow so Google can recrawl and process removal state
- [x] Main `robots.txt` blocks `/atelier/` legacy duplicate paths (kept `/mindfold/events` crawlable as canonical main-domain route)

---

## PHASE 2 — ON-PAGE METADATA & CANONICALS

- [x] Canonical tags across all primary pages
- [x] OG + Twitter metadata on all primary pages
- [x] Favicon set across primary pages
- [x] Replace favicon-only OG image with existing share images
- [x] Add a lightweight logo/brand image for structured data `image` fields
- [x] Remove redundant brand suffix in OG/Twitter titles when the page title already includes `Max Petrusenko` (2026-03-06)
- [x] Tighten high-impression titles/descriptions on `/tech/articles/openclaw-installation-playbook`, `/tech/articles/answer-engine-optimization-aeo`, `/tech/articles/generative-engine-optimization-geo`, and `/tech/articles/seo-is-dead` (2026-03-06)
- [x] Reduce keyword cannibalization by removing exact `tantric massage ubud` targeting from supporting spirituality pages so `/tantra-massage-ubud` remains the primary owner (2026-03-06)

---

## PHASE 3 — STRUCTURED DATA (AI + SEARCH)

- [x] `Person` + `WebSite` on core pages
- [x] `ProfessionalService` for tech services
- [x] `ProfessionalService` for somatic services
- [x] `LocalBusiness` for Presence Atelier (Ubud)
- [x] `Organization` for Mindfold Sanctuary
- [x] `FAQPage` schema for spirituality + mindfold FAQ sections (spirituality + mindfold done)
- [x] `Event` schema for Mindfold (rolling quarterly dates; update when fixed dates are published)
- [x] Prevent duplicate `FAQPage` schema on pages that already publish a primary FAQ block (home/tech/spirituality direct-answer blocks switched to `WebPage` schema)
- [x] Reduce homepage markup duplication by removing hidden person microdata and trimming redundant layout-level `Person` schema output (2026-03-06)

---

## PHASE 4 — CONTENT DEPTH & EXTRACTABILITY

- [x] Add 3-5 tech case studies with explicit outcomes (metrics)
- [x] Add 2-3 tech testimonials with names/roles (or anonymized)
- [x] Add high-intent tech content pages (OpenClaw installs, GEO framework, SEO vs AEO)
- [x] Add a concise "services overview" section with bullet facts on `tech.html` and `spirituality.html`
- [x] Add an explicit GEO block for current location + service area
- [x] Publish expansion backlog from `tasks.md` (Tantra 5, AI Infra 3, LLM Evals 10, Hybrid 10, RAG 10, OpenClaw 10, Somatic 10)
- [x] Publish requested topic expansion on `/blog/*` (24 topic clusters x 10 perspective articles each + 10 additional Tantra Practice articles)
- [x] Publish second-wave topic expansion on `/blog/*` (24 topic clusters x +10 new perspective articles each + +10 additional Tantra Practice articles)
- [x] Add `/blog/topics` crawl hub and intra-cluster article links for deeper discovery paths
- [x] Add thread-driven GEO content cluster for SSR/crawler/citation strategy experiments
- [x] Add `ItemList` schema to `/blog/topics` and automate cluster integrity checks in CI-style predeploy testing

---

## PHASE 5 — GEO SIGNALS

- [x] Ubud location referenced on somatic/atelier pages
- [x] Add a consistent location banner or footer line on all pages
- [x] Add `areaServed` and `address` to a dedicated GEO section on the homepage

---

## PHASE 6 — AI FEEDBACK LOOP

Monthly (1-2 hours):
- [ ] Query: "Who is Max Petrusenko?"
- [ ] Query: "Somatic practitioner in Ubud" and "Product builder for creators"
- [ ] Capture citations and update the fact blocks accordingly
- [x] Add pre-deploy verification command (`npm run verify:predeploy`)
- [x] Remove hidden keyword stuffing blocks from service pages (keep visible, evidence-based content only)
- [x] Align AI trust-signal claims with published testimonial counts
- [x] Document Search Console revalidation workflow for known indexing buckets (`GSC_VALIDATION_WORKFLOW.md`)

---

## March 6, 2026 Verified Hardening Pass

- [x] Core landing pages now keep a single primary `h1` by demoting decorative hero overlay headings on `/`, `/blog`, `/tech`, `/spirituality`, and `/tantra-massage-ubud`
- [x] Removed unnecessary `priority` loading from non-LCP images on `/` and `/tantra-massage-ubud`
- [x] Replaced the decorative PNG on `/blog` with the smaller JPG variant already in the repo
- [x] Verified the pass with `npm run lint` and `npm run verify:predeploy` from `nextjs/` on 2026-03-06

---

## Progress Summary

| Area | Status |
| --- | --- |
| Crawlability | ✅ Complete (main + subdomains; blog + spirituality hubs linked) |
| Metadata | ✅ Complete |
| Structured Data | ✅ Core schemas in place |
| Content Depth | ✅ Outcomes/testimonials + high-intent guides |
| GEO | ✅ Strong baseline; no hidden keyword stuffing |

**Overall: ~86% complete**

---

## Website Review & Rating (Current)

Overall Rating: **9.0/10**

Breakdown:
- Technical discovery (robots/sitemap/llms): 9/10
- Metadata & canonicalization: 8/10
- Structured data: 8/10
- Content depth & evidence: 8/10
- GEO clarity: 7/10

---

## Next Quick Wins

1. Add a dedicated 1200x630 OG image asset per site (optional hardening)
2. Align external bios (LinkedIn, GitHub, X) with the same positioning
3. Add unique OG image variants per core route (`/`, `/tech`, `/spirituality`) for citation previews
4. Add route-level guardrails so future support pages cannot retarget the same exact commercial head term as the money page
5. Compress or replace the largest remaining source JPGs used on hero routes if field CWV still shows weak LCP after recrawl
