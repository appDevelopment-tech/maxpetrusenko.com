#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs}"
cd "$ROOT"

npm run ui:scan
