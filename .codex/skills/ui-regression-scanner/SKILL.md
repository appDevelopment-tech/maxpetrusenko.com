---
name: ui-regression-scanner
description: Use when scanning for UI regressions in this repo; runs Playwright-based route scans and summarizes layout/metadata failures with actionable fixes.
---

# UI Regression Scanner

Route-level UI scanner for this site using existing `ui-scan.mjs` patterns.

## Workflow

1. From `nextjs/`, run:
   - `npm run ui:scan`
2. If needed, run against production/staging:
   - `UI_SCAN_BASE_URL=https://www.maxpetrusenko.com npm run ui:scan`
3. Report failures with route + reason:
   - status
   - missing/invalid canonical
   - noindex robots on indexable pages
   - missing title or h1

## Optional Visual Follow-up

Use Playwright skill screenshots for routes flagged by `ui-scan.mjs`.
