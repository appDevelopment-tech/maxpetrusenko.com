---
name: geo-seo-auditor
description: Use when auditing GEO/SEO quality and regressions in this repo; runs tests and scans robots/sitemap/llms/schema consistency and reports actionable issues.
---

# GEO SEO Auditor

Use this to generate an SEO/GEO regression report.

## Audit Flow

1. Run full validation from `nextjs/`:
   - `npm run test`
2. Check crawl directives and coverage:
   - `nextjs/app/robots.ts`
   - `nextjs/app/sitemap.ts`
   - `nextjs/public/llms.txt`
3. Spot-check schema output and metadata for changed pages.
4. Produce a short findings list ordered by severity with concrete file references.

## Output Format

- `critical`: breaks crawl/indexing/incorrect canonicals
- `high`: schema mismatch, missing route coverage
- `medium`: stale TODO/reporting mismatches
- `low`: optional hardening opportunities

Use `scripts/run_audit.sh` for a consistent baseline run.
