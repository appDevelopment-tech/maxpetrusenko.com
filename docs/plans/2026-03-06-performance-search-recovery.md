# Performance and Search Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recover qualified clicks from existing Google impressions and remove the biggest first-load performance drag on core landing pages.

**Architecture:** Tighten intent ownership at the page layer instead of adding more routes. Use existing metadata and JSON-LD helpers, simplify heading hierarchy in the page components, and reduce critical-path image pressure on routes already earning impressions.

**Tech Stack:** Next.js App Router, TypeScript, Next metadata API, `next/image`, existing predeploy verification scripts

---

### Task 1: Fix global metadata title behavior

**Files:**
- Modify: `nextjs/lib/seo/metadata.ts`

**Step 1: Update title handling**

Prevent Open Graph and Twitter titles from appending `| Max Petrusenko` when the supplied page title already includes the brand name.

**Step 2: Verify changed output**

Run: `npm run build`

Expected: build succeeds and rendered metadata no longer duplicates the brand name for pages like `/`.

### Task 2: Make core landing pages unambiguous

**Files:**
- Modify: `nextjs/app/page.tsx`
- Modify: `nextjs/app/tech/page.tsx`
- Modify: `nextjs/app/spirituality/page.tsx`
- Modify: `nextjs/app/tantra-massage-ubud/page.tsx`

**Step 1: Reduce mixed signals**

- keep one primary `h1` per route
- remove redundant hidden SEO scaffolding on the homepage
- keep only the strongest page-intent copy near the top

**Step 2: Reduce performance waste**

- remove `priority` from non-LCP images
- leave `priority` only on the actual first-view hero asset per route

**Step 3: Verify route integrity**

Run: `npm run ui:scan`

Expected: scanned routes still return 200 with valid title, canonical, and visible `h1`.

### Task 3: Stop keyword cannibalization on spirituality support pages

**Files:**
- Modify: `nextjs/app/spirituality/articles/page.tsx`
- Modify: `nextjs/app/spirituality/blog/questions-to-ask-tantra-practitioner/page.tsx`
- Modify: `nextjs/app/spirituality/blog/tantra-vs-regular-massage/page.tsx`
- Modify: `nextjs/app/spirituality/blog/temple-space-preparation/page.tsx`

**Step 1: Narrow the support-page targeting**

Remove the exact `"tantric massage ubud"` targeting from support pages that should not compete with `/tantra-massage-ubud`.

**Step 2: Keep the money page as the owner**

Retain specific Ubud commercial intent on `nextjs/app/tantra-massage-ubud/page.tsx` and make the support pages target adjacent educational intents instead.

**Step 3: Verify route behavior**

Run: `npm run build`

Expected: build succeeds with updated metadata.

### Task 4: Improve snippet fit on high-impression tech routes

**Files:**
- Modify: `nextjs/app/tech/articles/openclaw-installation-playbook/page.tsx`
- Modify: `nextjs/app/tech/articles/answer-engine-optimization-aeo/page.tsx`
- Modify: `nextjs/app/tech/articles/generative-engine-optimization-geo/page.tsx`
- Modify: `nextjs/app/tech/articles/seo-is-dead/page.tsx`

**Step 1: Rewrite titles and descriptions**

Align titles and descriptions more directly with the GSC query buckets already earning impressions:

- OpenClaw installation and Teams integration
- GEO roadmap and implementation
- AEO audit / guide intent
- “SEO is dead” clarification intent

**Step 2: Keep schema aligned**

Ensure `headline`, `description`, and visible hero copy still match the revised page intent.

**Step 3: Verify pages compile**

Run: `npm run build`

Expected: build succeeds and the updated metadata is rendered.

### Task 5: Remove obvious decorative asset waste

**Files:**
- Modify: `nextjs/app/blog/page.tsx`

**Step 1: Replace oversized decorative asset**

Swap the blog index ambient PNG for the smaller JPG already in the repo.

**Step 2: Verify visual safety**

Run: `npm run ui:scan`

Expected: `/blog` remains healthy in the scan.

### Task 6: Sync docs and verification

**Files:**
- Modify: `GEO_SEO_TODO.md`

**Step 1: Record shipped work**

Add a March 6, 2026 note for:

- query-intent tightening
- reduced keyword cannibalization
- homepage/schema cleanup
- first-pass critical image loading cleanup

**Step 2: Run verification**

Run: `npm run lint`

Run: `npm run verify:predeploy`

**Step 3: Report actual status**

Summarize shipped fixes, verification evidence, and remaining follow-up items that still need a later pass.
