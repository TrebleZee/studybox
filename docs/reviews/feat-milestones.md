# Review: feat/milestones (PR #13, target v1.8.0)

Date: 2026-09-23 · Reviewer: release-reviewer · Fixes: branch owner (the release-fixer run stopped on a rate limit before changing anything, so the owner applied the fixes)
Verdict: fixed. The one medium and three low findings are all fixed on this branch, each with tests.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/components/MilestoneStrip.jsx:79 | "Keep as topic" lived in the strip's local state, so the NEA offer came back after any view switch or reload. On a fresh default install, the CS "NEA Programming Project" topic meant the user could never silence it. | Fixed: the choice is saved on the topic as `keepAsTopic: true` (normalized as an optional flag, kept only when true), through a new subject-scoped `keepAsTopic` action in App. `neaTopicCandidates` skips flagged topics. Tests cover the component, the utils, normalisation, and the App offer staying gone after Settings → Planner and after a reload. |
| R2 | low | correctness | src/utils/subjects.js:329 | `normalizeMilestones` didn't de-duplicate ids, and its fallback id could collide with an explicit one. | Fixed: the first owner of an id keeps it, and missing or repeated ids get fresh ones that avoid every explicit id. Normalizing twice gives the same result. Test in subjects.test.js. |
| R3 | low | correctness | src/components/MilestoneStrip.jsx:95 | After one add, the subject select stayed pinned to that subject. | Fixed: the draft's subject resets after an add, so the select defaults to the currently selected subject. Test: add on cs, re-render with phys selected, the select shows phys. |
| R4 | low | correctness | src/utils/milestones.js:755 | Converting silently deleted the topic's subtasks. | Fixed: when the topic has subtasks, the confirm text now says "…and delete its N subtasks…". Tests cover the text with 5 subtasks and with none. |

## Follow-ups (not fixed on this branch)

- Not a finding, noted by the reviewer: subjects created from the catalogue before this release don't get the new catalogue milestones retroactively (no backfill). No data is lost; a later "reset to spec" feature could add them.

## Checks

lint pass · test pass (324 tests, 24 files) · build pass
