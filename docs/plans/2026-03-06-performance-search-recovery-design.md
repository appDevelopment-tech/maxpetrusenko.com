# Performance and Search Recovery Design

**Date:** 2026-03-06

## Problem

`maxpetrusenko.com` has a solid crawl/indexing baseline, but the current search-performance pattern shows a different failure mode:

- pages are earning impressions for adjacent queries without earning the click
- high-value routes are carrying mixed intent in titles, descriptions, headings, and schema
- the homepage is heavier than it needs to be for the first paint and LCP path

This means the next phase should not start with more content volume. It should start with tighter intent control, clearer snippets, and cheaper first render.

## Observations

- Live homepage HTML is large because of stacked JSON-LD and mixed-intent sections.
- Multiple top-level routes use duplicated hero patterns that create more than one `h1`.
- Several spirituality support pages target the exact `"tantric massage ubud"` head term even though `/tantra-massage-ubud` should be the primary owner.
- The blog index still uses a large PNG ambient asset where a smaller JPG already exists.
- The homepage marks more than one large image as `priority`, which competes on the critical path.
- Metadata helper behavior can produce redundant Open Graph and Twitter titles when the page title already contains `Max Petrusenko`.

## Approaches

### Approach 1: Content expansion first

Publish more pages for the zero-click and zero-ranking buckets.

**Pros**
- expands query coverage quickly
- useful for long-tail discovery

**Cons**
- increases overlap before existing intent conflicts are resolved
- does not fix weak snippets or heavy first render
- likely worsens crawl-budget and cannibalization risk

### Approach 2: Click recovery first, then performance hardening

Tighten metadata, heading hierarchy, schema, and keyword targeting on the routes already earning impressions. Then remove the biggest above-the-fold performance waste on those routes.

**Pros**
- directly addresses the current GSC pattern
- improves CTR and page clarity before adding more content
- removes overlapping intent that can confuse Google
- improves Core Web Vitals where it matters most

**Cons**
- requires touching multiple high-traffic pages
- some gains depend on re-crawl and re-snippet selection

### Approach 3: Pure performance first

Focus on assets, JS, and render path before snippet or intent changes.

**Pros**
- helps CWV and user experience
- lower behavioral risk than content changes

**Cons**
- does not solve query-page mismatch
- likely leaves impression-rich pages underperforming on CTR

## Recommendation

Use **Approach 2**.

The current evidence says the biggest near-term win is to make the existing ranking pages clearer and more decisive for both users and search systems. Performance work should be folded into the same pass, but only after the winning-page and snippet story is cleaned up.

## Approved Scope

### Phase 1: Query-to-page fit and snippet clarity

- make the primary money pages the clear owners of their head terms
- remove exact-match keyword leakage from support pages
- improve titles and descriptions on the routes already surfacing in GSC
- reduce homepage ambiguity by simplifying duplicated and mixed-intent signals
- fix duplicated top-level heading structure on core pages

### Phase 2: Critical-path performance

- remove unnecessary `priority` image loading on non-LCP images
- swap oversized decorative assets to smaller equivalents where available
- reduce homepage markup weight by removing redundant schema or hidden SEO scaffolding
- preserve current visual direction while lowering first-load cost

### Phase 3: Guardrails and docs

- update `GEO_SEO_TODO.md` to reflect what shipped and what still needs follow-up
- add verification notes so future changes do not reintroduce the same overlap

## Files Expected to Change

- `nextjs/lib/seo/metadata.ts`
- `nextjs/app/page.tsx`
- `nextjs/app/tech/page.tsx`
- `nextjs/app/spirituality/page.tsx`
- `nextjs/app/tantra-massage-ubud/page.tsx`
- `nextjs/app/blog/page.tsx`
- `nextjs/app/spirituality/articles/page.tsx`
- `nextjs/app/spirituality/blog/questions-to-ask-tantra-practitioner/page.tsx`
- `nextjs/app/spirituality/blog/tantra-vs-regular-massage/page.tsx`
- `nextjs/app/spirituality/blog/temple-space-preparation/page.tsx`
- `nextjs/app/tech/articles/openclaw-installation-playbook/page.tsx`
- `nextjs/app/tech/articles/answer-engine-optimization-aeo/page.tsx`
- `nextjs/app/tech/articles/generative-engine-optimization-geo/page.tsx`
- `nextjs/app/tech/articles/seo-is-dead/page.tsx`
- `GEO_SEO_TODO.md`

## Success Criteria

- the head-term owner pages have cleaner and more specific metadata
- support pages stop targeting the same exact head term
- homepage and core landing pages have a single primary `h1`
- non-LCP images stop competing on the critical path
- lint and predeploy verification pass
