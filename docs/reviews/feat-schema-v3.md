# Review: feat/schema-v3 (PR #28, target v1.15.0)

Date: 2026-10-05 · Reviewer: independent read-only agent (release-reviewer brief) · Fixes: same session
Verdict: fixes-needed, now fixed. One high finding in the new merge (a deleted subject could take later work with it) and one low were fixed with regression tests. Three lows are documented limits. The review covered the stack `chore/store-layer` → `feat/schema-v3` → `fix/xp-derivation` at 9206851; upgrade invariants held (previous-release data loads unchanged, ids untouched, no XP or streak drop on upgrade, Asana token stays out of backups and store subscribers).

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | high | correctness | src/utils/merge.js | A subject tombstone removed the subject even when its topics were edited after the deletion (topic edits stamp the topic, not the subject), losing that work and making three-copy merges order-dependent. | Fixed. A subject survives if it or anything in it was edited after the deletion. Tests: later-work, earlier-work and three-copy order. |
| R2 | low | correctness | src/utils/merge.js | Records from before v3 have no edit time, so a tie between two differing copies is broken on content, not recency; the UI text promised "most recent". | Documented. UI text and instruction.md now say so. Not stamping at upgrade, since that would make untouched default subjects look touched. |
| R4 | low | correctness | src/utils/merge.js | A repeated id inside one list (hand-edited file) merged differently depending on side. | Fixed. Each side is de-duplicated with the merge rule first. Test added. |
| R5 | low | correctness | src/utils/merge.js | Records converge in any merge order, but the order of subjects and topics does not. | Documented as a known limit; needs an explicit order field in the sync design. |

R3 and R6 belong to `fix/xp-derivation` and are handled there.

## Follow-ups (pre-existing, not fixed on this branch)

- P2 (low): `normalizeSubject` throws on a subject whose id is `__proto__` or `constructor` (`PRESET_METADATA[id]` lookup). A backup file fails safely; the same id in stored data would crash on load. Suggested branch: `fix/preset-lookup-own-keys`.
- P3 (low): `normalizeSessions` gives an id-less session a new id on every parse, so merging the same id-less foreign file twice duplicates it. The app has always written ids.
- P4 (low): restore stores the backup's game without streak validation until the next reload.
- `src/store/usePersistedState.js` is covered only through `App.test.jsx`.

## Checks

lint pass · test pass · build pass (see PR for counts at the final commit)
