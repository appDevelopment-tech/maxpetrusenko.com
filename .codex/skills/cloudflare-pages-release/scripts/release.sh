#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs}"
cd "$ROOT"

npm run lint
npm run verify:predeploy
npm run deploy

echo "[release] smoke checks"
for p in / /tech /spirituality /mindfold/events; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://www.maxpetrusenko.com${p}")"
  echo "${p} -> ${code}"
  [[ "$code" == "200" ]] || { echo "smoke check failed: ${p}"; exit 1; }
done

echo "[release] completed at $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
