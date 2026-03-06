# Kyo-tai And Bitcoin Content Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish canonical Kyo-tai and Bitcoin articles, make the sample tag URLs real archive pages, and map the old Bitcoin hash URL to the new readable article.

**Architecture:** Add local CMS entries plus canonical page routes for the new articles. Update legacy compatibility helpers so the old Bitcoin hash redirects to the new article while tag pages with content remain renderable and indexable.

**Tech Stack:** Next.js App Router, local CMS article data, JSON-LD SEO helpers, Node test runner, sitemap generation.

---

### Task 1: Lock redirect and tag behavior in tests

**Files:**
- Modify: `nextjs/lib/cms/legacy-blog-compat.test.mjs`

### Task 2: Update compatibility helper behavior

**Files:**
- Modify: `nextjs/lib/cms/legacy-blog-compat.ts`
- Modify: `nextjs/app/blog/tag/[tag]/page.tsx`

### Task 3: Add canonical article content

**Files:**
- Create: `nextjs/app/spirituality/blog/what-is-kyo-tai/page.tsx`
- Create: `nextjs/app/spirituality/blog/kyo-tai-session-what-happens/page.tsx`
- Create: `nextjs/app/tech/articles/bitcoin-as-strong-money/page.tsx`
- Modify: `nextjs/lib/cms/articles.ts`

### Task 4: Wire discovery surfaces

**Files:**
- Modify: `nextjs/app/spirituality/blog/page.tsx`
- Modify: `nextjs/app/tech/articles/page.tsx`
- Modify: `nextjs/app/sitemap.ts`

### Task 5: Validate

**Files:**
- Run: `node --test nextjs/lib/cms/legacy-blog-compat.test.mjs`
- Run: `node nextjs/scripts/verify-topic-clusters.mjs`
- Run: `cd nextjs && npm run lint`
- Run: `cd nextjs && npm run verify:predeploy`
