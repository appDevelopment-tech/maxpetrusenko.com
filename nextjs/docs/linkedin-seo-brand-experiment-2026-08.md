# LinkedIn SEO/GEO Brand Experiment — AI Agent Infrastructure Consultant

Status: source changes prepared on branch `feat/linkedin-seo-brand-experiment`; do not publish social copy without Max's final approval/readback.

## Campaign hypothesis

Putting the exact phrase `AI agent infrastructure consultant` at the start of a native LinkedIn post may help LinkedIn expose the phrase in the post title/URL/meta text, giving the phrase a stronger discovery surface than a small personal site page alone. The site must mirror the same phrase on the canonical landing page so traffic and AI/Search citations have a clean destination.

## Canonical landing page

Primary: `https://www.maxpetrusenko.com/tech`

Tracked campaign URL:

```text
https://www.maxpetrusenko.com/tech?utm_source=linkedin&utm_medium=social&utm_campaign=ai_agent_infrastructure_consultant&utm_content=linkedin_native_post_v1
```

Booking CTA URL used on `/tech`:

```text
https://tidycal.com/agentpersona/ai-consulting?utm_source=linkedin&utm_medium=social&utm_campaign=ai_agent_infrastructure_consultant&utm_content=tech_hero_cta
```

Proof CTA URL used on `/tech`:

```text
https://www.maxpetrusenko.com/proof?utm_source=linkedin&utm_medium=social&utm_campaign=ai_agent_infrastructure_consultant&utm_content=tech_hero_proof
```

## LinkedIn native post draft

```text
AI agent infrastructure consultant is the job title I keep backing into.

Not “prompt engineer.” Not “AI automation guy.”

The work is the operating layer around agents:

- Claude Code setup that can actually survive a real repo
- sub-agent roles with boundaries instead of vague autonomy
- n8n / API workflows that move work between tools
- evaluation loops so agent output is measured, not vibes
- handoff points where humans approve the parts that matter

The companies getting value from AI agents are not just buying a model.
They are building infrastructure around the model.

That layer decides whether agents become leverage or another brittle SaaS pile.

I’m putting together a few hands-on builds around this now.
If your team is trying to make agents useful in production, start here:
https://www.maxpetrusenko.com/tech?utm_source=linkedin&utm_medium=social&utm_campaign=ai_agent_infrastructure_consultant&utm_content=linkedin_native_post_v1
```

## LinkedIn comment / follow-up prompt

Use as first comment only after posting:

```text
The useful question is not “which agent should we use?”

It is: where does the agent sit in the workflow, what can it touch, how do we evaluate it, and where does a human approve the irreversible parts?

That is the infrastructure layer.
```

## X / short SMM variants

Variant A:

```text
“AI agent infrastructure consultant” is a better job title than “prompt engineer.”

The work is Claude Code setup, sub-agent roles, n8n/API workflows, eval loops, and human approval points.

Agents need infrastructure or they become another brittle SaaS mess.
https://www.maxpetrusenko.com/tech?utm_source=x&utm_medium=social&utm_campaign=ai_agent_infrastructure_consultant&utm_content=x_short_v1
```

Variant B:

```text
The hard part of AI agents is not the model.

It is the operating layer around it:
permissions, evals, workflows, handoffs, observability, and rollback.

That is what I mean by AI agent infrastructure.
https://www.maxpetrusenko.com/tech?utm_source=x&utm_medium=social&utm_campaign=ai_agent_infrastructure_consultant&utm_content=x_short_v2
```

## Cryptobase / newsletter blurb

Use only if the audience fit is technical/founder-heavy; skip for purely crypto-market updates.

```text
I’m testing a new positioning phrase: AI agent infrastructure consultant.

The point is simple: teams do not get durable leverage from AI agents by “adding a bot.” They get it by building the operating layer around agents — permissions, workflow design, evals, integrations, and human approval points.

That is where my Claude Code / n8n / automation work is converging.

Reference page: https://www.maxpetrusenko.com/tech?utm_source=cryptobase&utm_medium=newsletter&utm_campaign=ai_agent_infrastructure_consultant&utm_content=newsletter_blurb_v1
```

## Website/surface update matrix

| Surface | Action | Status |
|---|---|---|
| maxpetrusenko.com `/tech` | Add exact phrase to title, description, hero, direct answer, visible FAQ, schema, and tracked CTAs | Prepared in source branch |
| maxpetrusenko.com `/llms.txt` | Add tech focus and canonical tech page | Prepared in source branch |
| maxpetrusenko.com `/proof` | Used as tracked internal proof CTA; no copy change in this branch | Deferred |
| LinkedIn | Native post draft with phrase first | Drafted; not posted |
| Instagram | Existing Reel informs tactic; no repost without approval | Drafted only |
| Cryptobase | Optional founder/technical newsletter blurb | Drafted only |
| Mindfold / spirituality pages | No tech-positioning injection | Intentionally unchanged to preserve brand separation |

## Analytics to measure

### GA4 events added by `EngagementTracker`

- `cta_click`
  - `event_label`: `tech_hero_booking_ai_agent_infrastructure`, `tech_hero_proof_ai_agent_infrastructure`, `tech_services_mailto_ai_agent_infrastructure`, etc.
  - `destination_url`
  - `page_path`
- `outbound_click`
  - captures TidyCal and other external clicks
- `engagement_heartbeat`
  - `engagement_time_seconds`: `10`, `30`, `60`

### UTM dimensions

- `utm_source`: `linkedin`, `x`, `cryptobase`
- `utm_medium`: `social`, `newsletter`
- `utm_campaign`: `ai_agent_infrastructure_consultant`
- `utm_content`: variant label (`linkedin_native_post_v1`, `x_short_v1`, etc.)

### Weekly scorecard

Check 24h, 72h, and 7d after LinkedIn publish:

1. LinkedIn analytics: impressions, reactions, comments, reposts, profile views, new followers.
2. GA4 / Cloudflare: `/tech` sessions where `utm_campaign=ai_agent_infrastructure_consultant`.
3. GA4 events: `cta_click` and `outbound_click` from `/tech`.
4. TidyCal: paid AI consulting session visits/bookings.
5. Google Search Console: query impressions for `AI agent infrastructure consultant`, `Max Petrusenko AI agent infrastructure`, `Claude Code consultant`, `AI automation consultant`.
6. Manual SERP/AI answer check: exact phrase + Max name, phrase without Max name.

## Do not do

- Do not merge/deploy this public repo branch over production until live source drift is resolved. The live site currently has a `/pricing` route that this public repo clone does not contain.
- Do not post LinkedIn or X copy without Max's final approval/readback.
- Do not add this tech positioning to Mindfold/spirituality pages.
