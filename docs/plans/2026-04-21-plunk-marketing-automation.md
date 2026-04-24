# Plunk Marketing Automation Setup

Date: 2026-04-21

## Goal

Bring up a visible self-hosted Plunk marketing automation workspace for Max, with a first draft campaign ready for review.

## Live URLs

- Dashboard: `https://plunk.maxpetrusenko.com`
- API: `https://plunk-api.maxpetrusenko.com`
- Landing: `https://plunk-site.maxpetrusenko.com`
- Docs: `https://plunk-docs.maxpetrusenko.com`

## Current State

- Plunk is running on Contabo `vmi3203669`.
- Runtime path: `/opt/plunk`.
- Docker compose project: `plunk-marketing`.
- Public DNS is in Cloudflare and proxies the four Plunk hostnames to `173.249.52.27`.
- Admin account exists for `max.petrusenko@gmail.com`.
- Credentials and API keys are stored in Doppler project `api_keys`, config `dev`, under `PLUNK_*`.
- Public signups are disabled after bootstrap.

## Visible Marketing Plan In Action

Project:

- Name: `Max Petrusenko Marketing`
- ID: `7c83d7d9-3353-4c75-82fe-bc4e6d3a88f9`

Draft campaign:

- Name: `Founder Signal Welcome Sequence`
- ID: `91dcc643-063b-458d-a713-1227b0828256`
- Status: `DRAFT`
- Subject: `Welcome to Founder Signal`
- Audience: `ALL`
- From: `marketing@maxpetrusenko.com`
- Reply-to: `max.petrusenko@gmail.com`

This draft is intentionally not scheduled or sent. It exists so the Plunk dashboard has a concrete campaign to inspect.

## Known Constraint

Plunk currently requires AWS SES environment variables at startup. No real AWS SES keys were present in local env or Doppler. Placeholder SES values are set only to allow the dashboard, API, and campaign editor to boot. Sending must stay disabled until real SES credentials and domain verification are configured.

Before sending any campaign:

1. Create or locate AWS SES SMTP/API credentials for the sending identity.
2. Replace the placeholder `AWS_SES_ACCESS_KEY_ID` and `AWS_SES_SECRET_ACCESS_KEY` in `/opt/plunk/.env`.
3. Configure SES configuration sets: `plunk-tracking` and `plunk-no-tracking`.
4. Verify the sender domain inside Plunk and add its required DNS records.
5. Send one test email to Max before scheduling any campaign.

## Implementation Notes

The official Plunk boot migration failed from the container entrypoint, while the same image successfully ran migrations as a one-off command. The deployed compose stack uses `/opt/plunk/start-plunk-no-migrate.sh` to start services after migrations are applied manually.

Generic internal hosts `postgres` and `redis` collided with the shared Coolify Docker network. The compose stack uses unique hosts:

- `plunk-postgres`
- `plunk-redis`

## Verification

Verified on 2026-04-21:

- `plunk-app` container: running and healthy.
- Dashboard: HTTP 200.
- API: HTTP 302 from root to landing, authenticated endpoints work.
- Landing: HTTP 200.
- Docs: HTTP 200.
- Admin login: success.
- Signups disabled: `New user signups are currently disabled`.
- Campaign API returns the draft campaign.

