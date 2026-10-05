---
name: readiness-pass
description: Run a StudyBox V2 readiness pass - audit the whole app on master twice, reassess readiness against the findings ledger, and produce a dated plan and an updated goal file. Use when asked to review the codebase for V2, reassess readiness, re-plan, or before starting any new phase of the V2 plan.
---

# Readiness pass: audit, reassess, plan

A readiness pass answers "is StudyBox ready for the next step towards V2, and what is the plan". It is the whole-app counterpart to the per-PR review gate in the `git-workflow` skill: that gate checks a diff before it merges; this checks the app before a phase starts. Run it at the start of every phase of the plan, and whenever the plan's dates or premises look stale.

It changes nothing in `src/`. Its only outputs are files under `docs/readiness/`, an updated `.claude/commands/goal.md`, and one `chore/` PR carrying them.

## 1. Start from master

```bash
git checkout master
git pull
git fetch --tags
git checkout -b chore/readiness-<YYYY-MM-DD>
```

If the working tree has uncommitted changes, stash them with a clear message and say so in the final report. Do not run a pass on a feature branch: the question is about what is live.

## 2. Audit, twice

1. Spawn the `readiness-auditor` agent with "pass 1". It starts cold and is read-only. Do not pass it your own view of the codebase.
2. Spawn `readiness-auditor` again with "pass 2" and the full output of pass 1. Its job is to dispute pass 1 and cover what pass 1 skipped. This is the "iterate the review" step; the first pass of any review is comfortable, and the findings that matter tend to come from the second.
3. Merge the two outputs: keep pass 2's status where they disagree on a ledger row, drop any pass-1 finding pass 2 disputed with evidence, and keep every finding that has a scenario.

If the baseline is red (lint, test or build failing on `master`), stop here. Report it: fixing `master` comes before any plan.

## 3. Reassess and plan

Spawn the `readiness-planner` agent with the merged audit and today's date. If the Claude project's design gate or an earlier assessment is available in this session, paste the relevant parts in as context. It updates `docs/readiness/findings.md` and writes `docs/readiness/<YYYY-MM-DD>.md`.

Read the report yourself before continuing. Check that every verdict cites ledger ids, that every `high` has a branch in the first phase, and that the plan has a dated decision point for each open `blocker`. Send it back to the planner once if not.

## 4. Update the goal file

Rewrite `.claude/commands/goal.md` so it describes the phase the plan says is next, in the existing format: a one-paragraph goal, ground rules, decisions already made, then one section per branch with **Branch**, **Closes**, **Build** and **Done when** checkboxes, then "Stop and ask" and "Final report". Before overwriting, copy the outgoing goal to `docs/goals/<YYYY-MM>-<slug>.md` if its work has shipped. Only work an agent can do goes in the goal; decisions and user research stay in the report as the maintainer's.

## 4b. Refresh the status page

Update `docs/STATUS.md` from the report: the readiness line in **Current state**, the whole **Progress against the plan** table (phases, dates and state from the new plan), **Needs actioning** (the report's maintainer items with their dates, and the agent's next branches), and **Known risks** (open findings a user would notice today). It goes in the same PR.

## 5. Open the PR and stop

Commit the ledger, the report, the goal file, any archived goal and `docs/STATUS.md`. Push and open a `chore/` PR (no version bump, no tag) following the `git-workflow` skill. The PR body is the verdict, the ids opened and closed, and the list of things only the maintainer can do.

Then stop. Do not start the plan's first branch in the same run: the maintainer reads the report, makes the decisions it asks for, and starts the work with `/goal`.

## Final message

Lead with the three verdicts. Then: what closed and what opened this pass, the first phase's branches in order, what needs the maintainer and by when, and anything the audit could not check.

## Edge cases

- **No previous report**: the ledger is the baseline; say "Previous pass: none".
- **An agent returns nothing usable** (no AUDITED line, no scenarios): run it once more; if it fails again, do that step yourself and say so.
- **The auditor and the ledger disagree on whether a row is closed**: the code on `master` wins. A closed row that no longer holds is reopened as a regression with a new note, same id.
- **The pass finds something that is losing data in production now**: say so at the top of the final message. It is the first branch of the plan, and worth a `fix/` before the pass's own PR is merged.
