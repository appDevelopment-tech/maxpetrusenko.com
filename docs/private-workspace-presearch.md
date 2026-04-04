# Private Workspace Presearch

## Audience
- Max now
- future operator team later

## Scope Boundary
- private operator workspace for `maxpetrusenko.com`
- not public site UI
- not concierge inbox replacement
- booking and payments path included
- marketplace / multi-tenant SaaS deferred

## Key Decision
- build the workspace on a dedicated Supabase project
- use Google sign-in through Supabase Auth
- keep CRM / people / teams in Supabase
- use Cal.com for booking layer when scheduling starts
- use Stripe Checkout and Billing for payments

## Decision Matrix

| Option | What it means | Speed now | Scale later | Risk |
| --- | --- | --- | --- | --- |
| A | Reuse `TellMe` Supabase project for this site workspace | medium | low | shared auth, shared blast radius, mixed product concerns |
| B | Dedicated Supabase project plus custom booking + custom payments from day one | low | high | too much custom ops too early |
| C | Dedicated Supabase project plus Cal.com for scheduling plus Stripe for payments | high | high | one extra vendor, but clean boundaries |

## Recommendation
- choose **Option C**

## Why C wins
- Supabase already fits the private workspace you started building
- Supabase’s current Next.js SSR guidance is cookie-based auth with `@supabase/ssr`, which matches the direction already scaffolded in the repo
- Google auth through Supabase keeps login simple now
- Cal.com gives booking infrastructure, calendars, teams, event types, routing forms, and Stripe integration without forcing you to build a scheduler from scratch
- Stripe Checkout is the fastest credible payment path for deposits, packages, and subscriptions

## Rejected Alternatives

### Option A: TellMe project reuse
- tempting because it is already there
- wrong boundary for a private operator system tied to your main site
- shared redirect URLs, auth config, users, and schema drift will become annoying fast
- later team access, booking data, and payment data should not inherit another product’s history

### Option B: fully custom scheduler first
- too much code before product certainty
- calendar availability, buffers, reschedules, reminders, payment coupling, and timezone behavior are all real product surfaces
- better to buy that complexity first, then replace only if needed

## Architecture

### Phase 1: Operator Core
- dedicated Supabase project
- Google sign-in via Supabase Auth
- RLS-backed `workspace_members`, `workspace_people`, `workspace_teams`
- workspace route only for allowlisted / member accounts
- concierge signals read-only side panel, not core dependency

### Phase 2: Booking Layer
- Cal.com handles event types, routing, availability, buffers, reminders
- Google Calendar connected as source of truth for your actual availability
- workspace stores booking metadata you care about, not raw calendar complexity

### Phase 3: Payment Layer
- Stripe Checkout for deposits, retainers, packages, and subscriptions
- Stripe Customer Portal for self-serve billing changes if needed
- webhook events sync payment state into Supabase

### Phase 4: Team + Management
- workspace roles: owner, ops, assistant, practitioner, finance
- team work queues
- booking triage
- payment reconciliation
- client notes and lifecycle tracking

## Living Tree

### trunk
- dedicated `maxpetrusenko.com` workspace project

### branch 1: identity
- Supabase Auth
- Google sign-in
- membership table
- RLS

### branch 2: relationships
- people
- teams
- notes
- status
- last touch

### branch 3: scheduling
- event types
- availability
- bookings
- reschedule / cancel

### branch 4: revenue
- deposits
- session payments
- subscriptions
- invoices

### branch 5: operations
- calendar sync
- reminders
- team roles
- reporting

## Data Model

### now
- `workspace_members`
- `workspace_people`
- `workspace_teams`

### next
- `workspace_bookings`
- `workspace_booking_events`
- `workspace_payment_records`
- `workspace_tasks`

### later
- `workspace_team_memberships`
- `workspace_notes`
- `workspace_activity_feed`

## Auth Matrix

| Surface | Auth owner | Why |
| --- | --- | --- |
| `/workspace` | Supabase Auth + RLS | private operator area |
| public site | no workspace auth | marketing surface |
| concierge inbox | keep separate for now | different operational concern |
| booking UI | Cal.com auth / embed rules | specialized scheduling flow |
| payments | Stripe | PCI + billing lifecycle |

## End-to-End Example

1. Max signs into `/workspace` with Google.
2. Supabase callback exchanges code for a cookie session.
3. RLS confirms Max exists in `workspace_members`.
4. Workspace loads people, teams, and recent signals.
5. Later, Max creates a new booking type in Cal.com for a somatic session.
6. Visitor books through Cal.com.
7. Payment happens through Stripe Checkout.
8. Webhook writes booking + payment summary into Supabase.
9. Workspace now shows person, booking status, and payment state in one place.

## Risks / Edge Cases

### auth drift
- app-level allowlist and DB membership can diverge
- fix: move to DB membership as primary authority

### cross-product coupling
- reusing `TellMe` would merge unrelated redirect URLs, auth users, and schemas
- fix: dedicated project

### overbuilding early
- custom scheduling from scratch adds complexity before demand is proven
- fix: Cal.com first

### payment sprawl
- invoices, deposits, subscriptions, and refunds can become separate code paths
- fix: default to Checkout + webhooks first

## Recommended Build Order

1. create dedicated Supabase project for `maxpetrusenko.com`
2. move membership authority fully into Supabase tables + RLS
3. finish read-only workspace shell already started in repo
4. add people / teams CRUD
5. add Cal.com booking surface
6. add Stripe Checkout + payment sync
7. add team roles and ops screens

## Source-Backed Notes
- Supabase’s server-side Next.js docs recommend cookie-based SSR clients with `@supabase/ssr`: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase’s Google auth docs require provider setup, redirect allowlisting, and a callback route for PKCE / server-side auth: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase redirect URLs are explicitly configured and `redirectTo` must match allowed URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase deprecated the old Next.js auth helpers in favor of `@supabase/ssr`: https://supabase.com/docs/guides/troubleshooting/how-to-migrate-from-supabase-auth-helpers-to-ssr-package-5NRunM
- Stripe Checkout is a low-code prebuilt payment page and can be hosted or embedded: https://docs.stripe.com/payments/checkout
- Stripe recommends the Checkout Sessions API for most payment integrations because it handles the lifecycle and reduces custom code: https://docs.stripe.com/payments/checkout-sessions
- Stripe subscriptions work cleanly through Checkout Sessions with `mode=subscription`: https://docs.stripe.com/subscriptions
- Stripe says OAuth is not recommended for new Connect platforms; Connect Onboarding is the newer path if marketplace payouts ever become relevant: https://docs.stripe.com/connect/oauth-standard-accounts
- Cal.com Platform exposes bookings, schedules, calendars, teams, organizations, OAuth2, webhooks, and Atoms: https://cal.com/docs/platform/introduction
- Cal.com self-hosted app docs show Google Calendar and Stripe as first-class integrations for scheduling and paid bookings: https://cal.com/docs/self-hosting/apps/install-apps/introduction
