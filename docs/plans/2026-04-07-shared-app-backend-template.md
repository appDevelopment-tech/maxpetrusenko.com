# Shared App Backend Template

**Date:** 2026-04-07
**Status:** Active template

Use this for each subscription app.

## Template

### Frontend

- Cloudflare / Netlify / existing frontend host
- thin edge code only

### Shared backend

- shared `Supabase` project on Contabo
- app schema
- app buckets
- app-specific Postgres role

### Worker/API service

- one `Node` service in Coolify per app if needed
- handles webhooks, jobs, report generation, AI work

## Rules

- browser-facing reads/writes go through Supabase + RLS
- heavy or secret-heavy work goes to Node service
- Stripe webhooks do not live in edge functions long-term
- auth stays in Supabase for apps using shared auth

## First App Mapping

### `geoanalyzer.com`

Supabase:

- users
- orgs/accounts
- reports
- entitlements
- usage/subscription state

Node worker:

- report execution
- Stripe webhooks
- retries
- scheduled jobs

Edge/frontend:

- lightweight request shaping only
- no core subscription state logic
