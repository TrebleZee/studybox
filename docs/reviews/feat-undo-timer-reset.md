# Review: feat/undo-timer-reset (PR #46, target version set at merge)

Date: 2026-10-05 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: clean. The reviewer found two low findings and no critical, high or medium ones; neither is fixed on this branch – R1 is a design question for the maintainer and R2 belongs to ledger finding N15.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | low | correctness | src/hooks/useUndoDelete.js:14 | The Reset undo is withdrawn as soon as a new session is in progress, so one accidental Space (global start/pause) right after Reset drops the offer and the reset time can't be recovered | Not fixed – follow-up. The withdrawal is deliberate: the branch's test "withdraws the offer once a new session starts" pins it and `instruction.md` documents it ("withdrawn as soon as a new session is in progress, so it can never overwrite one"). A threshold or a "replace a 0 s timer" rule isn't a one-line, no-risk change: with `displaySecs > 0` the window closes after one second anyway, and a larger threshold lets Undo overwrite real seconds. Needs a maintainer decision |
| R2 | low | correctness | src/App.jsx:139 | Undoing a Reset restores `timedSubjectId` without checking the subject still exists, so if another tab deleted it in between the restored time logs under the selected subject | Not fixed – follow-up in N15's branch. The same dangling `timedSubjectId` already arises on `master` when another tab deletes the timed subject mid-session, and clearing it to `null` would not change the outcome (`logSession` falls back to the selected subject). Time is mis-attributed, not lost |

## Follow-ups (not fixed on this branch)

- R1 (in diff, low): decide whether the Reset undo should survive an accidental start (e.g. let Undo replace a new session with under a few seconds on it, or withdraw on meaningful time rather than `running`). If changed, update the pinning test and the Reset sentence in `instruction.md` (Customization rules). Suggested branch: `fix/undo-reset-accidental-start`.
- R2 (in diff, low; same gap as ledger N15, medium): when the timed subject is gone, Undo of a Reset (and a running session generally) should not log silently under another subject. Fix with N15 on its planned branch `fix/orphaned-timer-subject` (lane 3), covering the `onRestore` path in `App.jsx` alongside the external-delete path, mirroring the `timedGone` guard in `undoMerge`.

## Checks

lint pass · test pass (724 tests) · build pass (main bundle 887.51 kB, 262.53 kB gzip)
