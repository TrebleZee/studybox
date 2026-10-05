# StudyBox

Local-first study planner and revision timer (React 19 + Vite 8, PWA, `localStorage` only). The project rules live in `instruction.md`, imported here so they load in every session:

@instruction.md

## How to work in this repo

- **Every change:** use the `git-workflow` skill (`.claude/skills/git-workflow/SKILL.md`). Never commit to `master`; work in your own worktree, claim the item with a draft PR, branch off `origin/master` as `fix/`, `feat/`, `refactor/` or `chore/`, run the review gate for `feat/` and `refactor/`, and sync, merge and tag one branch at a time per the skill. Several sessions work in parallel: never check out or pull in a checkout that isn't yours.
- **What to work on:** the goal's **Parallel lanes** table says which items can run at once; take the next unclaimed item in a lane nobody is working in (`gh pr list` shows claims).
- **Before any phase of the V2 plan, or to re-plan:** use the `readiness-pass` skill (`.claude/skills/readiness-pass/SKILL.md`). The findings ledger is `docs/readiness/findings.md`; the current goal is `.claude/commands/goal.md`.
- **Parallel sessions:** the `orchestrate` skill runs the goal's lanes as full worker sessions, with each session's model chosen by risk (Critical → Fable, High → Opus, Standard → Sonnet, Mechanical → Haiku). Workers stop at a ready PR; only the coordinator merges.
- **Status:** `docs/STATUS.md` says where things stand and what needs actioning. Read it first; update it in every PR (git-workflow step 2b).
- **Checks:** `npm run lint`, `npm test`, `npm run build`. All three must pass before a PR; CI runs the same.
- **Never:** touch `localStorage` outside `src/store/`, weaken a test to get green, add a runtime dependency, backend or network call without asking, or change `defaultSubjects()` output.
