---
name: content-cluster-publisher
description: Use when adding or updating topic-cluster articles in this repo; follows existing CMS patterns, validates links, and runs verify-topic-clusters.
---

# Content Cluster Publisher

Use this for `/blog/*`, `/tech/articles/*`, and cluster-aware publishing tasks.

## Publishing Flow

1. Add/update content in existing data/CMS patterns.
2. Ensure internal links to cluster hub and siblings are present.
3. Validate integrity:
   - `node nextjs/scripts/verify-topic-clusters.mjs`
4. Run full predeploy checks when changes are substantial:
   - `cd nextjs && npm run test`

## Quality Rules

- No orphan articles.
- Keep slugs deterministic and collision-free.
- Keep sitemap alignment for new canonical routes.
