# Review: feat/papers-and-tiers (PR #12, target v1.7.0)

Date: 2026-09-22 · Reviewer: release-reviewer · Fixer: release-fixer
Verdict: fixed. The reviewer found three low-severity issues and no blockers. R1 and R2 are fixed with regression tests, and R3 is resolved by writing down the backup-version policy, as the branch owner decided.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | low | correctness | src/utils/subjects.js:395-399 | `groupTopicsByPaper` sorted two paper combinations with the same first paper and the same length by where their first topic appeared, not by paper order (e.g. "P1 & P3" came before "P1 & P2"). | Fixed in ee57c06. On a tie, the remaining papers are now compared in paper order. Test in src/utils/subjects.test.js ("orders paper combinations sharing a first paper by their remaining papers"). |
| R2 | low | correctness | src/components/TopicList.jsx:118 (also 35, 455) | A topic could disappear from view (hiding higher-tier topics, or ticking "Higher tier only" on a Foundation subject) while still expanded, so the next logged session was tagged with it. | Fixed in 9bf4dee. TopicList now clears `expandedTopic` when that topic is no longer visible. Test in src/components/TopicList.test.jsx ("clears the expanded topic when it is hidden, so a session isn't tagged with it"). |
| R3 | low | invariant | src/utils/backup.js:7 | New persisted fields (`papers`, topic `paper`, `higherOnly`) shipped without a `BACKUP_VERSION` bump, so older builds drop them without warning. | Resolved by policy in 05cec18. As the branch owner decided, `BACKUP_VERSION` is not bumped: a bump would make older builds reject the whole backup, and F2's `catalogueTopicId` already set this precedent. instruction.md now says that optional, additive fields don't bump the version and that a bump is only for changes an older build would misread. |

## Follow-ups (not fixed on this branch)

- None. All findings were in the diff and have been fixed or resolved.

## Checks

lint pass · test pass (270 tests, 21 files) · build pass (main bundle 801.05 kB, gzip 237.55 kB). The TopicList snapshot in src/components/__snapshots__ is unchanged.
