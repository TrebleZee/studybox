# Review: fix/subtask-records (PR #52)

Date: 2026-10-06 · Reviewer: release-reviewer (two independent runs, both Opus: Review A and Review B) · Fixer: release-fixer
Verdict: fixed. Both medium findings are resolved: B-R1 by a code fix with regression and property tests, and A-R1 by documenting and pinning a known limit, as the coordinator directed. No critical or high finding is open.

A `fix/` branch at Critical tier (stored data model and merge, N19), reviewed on the coordinator's instruction. No version is set here; the branch takes its version at merge time.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| A-R1 | medium | correctness | src/utils/merge.js:133-136 (`mergeSubject` topic filter, `topicActivity`) | A deleted topic now comes back when one of its subtasks was edited after the deletion, so a three-copy merge around a deleted topic can depend on merge order, like the existing deleted-subject limit. Before this branch topic tombstones were order-independent, and `instruction.md` and the N19 ledger row still said otherwise | Kept as designed, as the coordinator directed: a subtask edited after the deletion still brings its topic back (work done since is never thrown away, the same rule as subjects). Pinned in 583d8b2 by `src/utils/merge.test.js` "can forget one copy's topic rename when three copies meet around a deleted topic" (Review A's scenario: one order gives "Old" with [y], the other "Renamed" with [x, y], and y survives either way). Documented in ba58fc2: the `merge.js` header comment, the known-limit bullet in `instruction.md` (now "a deleted subject or topic") and the N19 row in `docs/readiness/findings.md` (its "five-order three-copy independence" claim now says it covers subtask records, not a deleted topic) |
| B-R1 | medium | correctness | src/utils/merge.js:117 (`mergeTopic`) | A build before N19 writes no subtask stamp or tombstone; it stamps the topic. Unioning subtasks by id meant its delete of an unstamped subtask was always undone by a merge with an earlier copy, and its untick always lost to the content tie-break. Both were regressions from `master`, where the later-stamped topic won whole | Fixed in 583d8b2 with the coordinator's option (a), expressed only through stamps: an unstamped subtask belongs to its topic copy's version, so when the other copy's topic stamp is strictly older than the winner's, the other copy's unstamped subtasks are dropped before the union. The winner's topic stamp is never older (`pickOwn` compares stamps first) and the merged topic carries the later stamp, so the rule stays commutative, idempotent and associative; equal topic stamps keep the plain union and stamped subtasks are untouched. Tests in `src/utils/merge.test.js` under "unstamped subtasks follow their topic's stamp (B-R1)": both of Review B's scenarios (old-build delete, old-build untick), in both orders and commutative (both failed before the fix); equal topic stamps still union; a stamped subtask is never dropped for an older topic copy; a 300-run seeded property test over random copies mixing stamped and unstamped subtasks, different topic stamps and subtask tombstones, checking commutativity, idempotence and seven three-copy merge orders (a mutation to `<=` makes it fail). The auditor's N19 scenario and every earlier N19 test still pass unchanged. `instruction.md`'s mixed-version limit, the N19 ledger row and the STATUS risk now say what remains: an older build's add or edit of an unstamped subtask loses to a later topic edit elsewhere (as on `master`), its tick or rename of a subtask this build stamped can lose the stamp tie, and its delete of one is undone |

## Follow-ups (not fixed on this branch)

None. Both findings were in the diff; the remaining mixed-version and three-copy limits are documented in `instruction.md` and end with V2 sync (server-side deleted rows) or once every copy runs this build.

## Checks

lint pass · test pass (846 tests, 65 files) · build pass (main bundle 895.74 kB, gzip 265.28 kB)
