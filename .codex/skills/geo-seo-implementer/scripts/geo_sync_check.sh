#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com}"
cd "$ROOT"

printf "[geo-seo] checking core files...\n"
for f in GEO_SEO_TODO.md nextjs/app/sitemap.ts nextjs/app/robots.ts nextjs/public/llms.txt; do
  [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }
done

printf "[geo-seo] checking homepage schema usage...\n"
rg -n "generate(HomeFAQSchema|EnhancedPersonSchema|TechServiceSchema|ProfessionalServiceSchema)" nextjs/app/page.tsx >/dev/null

printf "[geo-seo] check complete\n"
