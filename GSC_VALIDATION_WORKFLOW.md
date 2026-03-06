# Google Search Console Validation Workflow

For: `https://www.maxpetrusenko.com`  
Prepared: February 23, 2026

## 1) Submit Fresh Sitemap
1. Open Search Console property for `maxpetrusenko.com`.
2. Go to `Indexing` → `Sitemaps`.
3. Submit: `https://www.maxpetrusenko.com/sitemap.xml`.
4. Confirm fetch timestamp updates to today.

## 2) Start Validation for Active Buckets
Open `Page indexing` and run `Start new validation` for:
- `Page with redirect`
- `Discovered - currently not indexed`
- `Crawled - currently not indexed`

Open `FAQ` enhancement report and run `Validate fix` for:
- `Duplicate field "FAQPage"`

## 3) Priority URL Sampling (After Deploy)
Use URL Inspection on:
- `/blog/topics`
- `/blog/ai-fundamentals`
- `/blog/ssr-ai-citations-fundamentals`
- `/blog/ssr-ai-citations-case-study`
- `/blog/tantra-practice-fundamentals`
- `/blog/generative-engine-optimization-fundamentals`
- `/blog/answer-engine-optimization-fundamentals`

Request indexing only for pages that show:
- `URL is not on Google`
- `Discovered - currently not indexed`

## 4) Validation Timing
- Day 0 (today): submit sitemap + start all validations.
- Day 7: review affected URL deltas in each bucket.
- Day 14: compare trendline to February 20, 2026 baseline snapshots.
- Day 30: archive status and open follow-up fixes for remaining clusters.

## 5) Expected Outcomes
- `Page with redirect`: can remain non-zero if redirects are intentional and canonical.
- `Discovered - currently not indexed`: should decline as crawl hub + sitemap entries are processed.
- `Crawled - currently not indexed`: should decline for high-link-depth topic pages first.
- `Duplicate field "FAQPage"`: should clear after Google recrawl of homepage schema.
