# Add Projects to Tech Page & Verify Unpushed Changes

## Overview

Add two SaaS projects (Immigrateful and Geo-Analyzer) to the `/tech` page's "Recent work" section and comprehensively verify all staged/untracked code changes before deploying to production.

## Current State Analysis

### Tech Page Project Display Pattern

The `/tech` page uses inline `article-card` components in the "Recent work" section (lines 321-465) rather than pulling from the `projects.ts` CMS. Projects are hardcoded as JSX with this structure:

```tsx
<a className="article-card" href="https://example.com" target="_blank" rel="noopener">
  <Image className="article-thumb" src="..." alt="..." width={400} height={225} />
  <div className="article-body">
    <span className="article-title">Project Title</span>
    <span className="article-sub">Description...</span>
    <div className="article-meta">
      <span className="stat">Status</span>
      <span className="stat">Feature</span>
    </div>
  </div>
</a>
```

### Projects to Add

**1. Immigrateful (immigrateful.co)**
- Wix + Velo frontend
- Node.js automation backend with RSS aggregation (10+ EN/RU feeds)
- ChatGPT content rewriting integration
- SEO/AEO/geo optimizations with structured data
- WhatsApp approval workflows (Pipedream)
- Asylum preparation packet generation system

**2. Geo-Analyzer (geo-analyzer.com)**
- Next.js 14 + App Router
- OpenAI GPT-5.2 scoring for GEO readiness
- Cheerio web crawling (8 pages max)
- Supabase database + Mailgun email reports
- Stripe integration (payment ready)
- Framer Motion animations, Apple-inspired design

### Unpushed Changes Summary (22 files, +835/-398)

**Modified Files:**
- `articles/route.ts` - API updates
- `blog/[slug]/page.tsx`, `blog/page.tsx`, `blog/tag/[tag]/page.tsx` - Refactored blog pages
- `sitemap.ts` - Expanded route coverage
- `spirituality/*` - Multiple content updates
- `tech/*` - Service cards, implementation playbooks
- `lib/api/medium.ts` - Enhanced RSS parsing (+137 lines)
- `lib/cms/articles.ts` - New CMS functions (+300 lines)
- `next.config.ts` - Config updates
- `styles/globals.css` - Style additions

**New Untracked Files:**
- `tech/articles/page.tsx` - Tech articles index page
- `tech/articles/generative-engine-optimization-geo/` - GEO framework article
- `tech/articles/openclaw-installation-playbook/` - OpenClaw deployment guide
- `tech/articles/seo-is-dead/` - SEO strategy article
- `spirituality/articles/page.tsx` - Spirituality articles index
- `spirituality/blog/questions-to-ask-tantra-practitioner/` - New blog post
- `spirituality/blog/tantra-vs-regular-massage/` - New blog post
- `spirituality/blog/temple-space-preparation/` - New blog post
- `public/images/article-covers/` - 17 SVG cover images
- `scripts/verify-predeploy.mjs` - Pre-deploy verification script

### Testing Infrastructure

- `.playwright-mcp/` directory exists
- Chrome MCP tools available (mcp__claude-in-chrome__*)
- `verify-predeploy.mjs` script already validates routes, sitemap consistency, and weak content patterns
- `npm run lint` available
- `npm run build` for typechecking

## Desired End State

1. Both Immigrateful and Geo-Analyzer projects displayed prominently on `/tech` page
2. All modified files verified for correctness (no regressions)
3. All new untracked files verified complete and functional
4. Browser automation testing confirms:
   - Blog posts render correctly
   - Tech page displays new projects
   - Spirituality pages work
   - No broken links or UI issues
5. Pre-deploy verification passes
6. Lint and build succeed

## Key Discoveries

- The `verify-predeploy.mjs` script already includes critical routes including the new `/tech/articles`, `/spirituality/articles`, and new spirituality blog posts
- Article cover images exist as SVGs in `/public/images/article-covers/` (17 files)
- New spirituality blog posts follow existing patterns with proper `JsonLd` structured data
- Tech articles index page already lists all articles including new ones
- The tech page "Recent work" section uses hardcoded article-card components, not the projects CMS

## What We're NOT Doing

- Modifying the `projects.ts` CMS file (not currently used by tech page)
- Creating separate project detail pages
- Taking new screenshots of project sites
- Updating sitemap (already includes new routes)
- Deploying to production (verification only)

## Implementation Approach

Add project cards to tech page following existing pattern, then run comprehensive verification using existing scripts plus browser automation.

## Phase 1: Add Immigrateful Project to Tech Page

### Overview
Add Immigrateful as an article-card in the "Recent work" section of `/tech/page.tsx`.

### Changes Required:

**File**: `nextjs/app/tech/page.tsx`
**Location**: After "Blog Automation (In progress)" card (around line 442), before GitHub card

**Add this article-card:**
```tsx
<a
  className="article-card"
  href="https://immigrateful.co"
  target="_blank"
  rel="noopener"
>
  <Image
    className="article-thumb"
    src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80"
    alt="Immigrateful immigration platform"
    width={400}
    height={225}
  />
  <div className="article-body">
    <span className="article-title">Immigrateful</span>
    <span className="article-sub">
      Immigration news platform with Wix + Velo frontend, Node.js RSS automation,
      ChatGPT content rewriting, and WhatsApp approval workflows.
    </span>
    <div className="article-meta">
      <span className="stat">Live</span>
      <span className="stat">Wix + Velo</span>
      <span className="stat">AI automation</span>
    </div>
  </div>
</a>
```

### Success Criteria:

#### Automated Verification:
- [ ] File compiles without TypeScript errors
- [ ] Image URL is accessible
- [ ] Link is valid external URL

#### Manual Verification:
- [ ] Card appears in correct position on tech page
- [ ] Image loads correctly
- [ ] External link navigates to immigrateful.co
- [ ] Tags/badges display properly

---

## Phase 2: Add Geo-Analyzer Project to Tech Page

### Overview
Add Geo-Analyzer as an article-card in the "Recent work" section, positioned after Immigrateful.

### Changes Required:

**File**: `nextjs/app/tech/page.tsx`
**Location**: After the Immigrateful card added in Phase 1

**Add this article-card:**
```tsx
<a
  className="article-card"
  href="https://geo-analyzer.com"
  target="_blank"
  rel="noopener"
>
  <Image
    className="article-thumb"
    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80"
    alt="GEO Analyzer dashboard"
    width={400}
    height={225}
  />
  <div className="article-body">
    <span className="article-title">Geo-Analyzer</span>
    <span className="article-sub">
      AI-powered GEO readiness scanner. Scores websites for AI recommendation
      visibility using OpenAI GPT-5.2, with real-time reports and email delivery.
    </span>
    <div className="article-meta">
      <span className="stat">Live</span>
      <span className="stat">Next.js</span>
      <span className="stat">OpenAI</span>
    </div>
  </div>
</a>
```

### Success Criteria:

#### Automated Verification:
- [ ] File compiles without TypeScript errors
- [ ] Image URL is accessible
- [ ] Link is valid external URL

#### Manual Verification:
- [ ] Card appears after Immigrateful on tech page
- [ ] Image loads correctly
- [ ] External link navigates to geo-analyzer.com
- [ ] Tags/badges display properly

---

## Phase 3: Verify Modified Files

### Overview
Review all 22 modified files for correctness and potential regressions.

### Files to Review:

**API & CMS Layer:**
- `app/api/articles/route.ts` - Verify RSS fetching still works
- `lib/api/medium.ts` - Verify enhanced parsing doesn't break existing feeds
- `lib/cms/articles.ts` - Verify new CMS functions export correctly

**Blog Pages:**
- `app/blog/[slug]/page.tsx` - Verify refactored slug handling
- `app/blog/page.tsx` - Verify blog index renders
- `app/blog/tag/[tag]/page.tsx` - Verify tag filtering works

**Spirituality Pages:**
- `app/spirituality/page.tsx` - Verify new additions render
- `app/spirituality/blog/page.tsx` - Verify blog index updates
- `app/spirituality/blog/what-to-expect-first-tantra-session/page.tsx` - Verify existing page unchanged

**Tech Pages:**
- `app/tech/[slug]/page.tsx` - Verify slug routing
- `app/tech/articles/*/page.tsx` - Verify article pages render

**Config:**
- `app/sitemap.ts` - Verify all new routes included
- `config/site.ts` - Verify config changes
- `next.config.ts` - Verify config valid
- `package.json` - Verify dependencies valid

**Styles:**
- `styles/globals.css` - Verify new styles don't break existing UI

### Success Criteria:

#### Automated Verification:
- [ ] Linting passes: `cd nextjs && npm run lint`
- [ ] Build succeeds: `cd nextjs && npm run build`
- [ ] Pre-deploy verification passes: `cd nextjs && npm run verify:predeploy`

#### Manual Verification:
- [ ] All modified pages load without errors
- [ ] No visual regressions in styling
- [ ] Blog functionality works (slug pages, tag pages)
- [ ] Spirituality pages render correctly
- [ ] Tech articles are accessible

---

## Phase 4: Verify New Untracked Files

### Overview
Ensure all new untracked files are complete and functional.

### Files to Verify:

**Index Pages:**
- `app/tech/articles/page.tsx` - Verify article index lists all 8 articles
- `app/spirituality/articles/page.tsx` - Verify index lists 5 articles

**New Articles:**
- `app/tech/articles/generative-engine-optimization-geo/page.tsx` - Full content
- `app/tech/articles/openclaw-installation-playbook/page.tsx` - Full content
- `app/tech/articles/seo-is-dead/page.tsx` - Full content
- `app/spirituality/blog/questions-to-ask-tantra-practitioner/page.tsx` - Full content
- `app/spirituality/blog/tantra-vs-regular-massage/page.tsx` - Full content
- `app/spirituality/blog/temple-space-preparation/page.tsx` - Full content

**Assets:**
- `public/images/article-covers/*.svg` - Verify all 17 SVGs exist and are valid

**Scripts:**
- `scripts/verify-predeploy.mjs` - Already reviewed in Phase 3

### Success Criteria:

#### Automated Verification:
- [ ] All new page files exist: `ls -la nextjs/app/tech/articles/*/page.tsx`
- [ ] All new spirituality blog pages exist
- [ ] All 17 SVG cover images exist: `ls nextjs/public/images/article-covers/ | wc -l`

#### Manual Verification:
- [ ] Tech articles index page displays all 8 articles
- [ ] Spirituality articles index displays all 5 articles
- [ ] Each new article page renders with content
- [ ] Article cover images load on each page
- [ ] No missing image errors in browser console

---

## Phase 5: Browser Automation Testing

### Overview
Use Chrome MCP tools to visually verify the site works end-to-end.

### Test Scenarios:

**1. Tech Page Verification**
- Navigate to http://localhost:3000/tech
- Verify Immigrateful card is visible
- Verify Geo-Analyzer card is visible
- Take screenshot of "Recent work" section
- Click Immigrateful link, verify navigates to immigrateful.co
- Return, click Geo-Analyzer link, verify navigates to geo-analyzer.com

**2. Blog Verification**
- Navigate to http://localhost:3000/blog
- Verify blog posts render
- Click a blog post, verify slug page loads
- Navigate to a tag page, verify filtering works

**3. Spirituality Pages Verification**
- Navigate to http://localhost:3000/spirituality
- Verify page renders correctly
- Navigate to /spirituality/articles
- Verify all 5 articles listed
- Click an article, verify page loads
- Navigate to /spirituality/blog
- Verify blog posts render

**4. Tech Articles Verification**
- Navigate to http://localhost:3000/tech/articles
- Verify all 8 articles listed
- Click "Generative Engine Optimization (GEO) Framework"
- Verify article page loads with content
- Click "SEO Is Not Dead" article
- Verify article page loads

**5. Link Integrity Check**
- Check for broken internal links
- Verify all external links have `rel="noopener"`
- Check console for 404 errors

### Success Criteria:

#### Automated Verification:
- [ ] Dev server starts: `cd nextjs && npm run dev`
- [ ] No console errors during page loads
- [ ] All navigation successful

#### Manual Verification:
- [ ] Screenshots captured for key pages
- [ ] All project cards visible and styled correctly
- [ ] No layout breaks
- [ ] Images load on all pages
- [ ] External links navigate correctly

---

## Phase 6: Final Pre-Deploy Checks

### Overview
Run all verification scripts before considering the changes ready for deploy.

### Checklist:

**1. Code Quality**
- [ ] `cd nextjs && npm run lint` passes with no errors
- [ ] `cd nextjs && npm run build` completes successfully
- [ ] No TypeScript errors in build output

**2. Route Verification**
- [ ] `cd nextjs && npm run verify:predeploy` passes
- [ ] All critical routes exist
- [ ] Sitemap matches actual routes
- [ ] No weak placeholder content detected

**3. Git Status Review**
- [ ] Review `git status --short` output
- [ ] Confirm all intended changes are staged
- [ ] No accidental temporary files included

**4. Visual Regression**
- [ ] Compare homepage with production
- [ ] Compare /tech page with production
- [ ] Compare /spirituality page with production

### Success Criteria:

#### Automated Verification:
- [ ] Lint: `cd nextjs && npm run lint`
- [ ] Build: `cd nextjs && npm run build`
- [ ] Predeploy: `cd nextjs && npm run verify:predeploy`

#### Manual Verification:
- [ ] Local site at http://localhost:3000 matches expectations
- [ ] No visual regressions compared to mental baseline
- [ ] All new content displays correctly

---

## Testing Strategy

### Unit Tests:
- Not applicable (project doesn't have unit test setup)

### Integration Tests:
- `npm run verify:predeploy` validates route-file consistency
- Browser automation tests end-to-end user flows

### Manual Testing Steps:
1. Start dev server: `cd nextjs && npm run dev`
2. Open http://localhost:3000/tech
3. Scroll to "Recent work" section
4. Verify Immigrateful and Geo-Analyzer cards appear
5. Click each project link, verify navigation
6. Navigate to /tech/articles, verify all articles listed
7. Navigate to /spirituality/articles, verify all articles listed
8. Click various articles, verify content loads
9. Check browser console for errors
10. Test responsive design at different viewport sizes

## Performance Considerations

- New article pages are static server components (no performance impact)
- External images use Unsplash CDN (already cached)
- No new JavaScript added to client bundle
- SVG cover images are small (<2KB each)

## Migration Notes

No data migration required. All changes are additive:
- Two new project cards
- New article pages (static routes)
- New assets (SVG images)

## References

- Tech page template: `nextjs/app/tech/page.tsx:321-465`
- Projects CMS (not currently used): `nextjs/lib/cms/projects.ts`
- Pre-deploy verification: `nextjs/scripts/verify-predeploy.mjs`
- Immigrateful project: `../immigrateful/`
- Geo-Analyzer project: `../geo-analyzer/`
