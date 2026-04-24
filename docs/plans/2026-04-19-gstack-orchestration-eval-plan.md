# Gstack vs Custom Agent Orchestration Eval Plan

**Date:** 2026-04-19
**Status:** Pinned gstack installed; output benchmark pending
**Owner:** Max Petrusenko

## Decision

Do not build a full custom agent orchestration framework yet. Also do not adopt gstack wholesale yet.

Use this order:

1. Keep Max's current Claude + Codex + AGENTS setup as the baseline.
2. Keep gstack pinned before treating it as supported.
3. Run a small output benchmark against gstack and the custom policy.
4. Promote gstack only for the workflows where it wins on output quality, review friction, and repeatability.

Current recommendation: **custom baseline, pinned gstack pilot installed on all agent hosts**.

Why: gstack is now installed and pinned, but the output benchmark is not complete yet. Treat it as a maintained skill pack until it proves better than the current Claude + Codex policy on real tasks.

## Install Status

Pinned upstream:

```text
repo: https://github.com/garrytan/gstack
commit: 22a4451e0edb13fd67c1900537f8b106d025f2a3
commit subject: feat(v1.3.0.0): open agents learnings + cross-model benchmark skill (#1040)
```

Installed with:

```bash
./setup --host claude --prefix --quiet
./setup --host codex --quiet
```

Verified hosts:

| Host | User | Checkout | Claude skills | Codex skills | Browser binary | Live smoke |
| --- | --- | --- | --- | --- | --- | --- |
| `macbook-pro` | `maxpetrusenko` | `/Users/maxpetrusenko/Desktop/Projects/oss/gstack` | ok | ok | ok | Claude/Codex smoke previously passed locally |
| `Maxss-Mac-mini` / `maxiclaw` | `maxsmacmini` | `/Users/maxsmacmini/Desktop/Projects/oss/gstack` | ok | ok | ok | Claude ok, Codex ok |
| `uniclaw` | `uniclaw` | `/Users/uniclaw/Desktop/Projects/oss/gstack` | ok | ok | ok | Claude ok direct + router, Codex ok, gstack registry ok |

Representative installed skill checks passed on every host:

```text
~/.claude/skills/gstack-review/SKILL.md
~/.claude/skills/gstack-autoplan/SKILL.md
~/.codex/skills/gstack-review/SKILL.md
~/.codex/skills/gstack-autoplan/SKILL.md
<gstack>/browse/dist/browse
```

`uniclaw` repair notes:

- Claude loaded gstack skills correctly, but live prompts hit repeated `401 authentication_failed` retries.
- Root cause 1: stale Claude OAuth credentials in `~/.claude/.credentials.json`.
- Root cause 2: plugin marketplace metadata pointed at `/Users/maxsmacmini/.claude/plugins/...` instead of `/Users/uniclaw/.claude/plugins/...`.
- Fix: backed up credentials to `~/.claude/.credentials.json.bak-20260419-123728`, copied known-working Claude OAuth credentials from `maxiclaw`, and re-added `claude-plugins-official` through `claude plugin marketplace`.
- Final state: auth status is valid, plugin path is local to `uniclaw`, router health endpoint returns ok, Claude direct and router-backed live prompts pass after rate-limit reset, Codex live smoke passes, and verbose Claude init lists `gstack-review` in both slash commands and skills.

## Pre-Install Local Evidence

### What exists locally

Claude wrappers exist in `~/.claude/commands/`:

- `/autoplan` delegates to `/gstack-autoplan`
- `/plan-eng-review` delegates to `/gstack-plan-eng-review`
- `/plan-design-review` delegates to `/gstack-plan-design-review`
- `/plan-ceo-review` delegates to `/gstack-plan-ceo-review`
- `/investigate` delegates to `/gstack-investigate`
- `/office-hours` delegates to `/gstack-office-hours`
- `/review` delegates to `/gstack-review`
- `/qa` delegates to `/gstack-qa`
- `/ship` delegates to `/gstack-ship`

Codex prompt wrappers also exist in `~/.codex/prompts/` for the same workflow names.

### What did not exist locally before the pinned install

At that point, the local machine did not expose a working gstack executable:

```bash
command -v gstack
command -v gstack-review
command -v gstack-autoplan
command -v gstack-qa
```

These returned no PATH command before the pinned checkout was installed.

The subagent inspection also did not find a checked-in local gstack implementation under the inspected Claude, Codex, plugin, or skills folders. At that point, the local setup was wrapper text, not the actual maintained gstack workflow implementation.

### Existing local policy

`/Users/maxpetrusenko/Desktop/Projects/manager/docs/clawfleet.md` already says not to adopt a second agent framework wholesale yet. It recommends cherry-picking patterns, keeping `agent-scripts` canonical, and piloting gstack only when pinned to a commit.

That policy still matches the evidence.

## Upstream Evidence

The public gstack project is real and active enough to test:

- upstream site describes gstack as an open-source workflow for Claude Code, Codex, and compatible agents
- workflow covers product framing, plan review, code review, browser QA, release, and retro
- GitHub repository is public at `garrytan/gstack`
- public repo page showed many workflow folders and active project structure

This makes gstack worth piloting. It does not make it safe to become the local baseline before the benchmark run.

## Output Tests Run

### Test A: Claude with local `/autoplan` style prompt

Command shape:

```bash
claude -p --model haiku --output-format text --max-budget-usd 1.00 \
  "Do not edit files. Use /autoplan for this tiny benchmark if slash commands are available: Compare using maintained gstack workflows versus a custom Claude+Codex orchestration policy. Return only the resulting plan summary in 8 bullets."
```

Result:

- Claude produced an 8-bullet answer favoring gstack as the baseline.
- It claimed the planning workflow had been invoked.
- It did not prove that `/gstack-autoplan` actually ran.
- The output was plausible but generic.

Interpretation:

This is not enough to adopt gstack. It shows the wrapper language biases the model toward "use maintained gstack", but it does not prove the installed workflow is callable or better.

### Test B: Direct `/gstack-autoplan` availability probe

Command shape:

```bash
claude -p --model haiku --output-format text --max-budget-usd 1.00 \
  "Do not edit files. Run /gstack-autoplan if available ..."
```

Result:

- Claude reported that it did not have `SlashCommand()` available as a tool.
- It could not confirm `/gstack-autoplan` was installed as a callable command from this noninteractive harness.

Interpretation:

The pre-install noninteractive path could not prove real gstack execution. After install, file-level checks prove the skills are present; the output benchmark still needs to prove quality.

### Test C: Codex custom-policy comparison

Command shape:

```bash
codex exec --sandbox read-only --ephemeral -m gpt-5.4-mini \
  "Do not edit files. Tiny benchmark: Compare using maintained gstack workflows versus a custom Claude+Codex orchestration policy for Max's coding agents. Return exactly 8 concise bullets with recommendation, risks, and how to test output quality."
```

Result:

- Codex searched local context.
- It found the existing `clawfleet.md` decision.
- It recommended custom baseline plus pinned gstack pilot.
- It named concrete risks: duplicate slash commands, conflicting roles, memory-rule drift, upstream breakage, custom policy sprawl, and missing benchmark evidence.

Interpretation:

This output was more grounded because it used local policy context instead of only wrapper prompt intent.

## Output-Test Method From `agent-personas-project`

The useful pattern in `/Users/maxpetrusenko/Desktop/Projects/oss/agent-personas-project` is not "ask which answer feels better." It is proof by replayable artifacts.

Relevant local pattern:

- benchmark runner prints timing and record totals
- benchmark docs list exact commands, outputs, counts, and caveats
- outputs land in stable run folders
- contracts define valid output shapes
- test suite verifies contract behavior

Adapted for this comparison:

```text
benchmarks/runs/gstack/<date>/<scenario>/
  prompt.md
  stdout.txt
  stderr.txt
  artifacts/
  score.json
  manifest.json

benchmarks/runs/custom/<date>/<scenario>/
  prompt.md
  stdout.txt
  stderr.txt
  artifacts/
  score.json
  manifest.json
```

Score every run with the same rubric:

- artifact completeness
- groundedness and path references
- correct routing or dispatch choice
- verification depth
- merge and handoff safety
- scope control
- manual intervention count
- runtime and token cost

## Benchmark Scenarios

Use 5 fixed prompts. Each must run through both gstack and custom policy.

### Scenario 1: Plan Artifact Generation

Prompt:

```text
Take this feature brief and produce STATUS.yaml, TASKS.md, and HANDOFF.md with clear next steps and blockers.
```

Expected output:

- stable artifact paths
- explicit blockers
- no invented repo state
- owner and next action

### Scenario 2: Root Cause + Repair

Prompt:

```text
Inspect this failing run log, isolate the root cause, and propose the minimal fix plus regression test.
```

Expected output:

- exact failing check
- concrete file references
- bounded repair packet
- test target

### Scenario 3: Evidence-Backed Research

Prompt:

```text
Convert this research note into KNOWLEDGE.md and DECISIONS.md with only evidence-backed claims.
```

Expected output:

- sourced claims
- explicit unknowns
- decision table
- no unsupported hard numbers

### Scenario 4: Resume From Interrupted State

Prompt:

```text
Resume from this interrupted task state, preserve completed work, and finish without redoing completed steps.
```

Expected output:

- reads prior state
- does not restart from scratch
- identifies terminal, runnable, and blocked items
- emits a checkpoint

### Scenario 5: Competing Plan Choice

Prompt:

```text
Compare two implementation plans and explain which is safer, faster, and easier to hand off.
```

Expected output:

- clear decision
- tradeoff table
- acceptance criteria
- review gate

## What Would Make Gstack Better

Gstack should become the default for a workflow if it beats custom policy on at least three of these:

- produces clearer artifacts with less prompt work
- catches more review issues
- requires fewer Max clarifications
- runs browser QA better than local wrappers
- reduces manual orchestration steps
- produces better release and retro output
- stays stable across two hosts

Best candidate gstack wins:

- `/review`
- `/qa`
- `/ship`
- `/plan-eng-review`
- `/plan-design-review`

These are structured workflows where maintained prompts may beat custom local prose.

## What Would Make Custom Better

Custom Claude + Codex policy remains better when:

- local AGENTS rules matter more than generic workflow roles
- Max-specific repo paths, secrets, or deployment rules are involved
- work crosses OpenClaw, Claude, Codex, and agent-scripts
- workflow state must persist into Max's existing docs/runbooks
- gstack commands conflict with local slash commands or memory rules
- output needs the exact blocker packet / queue / checkpoint semantics from Max's existing systems

## Practical Recommendation

Use gstack as a maintained skill pack, not as the root operating system.

Recommended policy:

```md
Default to Max's AGENTS/CLAUDE/Codex workflow. Use pinned gstack commands for plan review, code review, browser QA, ship, and retro only after the local gstack install is verified and benchmarked. Do not replace local task state, memory rules, file ownership, or Codex final review gates with upstream gstack defaults.
```

## Next Implementation Steps

### 1. Add a benchmark harness

Create a small harness, probably under:

```text
docs/agent-orchestration-evals/
```

or:

```text
/Users/maxpetrusenko/Desktop/Projects/agent-scripts/evals/gstack-vs-custom/
```

Prefer `agent-scripts` if this should be reused across repos.

### 2. Run both tracks

Track A:

- gstack prompt or slash command
- raw output captured
- artifacts copied into run folder

Track B:

- custom Claude + Codex orchestration prompt
- raw output captured
- artifacts copied into run folder

### 3. Score objectively

Use `score.json`:

```json
{
  "artifact_completeness": 0,
  "groundedness": 0,
  "routing_quality": 0,
  "verification_depth": 0,
  "scope_control": 0,
  "handoff_quality": 0,
  "manual_intervention_count": 0,
  "runtime_seconds": 0,
  "token_cost_estimate": 0,
  "verdict": "custom|gstack|tie"
}
```

### 4. Promote only proven wins

Promotion rules:

- If gstack wins planning and review, map `/plan-*` and `/review` to gstack.
- If custom wins stateful repair/resume, keep custom queue and checkpoint rules.
- If tied, prefer maintained gstack for generic workflows and custom policy for Max-specific repo operations.

## Final Recommendation

Better than building a new custom framework: **yes, use gstack where it works**.

Better than Max's current local orchestration as the default today: **not yet**.

The current local setup is now a real pinned gstack install. The right move is to run a small output benchmark, then promote specific winning workflows. Until then, keep Claude as PM, Codex as final reviewer, and Max's AGENTS/local docs as controller truth.

## Sources

- [gstack official site](https://gstack.lol/)
- [garrytan/gstack GitHub repo](https://github.com/garrytan/gstack)
- [Claude Code: Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code: Agent teams](https://code.claude.com/docs/en/agent-teams)
- [OpenAI Codex Claude Code plugin](https://github.com/openai/codex-plugin-cc)
- `/Users/maxpetrusenko/Desktop/Projects/manager/docs/clawfleet.md`
- `/Users/maxpetrusenko/Desktop/Projects/oss/agent-personas-project/feature_crawler/benchmarks/BENCHMARK_2026-04-09.md`
