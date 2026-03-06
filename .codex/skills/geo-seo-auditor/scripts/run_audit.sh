#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs}"
cd "$ROOT"

npm run test

echo "\n[geo-seo-auditor] robots/sitemap/llms quick checks"
rg -n "Disallow|Allow" app/robots.ts || true
rg -n "baseUrl|/tech|/spirituality|/blog" app/sitemap.ts || true
rg -n "maxpetrusenko|tech|somatic|mindfold" public/llms.txt || true
