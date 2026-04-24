# Claude + Codex Agent Orchestration Plan

**Date:** 2026-04-19
**Status:** Draft for Max review
**Owner:** Max Petrusenko

## Decision

Use Claude as the primary orchestrator and project manager. Use Claude subagents and agent teams for parallel exploration, implementation, and verification. Use Codex as the mandatory independent review gate before handing work back to Max.

Codex should not be the default project manager inside Claude Code. Claude Code has native team leadership, task list, mailbox, teammate, and subagent primitives. Codex is most valuable as the outside reviewer, adversarial reviewer, or rescue agent when Claude is stuck.

## Current Local State

Agent teams are already enabled globally in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

The OpenAI Codex Claude Code plugin is already enabled globally:

```json
{
  "enabledPlugins": {
    "codex@openai-codex": true
  }
}
```

The installed plugin provides `/codex:review`, `/codex:adversarial-review`, `/codex:rescue`, `/codex:status`, `/codex:result`, and `/codex:cancel`.

Project-level Claude agents currently available in `.claude/agents/` include:

- `codebase-locator`
- `codebase-analyzer`
- `codebase-pattern-finder`
- `thoughts-locator`
- `thoughts-analyzer`
- `web-search-researcher`
- `qa-tester`
- `code-developer`
- `api-architect`
- `debug-assistant`
- `websocket-developer`
- `notification-engineer`
- `performance-analyst`
- `meta-agent`

## Source Findings

Claude Code docs distinguish subagents from agent teams. Subagents are isolated workers inside one session. They return summarized results to the caller. Agent teams are multiple independent Claude Code sessions with shared tasks and direct teammate communication. Use subagents for quick focused work; use agent teams when workers need to coordinate, challenge each other, or own independent pieces of a bigger change.

Claude Code docs also state that subagents can preserve context, enforce tool constraints, reuse project or user definitions, specialize behavior, and control cost by routing simpler tasks to cheaper models such as Haiku.

Agent teams are experimental, off by default, and require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. They use a team lead, teammates, a shared task list, and a mailbox. Teams are stored under `~/.claude/teams/{team-name}/config.json`; tasks are stored under `~/.claude/tasks/{team-name}/`. Docs warn that agent teams add coordination overhead and significantly higher token use.

Claude Code cost docs recommend keeping teams small, using Sonnet for teammates, keeping spawn prompts focused, and cleaning up teams when done. They also say Sonnet handles most coding tasks, Opus should be reserved for complex architecture or multi-step reasoning, and Haiku fits simple subagent tasks.

The Codex Claude Code plugin docs say `/codex:review` runs a normal read-only Codex review on current uncommitted work or a branch diff, equivalent to running `/review` inside Codex. The same plugin provides `/codex:adversarial-review` for steerable challenge reviews and an optional stop-time review gate. The review gate uses a Stop hook to run a targeted Codex review and blocks Claude if issues are found, but the docs warn that it can create long-running loops and drain usage quickly.

Local inspection of `/Users/maxpetrusenko/Desktop/Projects/claudeCodeSrc.zip` matches the public docs: agent teams use a team lead, teammates, team config, task storage, mailbox messaging, `SendMessage`, task lifecycle tools, and optional plan approval for teammates. Claude native subagent model selection is Claude-side (`haiku`, `sonnet`, `opus`, or inherited/configured model aliases). GPT-5.4 should be invoked through Codex tooling, not treated as a native Claude subagent model.

## Recommended Roles

### Claude PM

Default owner of the session.

Responsibilities:

- read the task
- decide if this is single-session, subagent, or agent-team work
- create the plan
- assign file ownership
- synthesize worker results
- enforce tests and docs
- run Codex review before handoff
- hand back only after issues are fixed or clearly reported

Preferred model:

- Opus for architecture, ambiguous product decisions, multi-step debugging, or final synthesis
- Sonnet for normal implementation coordination

### Scout Agents

Fast read-only agents for bounded discovery.

Use for:

- locate relevant files
- map patterns
- inspect docs
- search errors
- summarize current behavior

Candidate agents:

- `codebase-locator`
- `codebase-pattern-finder`
- `thoughts-locator`
- Claude built-in `Explore`

Preferred model:

- Haiku for narrow search or file location
- Sonnet when the search requires judgment
- GPT-5 nano-class only if invoked from a Codex-side workflow and only for cheap bounded discovery

Tools:

- read/search/list only
- no writes

### Analysis Agents

Read-only agents for design and risk analysis.

Use for:

- compare implementation options
- identify risk areas
- propose tests
- inspect API contracts
- validate migration plans

Candidate agents:

- `codebase-analyzer`
- `thoughts-analyzer`
- Claude built-in `Plan`
- `api-architect` when API or service design is involved

Preferred model:

- Sonnet by default
- Opus for high-risk architecture
- GPT-5.4 via `/codex:rescue` only when Claude needs outside reasoning

### Builder Agents

Write-capable agents for scoped implementation.

Use for:

- implement one module or layer
- add tests
- update docs related to the change
- fix review findings

Candidate agents:

- `code-developer`
- `general-purpose`
- `api-architect`
- `websocket-developer`
- `notification-engineer`
- `performance-analyst`

Preferred model:

- Sonnet for most implementation
- Opus for complex refactors or deep debugging

Rules:

- one writer per file set
- no overlapping write ownership
- no repo-wide rewrite
- add regression tests where the bug shape supports it
- update docs when behavior or API changes

### Verification Agents

Independent checkers before Codex review.

Use for:

- run tests
- inspect failure modes
- verify the actual acceptance criteria
- check that docs and env examples match the change

Candidate agents:

- Claude built-in `verification` if available
- `qa-tester`, but tighten prompt to avoid broad edits unless asked

Preferred model:

- Sonnet
- Haiku only for simple smoke checks

### Codex Reviewer

Mandatory independent final gate.

Use for:

- review diff
- find bugs, regressions, missing tests, security issues, and incomplete implementation
- challenge assumptions before handoff

Commands:

```text
/codex:review --wait
```

Use branch review when applicable:

```text
/codex:review --base main --wait
```

Use adversarial review for risky changes:

```text
/codex:adversarial-review --wait focus on race conditions, auth bypass, migration risk, and missing rollback paths
```

Preferred model:

- Codex default from `~/.codex/config.toml` or project `.codex/config.toml`
- GPT-5.4 or GPT-5.4-mini for hard review/rescue work when available
- Spark/mini only for quick diagnosis, not final quality gate

## Operating Modes

### Single Session

Use when:

- change is small
- only one or two files
- no ambiguous architecture
- tests are obvious

Flow:

1. Claude reads relevant files.
2. Claude edits directly.
3. Claude runs targeted verification.
4. Claude runs `/codex:review --wait`.
5. Claude fixes review findings.
6. Claude hands off to Max.

### Subagent Mode

Use when:

- main context would be polluted by broad search
- discovery and implementation can be separated
- workers do not need to talk to each other

Flow:

1. Claude PM spawns one to three scouts.
2. Scouts return concise findings with file paths and confidence.
3. Claude PM synthesizes.
4. Claude PM or one builder implements.
5. Verification agent checks.
6. Codex reviews.

### Agent Team Mode

Use when:

- work spans independent layers
- competing hypotheses need parallel exploration
- frontend/backend/tests can be owned separately
- architecture needs challenge from multiple angles

Avoid when:

- same files would be edited by multiple teammates
- task is sequential
- task is mostly cleanup
- current context is enough
- usage budget matters more than speed

Flow:

1. Claude PM creates a named team.
2. Claude PM creates a shared task list.
3. Claude PM spawns named teammates with specific ownership.
4. Risky teammates must produce plans first.
5. Claude PM approves or rejects teammate plans.
6. Teammates implement only their owned file sets.
7. Claude PM synthesizes and resolves integration issues.
8. Verification runs.
9. Codex reviews.
10. Claude PM cleans up the team.

## Default Team Templates

### Research Team

Use for unknown codebase or ambiguous product direction.

- `locator`: Haiku or Sonnet, read-only, file discovery
- `analyst`: Sonnet, read-only, behavior and architecture summary
- `skeptic`: Sonnet or Opus, read-only, challenges assumptions

Output required:

- relevant files
- current behavior
- likely change points
- risks
- test targets

### Feature Team

Use for cross-layer implementation.

- `backend-builder`: Sonnet, owns API/server/data files
- `frontend-builder`: Sonnet, owns UI/client files
- `test-verifier`: Sonnet, owns tests and verification
- `pm`: Claude lead, integrates and handoff

Rules:

- builders cannot edit each other's owned paths
- PM handles conflicts
- PM runs final local gate
- Codex reviews before Max sees it

### Debug Team

Use for hard bugs with multiple possible causes.

- `repro`: Sonnet, creates or runs reproduction
- `hypothesis-a`: Haiku/Sonnet, investigates one cause
- `hypothesis-b`: Haiku/Sonnet, investigates another cause
- `fixer`: Sonnet/Opus, implements after PM synthesis

Rule:

- no fix until PM synthesizes evidence from repro and hypotheses

## Model Allocation

Default:

- Claude PM: Opus for planning/synthesis, Sonnet for routine work
- Scout: Haiku for bounded lookup, Sonnet for judgment-heavy discovery
- Analyst: Sonnet
- Builder: Sonnet
- Complex debugger/refactorer: Opus
- Codex reviewer: GPT-5.4 / current Codex default when available
- Codex rescue: GPT-5.4 or GPT-5.4-mini depending risk

Do not use nano/Haiku-class models for:

- final review
- security-sensitive code
- database migrations
- auth changes
- broad refactors
- production deploy decisions

Use nano/Haiku-class models for:

- locating files
- extracting facts
- checking docs
- summarizing logs
- narrow smoke checks

## Quality Gates

Minimum before handoff:

- `git status --short`
- relevant lint/typecheck/tests
- docs update if behavior/API/env changed
- Codex review

Codex review gate:

```text
/codex:review --wait
```

Adversarial review gate for high-risk work:

```text
/codex:adversarial-review --wait <specific risk focus>
```

If review cannot run:

- say why
- include exact command attempted
- include fallback verification
- do not present as fully reviewed

## Proposed Config Changes

### 1. Add a standing rule to `AGENTS.md` or `CLAUDE.md`

```md
Claude is PM/orchestrator. Use small read-only scouts first, then one writer per file area. Before handoff to Max, run Codex review with `/codex:review --wait`. For risky architectural changes, run `/codex:adversarial-review --wait <risk focus>`. Do not hand off implementation without either passing Codex review or explicitly reporting why review could not run.
```

### 2. Tune scout agents to cheaper models

Candidate changes:

- `codebase-locator`: `model: haiku`
- `codebase-pattern-finder`: `model: haiku` or `sonnet`
- `thoughts-locator`: `model: haiku`
- keep `codebase-analyzer`: `model: sonnet`
- keep builder agents stronger

### 3. Add a pure read-only verifier

Current `qa-tester` can edit. Add a stricter verifier agent that cannot write unless explicitly asked.

Suggested role:

```yaml
name: verification-reviewer
description: Read-only verifier. Use before handoff to inspect changed behavior, run tests, and report PASS/FAIL/PARTIAL with evidence.
tools: Read, Grep, Glob, LS, Bash
model: sonnet
```

### 4. Keep Codex review manual by default

Do not enable the plugin Stop-hook review gate by default yet. It can block stop events and create usage-heavy loops. Use manual `/codex:review --wait` as the normal policy. Enable the Stop hook only for monitored high-risk sessions.

## Review Checklist For This Plan

- Should Claude PM be Opus by default, or Sonnet with Opus escalation?
- Should scout agents be downgraded to Haiku now?
- Should Codex review be manual only, or should the Stop review gate be enabled for specific repos?
- Should `.claude/agents/qa-tester.md` be split into read-only verifier plus write-capable tester?
- Should this policy live in `AGENTS.md`, `CLAUDE.md`, or a dedicated `.claude/skills/agent-orchestration/SKILL.md`?

## Sources

- [Claude Code: Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code: Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
- [Claude Code: Manage costs effectively](https://code.claude.com/docs/en/costs)
- [Claude Code: Extend Claude Code](https://code.claude.com/docs/en/features-overview)
- [Claude Code: Model configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code: Automate workflows with hooks](https://code.claude.com/docs/en/hooks-guide)
- [OpenAI Codex Claude Code plugin](https://github.com/openai/codex-plugin-cc)

