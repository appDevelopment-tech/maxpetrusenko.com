---
name: cloudflare-pages-release
description: Use when releasing this repo to Cloudflare Pages; enforces lint, predeploy verification, deploy, and production smoke checks for maxpetrusenko.com.
---

# Cloudflare Pages Release

Standard release skill for this repo.

## Required Release Sequence

1. `cd nextjs`
2. `npm run lint`
3. `npm run verify:predeploy`
4. `npm run deploy`
5. Smoke-check production:
   - `https://www.maxpetrusenko.com/`
   - `/tech`
   - `/spirituality`
   - `/mindfold/events`

## Notes

- Fail fast if any command exits non-zero.
- Include deployed timestamp and smoke-check status in summary.

Use `scripts/release.sh` to execute the sequence.
