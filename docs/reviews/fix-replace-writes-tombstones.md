# Review: fix/replace-writes-tombstones (PR #55; version set at merge time)

Date: 2026-10-06 · Reviewer: release-reviewer (two independent runs, Critical tier) · Fixer: release-fixer
Verdict: fixed. Both runs returned clean with one low in-diff finding each – the same race in Use template – which is fixed with a regression test; the other finding is pre-existing and left as a follow-up.

## Review runs

- **Run A:** VERDICT clean. Findings: R1 (low, in diff) and R2 (low, pre-existing).
- **Run B:** VERDICT clean. Finding: R1 (low, partly in diff – the stale subjects overwrite was already on master; writing stale tombstones and the stale placeholder flag are new in this branch).

Both runs reported the same R1 from different scenarios (A: another tab restores a v3 backup with tombstones; B: another tab picks Start blank, adds and deletes subjects). The union below lists it once.

- **Round 2 (re-check of the fix commit feb88e3 only):** VERDICT clean, no findings. The guard reads stored `onboarded`, which every way another tab can finish onboarding sets; the same-tab ticket still covers same-tab races; with blocked storage the template applies as before. Confirmed the test fails without the guard (subjects overwritten and the other tab's tombstone dropped) and passes with it.

- **Round 3 (after #52, subtask records, N19):** the repo owner's merger session merged master with #52 into this branch (78ea89d) and found, in a blocking comment on #55, that `replaceData` didn't tombstone subtasks: a stamped subtask a restore, Start blank or template dropped from a kept topic came back on the next merge. Fixed test-first in b3f905a (two two-tab tests and two `replaceData` unit tests, all red) and 210fda5 (`replaceData` tombstones each dropped subtask of a kept topic, `subtasks` kind with `subtaskKey`, and settles each subtask on its own and the topic on its own fields, as they merge since #52; #52's echo test now expects the N10 behaviour). Two new independent runs reviewed `4e1c51b..HEAD`, conflict resolutions in 78ea89d included:
  - **Run C:** VERDICT clean, no findings. Read `replace.js`, `merge.js`, `tombstones.js` and `undo.js` in full and ran a throwaway 20,000-case fuzz (deleted afterwards) with stamped and unstamped topics and subtasks and random tombstones on both sides: merging the pre-restore state with the restore gives exactly the restored records; Undo restore then a merge brings back every pre-restore subject, topic and subtask; `unchangedSinceRestore` stays true on the echo. 0 failures in each.
  - **Run D:** VERDICT clean, no findings. Node probes comparing 78ea89d's `replace.js` with the fix through `mergeData`: dropped stamped subtasks, the file's older subtask copy, unstamped subtasks under older, equal and newer topic stamps, and restore, echo, Undo, merge (whole topic and whole subject dropped too) all correct. Noted, not a finding: the STATUS A3 row written in 78ea89d already called A3.1 merged with a version; it now says open as #55, since the version is set at merge time.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | low | correctness | src/App.jsx `useTemplate` / `replaceSubjects` | Use template awaits the catalogue, then calls `replaceSubjects` with the `subjects`, `tombstones` and `needsOnboarding` captured at the click. If another tab finished onboarding meanwhile, this tab overwrote that tab's subjects, gave them no tombstones (stale placeholder flag) and wrote a tombstone set without that tab's tombstones, so with that tab closed a later merge or sync could bring deleted records back. | Fixed in feb88e3: once the load resolves, the result is dropped if storage already says onboarding is done (`loaders.onboarded()`), as it already was for an onboarding action in the same tab. Test `src/App.templateRace.test.jsx` (failed before the fix; a second case checks the template still applies when nothing else happened). |
| R2 | low | correctness | src/utils/replace.js | Tombstones written by a replace are stamped `now`, so a removed record whose `updatedAt` is later than this device's clock comes back in the next merge. | Not fixed (pre-existing): an ordinary delete (`entomb`) behaves the same way; it belongs to ledger finding N14 (far-future stamps). |

## Follow-ups (not fixed on this branch)

- R2 (pre-existing, low): replace tombstones, like every delete, lose to a record stamped ahead of this device's clock. Fix by bounding imported stamps, as ledger N14 already plans. Suggested branch: `fix/bound-imported-values` (with N14 and N28).

## Checks

lint pass · test pass (898 tests, after merging master with #58 and #59) · build pass (main bundle 896.43 kB, gzip 265.43 kB)
