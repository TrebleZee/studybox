# Review: feat/undo-restore (PR #48, target v1.19.0)

Date: 2026-10-05 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. Three in-diff findings (two medium, one low) fixed with a regression test each; nothing left open.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | medium | correctness | src/utils/undo.js:175-180 | `unchangedSinceRestore` judged "nothing changed" with a last-write-wins merge, so after restoring a file stamped ahead of this device's clock, later edits lost every comparison, the offer stayed and Undo restore discarded them. | Fixed in d75a255: every session, subject's own fields, topic, milestone and tombstone must now be an exact copy from before the restore or from the file; only the game is still compared by merging. Test `src/utils/undo.test.js` ("is withdrawn by edits even when the file's stamps are ahead of this device's clock (R1)"). instruction.md updated. |
| R2 | medium | correctness | src/App.jsx:416-417 | `canUndoImport` ran on every App render (timer ticks, keystrokes) and, once diverged, did two `mergeData` calls each time. | Fixed in b065093: `current` and `canUndo` are memoised on the offer and the data. Test `src/App.undoCost.test.jsx`. App.jsx stays at 599 lines. |
| R3 | low | correctness | src/App.jsx:367 | "Download backup" replaced the message without its `undo`, withdrawing Undo restore (and Undo merge) contrary to the docs. | Fixed in bbdf94e (one line: the download message keeps the existing `undo`). Test `src/App.undoRestore.test.jsx` ("stays offered after Download backup (R3)"). |

## Follow-ups (not fixed on this branch)

- None. No pre-existing (`in_diff: false`) findings were raised.

## Checks

lint pass · test pass (59 files, 759 tests) · build pass (main bundle 890.09 kB, 263.42 kB gzip)
