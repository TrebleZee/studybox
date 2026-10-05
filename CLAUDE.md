# StudyBox

Local-first study planner and revision timer (React 19 + Vite 8, PWA, `localStorage` only). The project rules live in `instruction.md`, imported here so they load in every session:

@instruction.md

## How to work in this repo

- **Every change:** use the `git-workflow` skill (`.claude/skills/git-workflow/SKILL.md`). Never commit to `master`; branch as `fix/`, `feat/`, `refactor/` or `chore/`, open a PR, run the review gate for `feat/` and `refactor/`, and tag per the skill's versioning table.
- **Before any phase of the V2 plan, or to re-plan:** use the `readiness-pass` skill (`.claude/skills/readiness-pass/SKILL.md`). The findings ledger is `docs/readiness/findings.md`; the current goal is `.claude/commands/goal.md`.
- **Checks:** `npm run lint`, `npm test`, `npm run build`. All three must pass before a PR; CI runs the same.
- **Never:** touch `localStorage` outside `src/store/`, weaken a test to get green, add a runtime dependency, backend or network call without asking, or change `defaultSubjects()` output.
