---
name: geo-seo-implementer
description: Use when implementing or updating GEO/SEO in this repo; updates metadata/JSON-LD/canonicals/sitemap coverage and keeps GEO_SEO_TODO.md aligned with shipped changes.
---

# GEO SEO Implementer

Use this for code changes that affect discoverability, schema, canonicalization, and GEO signals.

## Workflow

1. Inspect affected routes in `nextjs/app/**` and SEO helpers in `nextjs/lib/seo/**`.
2. Implement metadata + canonical updates using existing helpers.
3. Ensure structured data remains consistent (`WebPage`, `Person`, `ProfessionalService`, `FAQPage` where appropriate).
4. Update crawl surfaces: `nextjs/app/sitemap.ts`, `nextjs/app/robots.ts`, `nextjs/public/llms.txt` when needed.
5. Sync status in `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/GEO_SEO_TODO.md` with concrete checkboxes and date.
6. Validate with:
   - `npm run lint`
   - `npm run verify:predeploy`

## Repo Guardrails

- Work in `nextjs/` for live site behavior.
- Never edit subdomain code in `atelier/` or `mindfold/` unless explicitly requested.
- Prefer visible factual content; avoid hidden keyword blocks.

## Quick Commands

Use `scripts/geo_sync_check.sh` for a fast consistency check before final validation.
