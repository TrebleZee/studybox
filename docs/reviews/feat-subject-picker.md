# Review: feat/subject-picker (PR #15, target v1.10.0)

Date: 2026-09-23 · Reviewer: release-reviewer · Fixes: branch owner
Verdict: clean. One low finding, fixed with a test.

The reviewer confirmed these invariants:

- The onboarding guard is intact: `startWithSubjects` can only replace the untouched placeholder set.
- `addSubject` still accepts a single subject (manual and PDF paths) and gives each subject in a list a unique id.
- Duplicate prevention covers existing subjects and those already picked in the same pass.
- The new pure logic has sibling tests.
- There are no new dependencies and no unsafe HTML sinks.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | low | correctness | src/components/SubjectPicker.jsx:82 | A spec load still running when the student went Back and chose another subject could finish late and jump the picker to the old spec's details. | Fixed: each load is tagged with a request counter, and Back and reset bump the counter so a stale result is ignored. Test: a held-open load for CS is released after moving to Physics, and the picker stays on Physics. |

Also fixed, not a finding: the reviewer noted instruction.md still described `addSubject` in its pre-F3 form. That line is updated.

## Follow-ups (not fixed on this branch)

None.

## Checks

lint pass · test pass (411 tests, 26 files) · build pass
