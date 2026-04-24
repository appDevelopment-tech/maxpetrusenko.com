# Contabo Coolify Deploy Optimization Plan

**Date:** 2026-04-20
**Status:** Draft, implementation in progress
**Host:** `vmi3203669` / `173.249.52.27`

## Goal

Keep normal app usage responsive while Coolify deploys run on the same 4 vCPU / 8 GiB VPS.

The immediate problem is deploy/build pressure, not current user traffic. During the sampled `social-poster` deployment, the box hit load around `8.98` on 4 vCPU while a no-cache Docker build ran `next build` workers. After the deployment completed, load dropped and the live app health endpoints remained healthy.

## Current Evidence

- Active deploy culprit: `social-poster`, Coolify application/container prefix `ch6cjsgcqn6afd5052etgvwn`.
- Build helper: `g10bo2402s71kj4chaprrihl`.
- Heavy process: `next build` inside Docker buildx.
- Deploy command included `docker build --no-cache`.
- Final post-build health checks passed:
  - `https://social.maxpetrusenko.com/api/health`
  - `https://clawposter.app/api/health`
- Disk/inodes are fine.
- Memory is acceptable after build, but swap remains high, so memory pressure has happened before.

## Decision

Optimize deploy behavior before upgrading the VPS.

Do not introduce horizontal scaling or Kubernetes now. If this remains painful after deploy tuning, the next move is vertical scaling to more vCPU/RAM or moving builds off-box.

## Implementation Checklist

1. Identify how Coolify is forcing no-cache builds for `social-poster`.
2. Disable no-cache builds for routine deploys when safe.
3. Limit Next build concurrency for `social-poster` if the app/build supports it.
4. Add or update runbook notes for:
   - checking active build pressure
   - detecting stale deploys
   - when to cancel a deploy
   - when to upgrade or split DB/build workloads
5. Verify:
   - no active build after change
   - app health endpoints still pass
   - Coolify app config reflects intended deploy mode

## Guardrails

- Do not kill an active deployment unless it is stale or explicitly approved.
- Do not change app runtime env unless deploy docs/config confirm it is safe.
- Prefer Coolify-supported app settings over direct DB edits.
- If direct DB edit is necessary, capture before/after and only change the targeted app row.

