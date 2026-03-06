---
name: gsc-validation-runbook
description: Use after deploys to run and document Google Search Console validation workflow using GSC_VALIDATION_WORKFLOW.md and generate a repeatable report.
---

# GSC Validation Runbook

Convert GSC validation actions into a consistent report artifact.

## Workflow

1. Read `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/GSC_VALIDATION_WORKFLOW.md`.
2. Gather deploy context: date, commit, changed routes.
3. Fill the report template in `references/report-template.md`.
4. Save report under `thoughts/` or requested path with date stamp.

## Required Sections

- deploy context
- validation queues submitted
- high-priority URLs
- blocked/failed validations
- follow-up checkpoints (24h / 72h / 7d)
