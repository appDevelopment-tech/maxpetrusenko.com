# Spirituality AEO/GEO Expansion Plan

**Goal:** Expand discoverability for Max across energy work, spiritual teacher, consciousness, shadow work, breathwork, and tech-spirituality queries without weakening existing tantra and somatic service intent.

**Problem:** The site already has solid crawl surfaces and schema, but the spirituality cluster still under-signals broader discovery terms in visible copy, metadata, cross-links, and synced AI guidance files. The earlier plan over-indexed on keyword additions and risked cannibalization and duplicate schema patterns.

**Principles:**
- Visible evidence first. No hidden keyword blocks.
- Keep `/spirituality` as the commercial service owner.
- Only add `/spirituality/energy-work` if it serves distinct informational intent.
- Update crawl surfaces and operating docs in the same change.
- Keep claims supportable and aligned with published content.

---

## Phase 1: Positioning and claim set

**Goal:** Tighten language before touching keywords.

**Files to inspect/update:**
- `nextjs/app/spirituality/page.tsx`
- `nextjs/lib/seo/structured-data.ts`
- `nextjs/public/llms.txt`
- `nextjs/public/llm.txt`
- `nextjs/public/.ai.txt`

**Plan:**
1. Confirm primary on-site positioning as `tantra practitioner` + `somatic energy work practitioner` + `consciousness bridge`.
2. Treat `spiritual teacher` as a secondary phrase unless the visible site copy and external bios are updated to support it.
3. Preserve current boundaries-first, non-medical language.

**Success condition:** one consistent claim set appears across spirituality copy, schema, and AI guidance files.

---

## Phase 2: AI guidance sync

**Goal:** Make AI-facing guidance files consistent and current.

**Files:**
- `nextjs/public/llms.txt`
- `nextjs/public/llm.txt`
- `nextjs/public/.ai.txt`

**Plan:**
1. Sync `.ai.txt` to current identity and route coverage. It is stale relative to `llms.txt`.
2. Add a compact query set for:
   - energy work
   - somatic energy work
   - shadow work
   - breathwork
   - meditation for developers
   - consciousness and technology
3. Add preferred citation targets only for routes that actually exist.
4. Keep guardrails explicit:
   - not medical therapy
   - no unsupported certification or treatment claims

**Success condition:** all three AI guidance files present the same entity, routes, and query guidance.

---

## Phase 3: Schema hardening

**Goal:** Broaden spirituality discoverability without introducing schema duplication.

**Files:**
- `nextjs/lib/seo/structured-data.ts`

**Plan:**
1. Update `generateSpiritualityPersonSchema()`:
   - strengthen `jobTitle`
   - broaden `description`
   - expand `knowsAbout` with energy work, consciousness, shadow work, meditation, breathwork, and nervous-system language
2. Update `generateProfessionalServiceSchema()`:
   - keep service intent anchored to tantra and somatic work
   - widen keywords and descriptions carefully
3. Extend the existing `generateFAQSchema()` with 4 to 6 broader discovery questions.
4. Do **not** add a second `FAQPage` object for `/spirituality`. This repo already cleaned up duplicate FAQ schema patterns.

**Success condition:** richer spirituality schema with one FAQ source of truth.

---

## Phase 4: Route-level discoverability

**Goal:** Improve extraction on the existing spirituality routes before adding net-new pages.

**Files:**
- `nextjs/app/spirituality/page.tsx`
- `nextjs/app/spirituality/blog/page.tsx`
- `nextjs/app/spirituality/articles/page.tsx`

**Plan:**
1. On `/spirituality`:
   - add a small, relevant `keywords` array
   - strengthen the opening copy with a definition-first paragraph
   - add a visible direct-answer block for a broad query such as `What is energy work?`
2. On `/spirituality/blog` and `/spirituality/articles`:
   - expand metadata for discovery intent
   - clarify that these are educational hubs tied to real practice
3. Keep `/spirituality` as the money page for service and booking intent.

**Success condition:** the existing spirituality cluster is stronger even if no new route is added.

---

## Phase 5: Internal-link graph

**Goal:** Connect spirituality and bridge content so broader queries have crawlable support.

**Files:**
- `nextjs/components/articles/RelatedReading.tsx`
- spirituality article routes that already render `RelatedReading`

**Plan:**
1. Use related-reading modules to connect spirituality, bridge, and selected tech-consciousness content where intent overlaps.
2. Favor links between:
   - energy work
   - shadow work
   - meditation for developers
   - consciousness and technology
3. Keep links editorial and relevant. No forced cross-link stuffing.

**Success condition:** broader concept queries map to a visible article network, not a single service page.

---

## Phase 6: Backlog seeds

**Goal:** Add supporting content without flooding the backlog.

**Files:**
- `nextjs/lib/cms/article-backlog.ts`

**Priority seeds:**
- `what-is-energy-work-complete-guide`
- `how-to-find-a-spiritual-teacher`
- `shadow-work-for-beginners-practical-guide`
- `breathwork-for-nervous-system-regulation`
- `meditation-for-software-developers`
- `programming-as-spiritual-practice`

**Plan:**
1. Add these 6 seeds first.
2. Hold the larger 15-seed expansion until these themes are reflected in live route copy and AI guidance.

**Success condition:** supporting content targets exist without over-expanding scope.

---

## Phase 7: Optional informational hub

**Goal:** Create a distinct owner for broad educational queries only if needed.

**Candidate file:**
- `nextjs/app/spirituality/energy-work/page.tsx`

**Use this route only if:**
- you want a separate educational owner for `what is energy work` and related top-of-funnel queries
- you can maintain distinct intent from `/spirituality`

**Requirements if created:**
1. Informational title and description.
2. Different primary intent from booking/service pages.
3. Added to:
   - `nextjs/app/sitemap.ts`
   - `nextjs/public/llms.txt`
   - `nextjs/public/llm.txt`
   - `nextjs/public/.ai.txt`
4. Internal links from `/spirituality` and relevant articles.

**Success condition:** no cannibalization between service and educational pages.

---

## Validation

Run from `nextjs/`:

```bash
npm run lint
npm run verify:predeploy
```

Manual checks:
1. Confirm metadata and canonical tags on spirituality routes.
2. Confirm JSON-LD validity and no duplicate FAQ output.
3. Confirm AI guidance files stay in sync.
4. Confirm sitemap coverage if a new route is added.
5. Snapshot before/after AI query results for:
   - `energy work practitioner`
   - `somatic energy work`
   - `shadow work`
   - `meditation for developers`
   - `consciousness and technology`

---

## Deliverable order

1. AI guidance sync
2. schema hardening
3. route copy and metadata
4. internal-link updates
5. backlog seeds
6. optional hub page
7. validation

This order improves discovery with minimal blast radius and keeps commercial intent, informational intent, and AI extraction signals cleanly separated.
