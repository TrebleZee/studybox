# Review: fix/replace-writes-tombstones (PR #55, target v1.19.3)

Date: 2026-10-06 · Reviewer: release-reviewer (two independent runs, Critical tier) · Fixer: release-fixer
Verdict: fixed. Both runs returned clean with one low in-diff finding each – the same race in Use template – which is fixed with a regression test; the other finding is pre-existing and left as a follow-up.

## Review runs

- **Run A:** VERDICT clean. Findings: R1 (low, in diff) and R2 (low, pre-existing).
- **Run B:** VERDICT clean. Finding: R1 (low, partly in diff – the stale subjects overwrite was already on master; writing stale tombstones and the stale placeholder flag are new in this branch).

Both runs reported the same R1 from different scenarios (A: another tab restores a v3 backup with tombstones; B: another tab picks Start blank, adds and deletes subjects). The union below lists it once.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | low | correctness | src/App.jsx `useTemplate` / `replaceSubjects` | Use template awaits the catalogue, then calls `replaceSubjects` with the `subjects`, `tombstones` and `needsOnboarding` captured at the click. If another tab finished onboarding meanwhile, this tab overwrote that tab's subjects, gave them no tombstones (stale placeholder flag) and wrote a tombstone set without that tab's tombstones, so with that tab closed a later merge or sync could bring deleted records back. | Fixed in feb88e3: once the load resolves, the result is dropped if storage already says onboarding is done (`loaders.onboarded()`), as it already was for an onboarding action in the same tab. Test `src/App.templateRace.test.jsx` (failed before the fix; a second case checks the template still applies when nothing else happened). |
| R2 | low | correctness | src/utils/replace.js | Tombstones written by a replace are stamped `now`, so a removed record whose `updatedAt` is later than this device's clock comes back in the next merge. | Not fixed (pre-existing): an ordinary delete (`entomb`) behaves the same way; it belongs to ledger finding N14 (far-future stamps). |

## Follow-ups (not fixed on this branch)

- R2 (pre-existing, low): replace tombstones, like every delete, lose to a record stamped ahead of this device's clock. Fix by bounding imported stamps, as ledger N14 already plans. Suggested branch: `fix/bound-imported-values` (with N14 and N28).

## Checks

lint pass · test pass (840 tests, 67 files) · build pass (main bundle 896.43 kB, gzip 265.43 kB)
