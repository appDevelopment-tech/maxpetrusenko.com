# Public Repo and Greptile Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a public GitHub repo for the site, preserve the shipped surfaces that matter, add Greptile config, and add tests plus CI so the public repo is immediately useful.

**Architecture:** Keep the current private repo untouched as the full working repo. Create a sibling public repo that contains the deployable site surfaces and the Next.js app, but excludes local caches and agent tooling. Add a small root test suite plus wrapper scripts that run the existing Next.js validation commands.

**Tech Stack:** Git, GitHub CLI, Node.js, Next.js, Playwright, Cloudflare Pages functions, Greptile config

---

### Task 1: Map the public repo scope

**Files:**
- Create: `docs/plans/2026-03-28-public-repo-greptile-plan.md`
- Inspect: `nextjs/package.json`
- Inspect: `nextjs/app/page.tsx`
- Inspect: `functions/api/subscribe.js`
- Inspect: `functions/api/subscribe/export.js`
- Inspect: `index.html`
- Inspect: `atelier/index.html`
- Inspect: `mindfold/events/index.html`

**Steps:**
1. Confirm the Next.js app is the main app surface.
2. Confirm which static sub-sites and Cloudflare functions should move into the public repo.
3. Exclude local-only files such as `.git`, `.next`, `node_modules`, `.wrangler`, `.vercel`, `.claude`, `.codex`, and other machine state.

### Task 2: Create the sibling public repo workspace

**Files:**
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/`
- Copy: `nextjs/`
- Copy: `functions/`
- Copy: `assets/`
- Copy: `public/`
- Copy: `atelier/`
- Copy: `mindfold/`
- Copy: `links/`
- Copy: `admin/`
- Copy: `index.html`
- Copy: `about.html`
- Copy: `tech.html`
- Copy: `spirituality.html`
- Copy: `links.html`
- Copy: `robots.txt`
- Copy: `sitemap.xml`
- Copy: `llms.txt`

**Steps:**
1. Create the new directory.
2. Copy the chosen source files and directories.
3. Remove copied build artifacts and local machine files.

### Task 3: Add repo metadata and Greptile config

**Files:**
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/README.md`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/.gitignore`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/.greptile/config.json`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/.greptile/rules.md`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/docs/public-repo-map.md`

**Steps:**
1. Document what the public repo contains.
2. Add Greptile ignore patterns for generated files, caches, and agent tooling.
3. Add Greptile review guidance for the mixed static plus Next.js codebase.

### Task 4: Add tests and wrapper scripts

**Files:**
- Modify: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/package.json`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/tests/public-surfaces.test.mjs`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/tests/greptile-config.test.mjs`
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/.github/workflows/ci.yml`

**Steps:**
1. Add root scripts that wrap repo tests and Next.js tests.
2. Add a test that verifies the expected public surfaces exist.
3. Add a test that verifies the Greptile ignore config covers generated and local-only paths.
4. Add CI so the public repo runs on pushes and PRs.

### Task 5: Initialize and publish the repo

**Files:**
- Create: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public/.git/`

**Steps:**
1. Initialize git in the public repo.
2. Create `maxpetrusenko/maxpetrusenko.com-public` as a public GitHub repo.
3. Push the initial branch.

### Task 6: Verify the public repo

**Files:**
- Run in: `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com-public`

**Steps:**
1. Run the new root tests.
2. Run the existing Next.js test suite through the wrapper script.
3. Confirm the GitHub remote and final repo visibility.
4. Summarize what moved and what stayed private.
