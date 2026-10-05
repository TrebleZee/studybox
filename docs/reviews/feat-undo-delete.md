# Review: feat/undo-delete (PR #32, target v1.16.0)

Date: 2026-10-05 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. The high finding (Undo merge could wipe out work done after the merge) is fixed with a regression test, the low test gap is closed, and the medium multi-tab limit is documented accurately and deferred to the maintainer because the goal requires undo to keep stamps unchanged.

Reviewed at `7000159`.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | high | correctness | src/App.jsx (`undoMerge`, merge branch of `importData`) | "Undo merge" put back a full pre-merge snapshot and stayed on offer until the next import or a reload, so it also discarded sessions, ticks and deletes made after the merge (and rolled back the game) | Fixed in c9147da. The offer now keeps the merged subjects, sessions, tombstones and game, and `unchangedSinceMerge` (`src/utils/undo.js`) shows and allows Undo merge only while the current state is still those exact objects. Tests: `src/App.undo.test.jsx` ("is withdrawn once anything changes after the merge, so later work survives": merge, tick a topic, Undo merge is gone and storage keeps the tick), `src/utils/undo.test.js` (`unchangedSinceMerge`) |
| R2 | medium | correctness | src/utils/undo.js (`restoreDeletion`), instruction.md | With any other tab or the installed app open, even idle, an undone delete (and an undone merge) is deleted again in the tab that pressed Undo too; the documented limit understated this | Deferred: maintainer decision (re-stamp on undo versus the goal's requirement that undo restores the record "with its stamps unchanged" and leaves storage byte-identical). Stamps not changed. The "Known limit" in `instruction.md`, the N8 row in `docs/readiness/findings.md` and the PR description now state the real scope (0477ad7): undo is reliable only with a single tab open |
| R3 | low | tests | src/utils/subjects.js | `buildNewSubjects` became an exported pure function with no unit test | Fixed in 4841a31, test `src/utils/subjects.test.js` (fresh `custom-` ids, `${id}-topic-${i}` topic ids, string and object topics with catalogue fields, stamps equal to `now`) |

## Second round (fix commits 7000159..008051d)

| ID | Severity | Category | File | Finding | Resolution |
| --- | --- | --- | --- | --- | --- |
| R4 | medium | correctness | src/App.jsx (`undoMerge`) | Starting the timer on a subject only the merge added doesn't withdraw Undo merge; undoing then left the timer on a subject that no longer exists, so the time would log under another subject | Fixed: `undoMerge` clears a timed subject that isn't in the pre-merge subjects, as a subject delete and the merge itself do. Test `src/App.undo.test.jsx` "stops timing a subject that only the merge added" (fails without the fix) |

Notes:

- The R1 fix narrows the goal's "until the next import or a reload" to "and only while nothing has changed since the merge", as the maintainer directed. `instruction.md` says so; `.claude/commands/goal.md` was left as written.
- To keep `App.jsx` at or below 614 lines (now 612), the merge call in `importData` builds its incoming object in two lines instead of nine; behaviour is unchanged.

## Follow-ups (not fixed on this branch)

- R2 (in diff, medium, deferred): decide between re-stamping the restored record on undo (`touch()`), which makes undo survive other open tabs but breaks byte-identical storage after undo, and keeping the current limit until sync brings an "undeleted at" stamp. Tracked as N8 in `docs/readiness/findings.md`. Suggested branch if re-stamping is chosen: `fix/undo-restamp`.

## Checks

lint pass · test pass (643 tests) · build pass (main bundle 883.07 kB, 261.25 kB gzip)
