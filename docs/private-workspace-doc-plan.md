# Doc Plan

## Source Input
- spec / prompt:
  - private dashboard for Max first
  - later: team, management, calendar, booking, payments
  - move it out of concierge/chatbot context
  - research, verify, and present visually with HTML artifacts
- codebase area:
  - `nextjs/app/workspace/*`
  - `nextjs/app/auth/callback/route.ts`
  - `nextjs/lib/supabase/*`
  - `nextjs/lib/workspace/*`
  - `nextjs/supabase/workspace-schema.sql`
- constraints:
  - solo operator first
  - clear future path to team roles and booking ops
  - use official vendor docs for auth / booking / payments
  - favor simple first shipping path over premature platform build

## Planned Docs

### 1. Private Workspace Presearch
- purpose:
  - decide the right architecture and rollout order
- requirements covered:
  - auth boundary
  - data model
  - calendar / booking / payments strategy
  - team-ready evolution path
- why separate doc:
  - this is the decision artifact
- output path:
  - `docs/private-workspace-presearch.md`
- needs workflow/UI companion: yes
- key codebase anchors:
  - `nextjs/app/workspace/page.tsx`
  - `nextjs/app/workspace/sign-in/page.tsx`
  - `nextjs/lib/workspace/data.ts`
  - `nextjs/supabase/workspace-schema.sql`

### 2. Private Workspace System Visual
- purpose:
  - make the recommended system understandable in one pass
- requirements covered:
  - auth flow
  - state ownership
  - solo-first to team-ready growth
- why separate doc:
  - architecture should scan faster than prose
- output path:
  - `docs/private-workspace-system.html`
- needs workflow/UI companion: no
- key codebase anchors:
  - `nextjs/lib/supabase/*`
  - `nextjs/app/auth/callback/route.ts`

### 3. Private Workspace UI Visual
- purpose:
  - show the end-state operator dashboard and its future modules
- requirements covered:
  - people
  - teams
  - calendar
  - bookings
  - payments
- why separate doc:
  - UI behavior is easier to judge visually
- output path:
  - `docs/private-workspace-ui.html`
- needs workflow/UI companion: no
- key codebase anchors:
  - `nextjs/app/workspace/*`
  - `nextjs/components/workspace/*`

## Review Plan
- Codex review schema:
  - self-review against official-source grounding, recommendation clarity, and visual explainability
- review pass count max:
  - 1
- approval threshold:
  - clear recommendation
  - realistic phase plan
  - visual artifacts load locally

## Stop Rule
- ship after:
  - recommendation is source-backed
  - both HTML files load cleanly
- escalate when:
  - vendor choice remains ambiguous
  - official docs contradict the proposed path
