# AI-First SEO & GEO Implementation Checklist

For: maxpetrusenko.com

Last Updated: 2026-01-15

---

## PHASE 0 — ENTITY & POSITIONING RESET

### 0.1 Canonical Identity Definition
- [x] **Draft positioning statement**
  - "Max Petrusenko is a software developer and AI automation consultant who builds production-grade systems for content, workflow, and integration efficiency, with a secondary practice in somatic bodywork."
- [ ] Verify on `/about` page
- [ ] Update LinkedIn bio
- [ ] Update GitHub profile
- [ ] Add to any AI-facing index pages

### 0.2 Disambiguation Page
- [x] Create `/identity` page
- [ ] Verify includes: full name, primary vs secondary work, what you do NOT do, distinctions
- [ ] Add explicit links to authoritative pages

---

## PHASE 1 — SEMANTIC AUTHORITY ARCHITECTURE

### 1.1 Topic Clusters

**Cluster A — Primary (Revenue / Authority): `/dev` → using `/tech`**
- [x] `/tech` hub page exists
- [x] `/tech/ai-automation` created
- [x] `/tech/case-studies` created
- [ ] `/tech/api-integrations`
- [ ] `/tech/content-systems`
- [ ] `/tech/tools` (optional)

**Cluster B — Secondary (Somatic / In-Person): `/somatic`**
- [x] Create `/somatic` hub page
- [x] `/somatic/approach`
- [x] `/somatic/modalities`
- [x] `/somatic/training`
- [ ] `/somatic/testimonials` (data in CMS, page optional)
- [x] `/somatic/location` (GEO relevance) — integrated into hub page with current location banner

**Cluster C — Bridge (Optional): `/performance`**
- [x] Create `/performance` bridge page
  - Theme: regulation, energy, sustainability for builders
  - NOTE: Contains TODO placeholders for user to fill (stats, protocols, pricing)

### 1.2 Pillar → Cluster Rules
- [ ] Define pillar pages for each cluster
- [ ] Implement internal linking: cluster pages link within cluster + pillar only
- [ ] Cross-cluster links only via `/about` or `/performance`

---

## PHASE 2 — EXPERIENCE & E-E-A-T PROOF

### 2.1 Case Studies
- [x] Create `/tech/case-studies` page
- [ ] **Add 3-5 real case studies with:**
  - [ ] Context (what existed before)
  - [ ] Your role (explicit)
  - [ ] Actions taken (technical specifics)
  - [ ] Outcomes (numbers if possible)
  - [ ] Tools / stack used
  - [ ] Timeframe

### 2.2 Proof Index
- [x] Create `/proof` page
- [x] Verify aggregates: case studies, GitHub links, client quotes, training/certifications, talks/publications
  - Testimonials added to CMS (3 from atelier website)
  - NOTE: Consider Trustpilot integration for enhanced trustworthiness

---

## PHASE 3 — EXTRACTABLE, FACT-DENSE CONTENT

### 3.1 Rewrite Service Pages as Extraction Units
For each key page, enforce structure:
- [x] `/tech/ai-automation` — verified as extraction unit with:
  - [x] Definition (2 sentences, declarative)
  - [x] Problems it solves (bullets)
  - [x] Who it's for / not for (bullets)
  - [x] How it works (numbered steps)
  - [x] Typical outcomes (metrics, ranges)
  - [x] Constraints / tradeoffs
  - [x] FAQ (40-60 word answers)
- [ ] `/tech/api-integrations` rewrite as extraction unit
- [ ] `/tech/content-systems` rewrite as extraction unit

### 3.2 Increase Information Gain
- [ ] Add benchmarks (even if approximate, but labeled)
- [ ] Add comparisons (tables)
- [ ] Add before/after states
- [ ] Add explicit assumptions

---

## PHASE 4 — GEO & REMOTE POSITIONING

### 4.1 One GEO Truth Model
- [x] Add to homepage: current location banner (Dubai → Athens → Lisbon)
- [x] Add to `/somatic`: location tiles with current and regular bases
- [x] Add to `/about`: "Remote / Global" + primary timezone
- [x] Clarify in-person availability (current location in homepage banner)

### 4.2 Minimal GEO Pages (Only if Legit)
- [x] **DECISION: No static location pages needed** — using dynamic location banner instead
  - Rationale: User travels (Dubai → Greece → Lisbon), has regular bases (Miami, Ubud)
  - Current location displayed on homepage and /somatic hub
  - Static pages would become stale quickly

---

## PHASE 5 — TECHNICAL & GOVERNANCE

### 5.1 robots.txt + sitemap.xml
- [x] Clean `robots.ts` with proper rules
- [x] `sitemap.ts` includes all pages
- [x] Sitemap declared in robots

### 5.2 llm.txt
- [x] Created with preferred citations and disallowed inferences

### 5.3 Structured Data (Schema)
- [x] Add `Person` schema — verified in `structured-data.ts`
- [x] Add `Organization` schema (solo) — verified in `structured-data.ts`
- [x] Add `ProfessionalService` schema for tech and somatic services
- [x] Add `TechArticle` schema for blog/posts
- [x] Add `FAQPage` schema to FAQ sections

---

## PHASE 6 — AI FEEDBACK & COMPETITION LOOP

Monthly (1-2 hours total):
- [ ] Query: "Who is Max Petrusenko?"
- [ ] Query: "AI automation consultant for [niche]"
- [ ] Note: Are you cited? Described correctly?
- [ ] Competitive scan: Who else is cited? What facts do they include?
- [ ] Update: One page per month max

---

## Progress Summary

| Phase | Progress |
|-------|----------|
| Phase 0 | ~50% (page created, external TBD: LinkedIn, GitHub) |
| Phase 1 | ~75% (tech cluster mostly done, somatic cluster ✅, performance ✅) |
| Phase 2 | ~60% (pages created, testimonials added, case study content TBD) |
| Phase 3 | ~33% (ai-automation ✅, 2 more service pages pending) |
| Phase 4 | ~100% ✅ (GEO strategy implemented via dynamic location banner) |
| Phase 5 | ~100% ✅ (robots/sitemap/llm.txt/schema all complete) |
| Phase 6 | 🔄 Ongoing (monthly AI queries) |

**Overall: ~60% complete**

---

## Recent Updates (2026-01-15)

### Completed in This Session:
- ✅ Created `/somatic` cluster (4 pages):
  - `/somatic` — hub page with current location, session types, FAQ
  - `/somatic/approach` — boundaries-first methodology
  - `/somatic/modalities` — 3 session types detailed
  - `/somatic/training` — lineage and certifications
- ✅ Created `/performance` bridge page (with TODO placeholders to fill)
- ✅ Added 3 testimonials from atelier website to CMS
- ✅ Updated sitemap.ts with new pages
- ✅ Updated homepage social proof bar (200+ sessions, 4.9/5 satisfaction)
- ✅ Verified structured data complete (Person, Organization, ProfessionalService, FAQPage, TechArticle)
- ✅ Verified `/tech/ai-automation` as proper extraction unit

### TODOs to Fill (User Action Required):
- `/performance` page has multiple TODO placeholders:
  - Stats on founder burnout, stress, health impacts
  - Practice details (specific timing, outcomes)
  - Offer details (pricing, format, booking)
  - Protocol step-by-step details
  - Resources (audio practice, checklist, template)
- Case studies content (3-5 real case studies with details)
- Additional service pages: `/tech/api-integrations`, `/tech/content-systems`

### External Tasks:
- Update LinkedIn bio with canonical identity
- Update GitHub profile
- Consider Trustpilot integration for testimonials
- Monthly: Query AI for "Who is Max Petrusenko?" and verify accuracy
--------------
Website Review & Rating

 Overall Rating: 7.5/10

 ---
 Breakdown by Category

 Design & UX: 8/10 ✅

 - Clean, modern aesthetic
 - Good visual hierarchy
 - Consistent card-based layout
 - Clear typography and spacing
 - Color-coded sections (tech vs somatic)
 - Minor issue: Button text inconsistency across pages

 Content Completeness: 7/10 ⚠️

 - Home page: Complete with social proof, featured work
 - Somatic cluster: Complete and well-structured
 - Tech section: AI automation page detailed, case studies present
 - Performance page: Has placeholders (Resources "coming soon")
 - Issues:
   - Only 3 testimonials (all spirituality) - tech/mindfold testimonials missing
   - /links page has placeholder tech profile links
   - Some TODO comments were removed but content still needs filling

 SEO/GEO Implementation: 8/10 ✅

 - Structured data (Schema.org) comprehensive
 - Sitemap includes all pages
 - Meta descriptions present on all pages
 - LLM.txt file present
 - Hidden keywords for AI extraction
 - Minor: Could add more FAQ schema

 Technical Quality: 8/10 ✅

 - Clean Next.js 15 codebase
 - TypeScript throughout
 - Good component organization
 - CMS abstraction for content
 - Cloudflare Workers deployment ready
 - Minor: Some console warnings about lockfiles

 Content Depth: 7/10 ⚠️

 - 4 detailed case studies
 - Clear service descriptions
 - Process/outcomes documented
 - Missing:
   - Tech testimonials (only spirituality ones exist)
   - API integrations page (referenced but not created)
   - Content systems page (referenced but not created)
   - Some pricing details marked "coming soon"

 ---
 Issues Found

 High Priority

 1. Tech testimonials missing - /lib/cms/testimonials.ts has only 3 spirituality testimonials
 2. Service pages incomplete - /tech/api-integrations and /tech/content-systems not created

 Medium Priority

 3. Button text inconsistency - "Book via WhatsApp", "Text to book", "Message", "Inquire" used interchangeably
 4. Performance page - Some offers need pricing details filled in

 Low Priority

 5. Links page - Tech profile section has placeholder links
 6. Mobile responsiveness - Not fully tested

 ---
 Quick Wins to Reach 9/10

 1. Add 2-3 tech client testimonials
 2. Create /tech/api-integrations page (reuse extraction unit structure)
 3. Standardize WhatsApp button text to "Book via WhatsApp" or "Inquire"
 4. Fill in pricing on Performance page offers

 ---
 What's Working Well

 - ✅ Homepage clearly communicates dual identity (tech + somatic)
 - ✅ Social proof bar adds credibility (200+ sessions, 4.9/5)
 - ✅ Location banner shows current availability
 - ✅ Case studies are detailed with metrics
 - ✅ Clear CTAs throughout
 - ✅ Good SEO foundation with structured data