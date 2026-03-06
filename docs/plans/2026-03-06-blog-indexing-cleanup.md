# Blog Indexing Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Search Console `noindex` exclusions by redirecting non-canonical blog URLs and making useful tag archives indexable.

**Architecture:** Keep the logic centered in the existing blog compatibility helper so route behavior stays testable outside the page components. Use that helper from `/blog/[slug]`, `/blog/tag/[tag]`, and `app/sitemap.ts` so redirects, metadata, and crawl surfaces stay aligned.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner, sitemap metadata route

---

### Task 1: Lock the redirect and tag-indexing rules with tests

**Files:**
- Modify: `nextjs/lib/cms/legacy-blog-compat.test.mjs`
- Modify: `nextjs/lib/cms/legacy-blog-compat.ts`

**Step 1: Write the failing test**

Add coverage for:
- redirecting `/blog/<slug>` to the canonical local route when the article lives outside `/blog/*`
- redirecting `/blog/<slug>` to the external Medium URL when the article is only an archive mirror
- redirecting single-article tag pages to the article URL
- marking multi-article tag pages as indexable

**Step 2: Run test to verify it fails**

Run: `node --test nextjs/lib/cms/legacy-blog-compat.test.mjs`

Expected: FAIL because the new helper behavior is not implemented yet.

**Step 3: Write minimal implementation**

Implement pure helpers in `nextjs/lib/cms/legacy-blog-compat.ts` for:
- canonical blog article redirect resolution
- tag-page redirect/indexing decisions

**Step 4: Run test to verify it passes**

Run: `node --test nextjs/lib/cms/legacy-blog-compat.test.mjs`

Expected: PASS

### Task 2: Apply the rules to blog pages

**Files:**
- Modify: `nextjs/app/blog/[slug]/page.tsx`
- Modify: `nextjs/app/blog/tag/[tag]/page.tsx`

**Step 1: Use the tested redirect helpers**

Update `/blog/[slug]` to permanently redirect non-canonical local and external article slugs. Update `/blog/tag/[tag]` to permanently redirect singleton tags and remove blanket `noindex` from multi-article tag pages.

**Step 2: Keep metadata aligned**

Ensure tag pages that remain live use self-canonical metadata and are indexable.

**Step 3: Verify route behavior**

Run targeted checks after implementation:
- `node --test nextjs/lib/cms/legacy-blog-compat.test.mjs`

### Task 3: Expose indexable tag archives to crawlers

**Files:**
- Modify: `nextjs/app/sitemap.ts`
- Modify: `GEO_SEO_TODO.md`

**Step 1: Add only indexable tag pages to the sitemap**

Emit `/blog/tag/*` entries only when the tag has more than one article.

**Step 2: Sync SEO tracking**

Update `GEO_SEO_TODO.md` with the March 6, 2026 indexing cleanup and note the tag archive behavior.

### Task 4: Verify the shipped result

**Files:**
- No code changes expected

**Step 1: Run lint**

Run: `npm run lint`

**Step 2: Run predeploy verification**

Run: `npm run verify:predeploy`

**Step 3: Report actual status**

Summarize what passed, what failed, and any remaining Search Console buckets that still need follow-up.
