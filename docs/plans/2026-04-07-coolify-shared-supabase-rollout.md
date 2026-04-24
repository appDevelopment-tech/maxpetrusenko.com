# Coolify + Shared Self-Hosted Supabase Rollout

**Date:** 2026-04-07
**Status:** Live foundation
**Owner:** Max Petrusenko

## Goal

Run the subscription app backend on the Contabo VPS with:

- `Coolify` as deploy/orchestration layer
- `1` shared self-hosted `Supabase` stack
- app-specific `Node` workers/services for heavy jobs
- current edge/frontend surfaces kept where they already work

This is the lowest-glue setup that still keeps migration reasonable later.

## Current Live Outputs

- shared stack live at `https://supabase.maxpetrusenko.com`
- `Supavisor` pooler healthy and reachable on the shared `coolify` network as `supabase-pooler`
- origin HTTPS served by `Traefik` with a valid `Let's Encrypt` certificate
- nightly local backup job installed for DB + storage

Operational details:

- `docs/plans/2026-04-08-shared-supabase-ops-runbook.md`

## Decision

Use:

- `Coolify` for app deploys and app env management
- `Supabase` for shared `Postgres + Auth + Realtime + RLS + Storage`
- `Node` services for Stripe webhooks, report generation, cron, queues, AI jobs

Do not use:

- one Supabase per app
- Neon for the core shared backend
- edge functions as the long-term home for billing, report pipelines, or heavy jobs

## Why This Shape

### Best fit for the current box

Contabo is currently `4 vCPU / 8 GB RAM`. That is enough for:

- Coolify
- one shared Supabase stack
- a small number of app containers/workers

It is not the box for:

- many isolated Supabase stacks
- lots of duplicated auth/database infrastructure

### Best fit for product speed

Supabase removes the custom plumbing for:

- auth
- session/JWT handling
- browser-facing DB access
- RLS
- realtime

That is a better trade than assembling `Postgres + auth provider + custom API + realtime`.

### Best fit for migration later

Later migration becomes:

1. recreate Coolify on the new VPS
2. restore/redeploy app containers
3. dump/restore Supabase Postgres
4. move storage volume
5. repoint DNS

That is still work, but it is simpler than migrating a hand-assembled auth/data stack.

## Target Architecture

```text
Cloudflare / Netlify frontends
        |
        v
  app.maxpetrusenko.com
        |
        +--> Shared Supabase on Contabo
        |      - Postgres
        |      - Auth
        |      - Realtime
        |      - Storage
        |
        +--> Node workers/apps on Coolify
               - Stripe webhooks
               - report generation
               - AI jobs
               - cron / scheduled work
```

## App Buckets

### Put on shared Supabase

Apps with one or more of:

- end-user auth
- organizations/accounts
- subscriptions or entitlements
- browser-facing product data
- realtime UI updates
- RLS needs

Current expected fit:

- `geoanalyzer.com`
- future subscription apps

### Keep edge-only or thin-edge

Apps/pages with:

- static content
- light forms
- lightweight routing/redirect logic
- no meaningful product backend

### Put in Node workers on Coolify

Anything with:

- report pipelines
- Stripe webhooks
- AI orchestration
- PDF/export generation
- retries / idempotency
- scheduled jobs

## Shared Supabase Layout

Use one shared Supabase stack.

Inside it:

- one shared auth system
- separate schemas per app where useful
- separate Postgres roles for app isolation
- separate buckets for app uploads

Prefer separate databases only if one app truly needs stronger isolation.

## Domains

Keep the public app domains as they are unless a move is already needed.

Suggested shared backend domains:

- `supabase.maxpetrusenko.com` for the public API gateway
- `studio.supabase.maxpetrusenko.com` only if you want Studio exposed behind Cloudflare Access

Safer default:

- expose only the API domain publicly
- keep admin surfaces behind Cloudflare Access or internal-only

## Storage Choice Now

### Recommended now

Start with local Supabase storage on the VPS.

Reason:

- lowest spend
- no extra vendor
- fewer moving parts while you are still standardizing app patterns

### What this costs you later

DB migration stays easy.
File migration is the annoying part.

So local storage is fine now, but only if you accept:

- storage volume backups matter
- future migration needs a volume copy or object sync step

### Upgrade seam later

Supabase can move to S3-compatible storage later. That means:

- start local now
- switch to `R2` or another S3 backend only when file volume or migration pain justifies it

## Backup Policy

Minimum acceptable:

- nightly Postgres dump off the VPS
- nightly copy/snapshot of the Supabase storage volume
- documented restore test at least once

Cheapest good version:

- keep app runtime on Contabo
- use cheap object storage only for backups when ready

Do not confuse:

- "everything on one VPS"

with:

- "safe recovery plan"

Without off-box backups, you have hosting, not disaster recovery.

## Rollout Order

### Phase 1

Provision one shared Supabase stack in Coolify or alongside Coolify on the same VPS.

Required outputs:

- stable domains
- env file stored outside the box too
- persistent volumes identified

### Phase 2

Set baseline auth/data conventions:

- user table strategy
- account/org model
- entitlement/subscription tables
- schema naming convention
- bucket naming convention

### Phase 3

Move one real app first: `geoanalyzer.com`

Move:

- auth
- product data
- subscriptions state
- report metadata

Do not move heavy report execution to edge. Put it in a Node service.

### Phase 4

Standardize a repeatable app template:

- frontend
- shared Supabase
- worker/API service

Then reuse that for future subscription apps.

## Migration Later to Another VPS

If you outgrow Contabo or want to move:

1. bring up Coolify on the new server
2. deploy or restore the shared Supabase stack
3. restore Postgres from dump
4. copy storage volume data
5. reconnect app env vars
6. cut DNS
7. validate auth callbacks and webhooks

Main friction points:

- storage copy time
- auth redirect URLs
- webhook endpoints
- minimizing cutover downtime

## Concrete Recommendation

For now, ship this:

- `Coolify` on Contabo
- `1` shared self-hosted `Supabase`
- local Supabase storage
- app workers in `Node`
- edge only for thin logic and frontend delivery

Then add:

- off-box backups first
- S3/R2 later only when file growth or migration needs justify it

## Notes from Current Official Docs

- Supabase self-hosting is Docker-based and supports local filesystem storage or an S3-compatible backend later.
- Coolify treats services and app containers separately, so moving hosts later means recreating the control plane and restoring stateful workloads.
- Supabase restore/migration remains mostly standard Postgres plus storage movement, which is why it is more portable than a custom auth/API stack.

Sources:

- https://coolify.io/docs/services/supabase
- https://coolify.io/docs/services/introduction
- https://coolify.io/docs/knowledge-base/how-to/backup-restore-coolify
- https://coolify.io/docs/knowledge-base/how-to/migrate-apps-different-host
- https://supabase.com/docs/guides/self-hosting
- https://supabase.com/docs/guides/hosting/docker
- https://supabase.com/docs/guides/self-hosting/self-hosted-s3
- https://supabase.com/docs/guides/self-hosting/restore-from-platform
