---
name: skill-router
description: Loads only the skill(s) needed for this task from the offline library index, then executes with minimal context.
metadata:
  short-description: Offline skill loader
---

# Skill Router

Purpose: keep context small by selecting and loading only relevant skills per task.

## Offline Library

- Index file: `/Users/maxpetrusenko/Desktop/Gauntlet/Projects/skills/index.md`
- Skill files: paths listed in that index (expected `.../SKILL.md`)

## Required Workflow

1. Read only `/Users/maxpetrusenko/Desktop/Gauntlet/Projects/skills/index.md`.
2. Choose at most 1-2 best skills for the current task.
3. Load only those selected `SKILL.md` files.
4. Start work and report:
   - `Skills loaded now: ...`
   - `Potential skills later: ...`

## Constraints

- Never enumerate all skills in the library.
- Never paste full skill docs into chat.
- If there is no clear match, ask for one clarifying keyword.
