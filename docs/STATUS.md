# StudyBox status

The one page to read to know where StudyBox is: what changed recently, how far through the plan it is, and what needs someone to act. It is kept current by the workflow. Every PR updates it (see the `git-workflow` skill, step 2b), and every readiness pass refreshes the progress section. `src/statusDoc.test.js` fails if the version below disagrees with `package.json`.

Last updated: 2026-10-05

## Current state

| | |
| --- | --- |
| Current version | 1.18.1 |
| Latest tag on GitHub | v1.18.1 |
| Production | studybox-sigma.vercel.app, deployed from `master` @ `661e26a` (1.17.2) at the time of the 5 Oct scope review |
| Current goal | `.claude/commands/goal.md`: Phases A2 and A3, amended by the scope review |
| Readiness | Scope review on 2026-10-05: on track against the plan and within V1 scope in code, but not moving towards V2 (B1, V1 not started). Open: 3 `high` (N9, N10, N11), 2 `blocker`. Report: `docs/readiness/2026-10-05-scope-review.md` |
| Open PRs | none |
| Checks on `master` | Lint, test (711 tests), build: green. "Lint, test, build" is a required check (ruleset 23821221) |

## Recent changes

Newest first. One line per merged PR: what changed for the user (or "no user-facing change"), the ledger ids it closed, and its version.

| PR | Change | Closes | Version |
| --- | --- | --- | --- |
| [#47](https://github.com/TrebleZee/studybox/pull/47) | "Undo merge" no longer disappears when another open tab only re-saves records this tab already has; fixes a flaky two-tab test | C14 | v1.18.1 |
| [#46](https://github.com/TrebleZee/studybox/pull/46) | Resetting the timer with time on it shows "Reset timer. Undo", which brings back the elapsed time, subject and timed topic | N22 | v1.18.0 |
| [#45](https://github.com/TrebleZee/studybox/pull/45) | Stored data that can't be read is left as it was, with a banner and a backup that carries it, instead of being silently replaced; a browser that blocks storage no longer stops the app starting | N16, N17 | v1.17.4 |
| [#44](https://github.com/TrebleZee/studybox/pull/44) | A coordinator can run the goal's lanes as separate full sessions (`orchestrate` skill), each on a model chosen by risk: Fable for the stored data model and merge, Opus for anything that can lose data and for every review, Sonnet for single-component fixes, Haiku for config. No user-facing change | none | none |
| [#43](https://github.com/TrebleZee/studybox/pull/43) | Scope review: closes C9, N13 and C7 in the ledger, adds N26, N27, N28 and C13, folds them into the A2/A3 lanes and sets a process budget. No user-facing change | none | none |
| [#42](https://github.com/TrebleZee/studybox/pull/42) | Undo of a delete or a merge now holds with a second tab or the installed app open, instead of being reverted in every tab | N8 | v1.17.3 |
| [#40](https://github.com/TrebleZee/studybox/pull/40) | Workflow for parallel sessions: one worktree per session, claims as draft PRs, the goal split into parallel lanes, versions set at merge time and merges one at a time. No user-facing change | none | none |
| [#41](https://github.com/TrebleZee/studybox/pull/41) | CI runs for commits on `master` are never cancelled by a newer push, so every merged commit is verified. No user-facing change | C7 (agent half) | none |
| [#39](https://github.com/TrebleZee/studybox/pull/39) | A backup or stored record with the wrong type of value in a name, colour, note or tag no longer crashes the app on every launch | N13 | v1.17.2 |
| [#37](https://github.com/TrebleZee/studybox/pull/37) | Phase A exit check (failed) and the A2/A3 re-plan. No user-facing change | none | none |
| [#38](https://github.com/TrebleZee/studybox/pull/38) | This status page, updated by every PR and readiness pass. No user-facing change | none | none |
| [#36](https://github.com/TrebleZee/studybox/pull/36) | Docs synced with the code; root `CLAUDE.md`; replacement Claude project instructions. No user-facing change | C4 | none |
| [#35](https://github.com/TrebleZee/studybox/pull/35) | Security headers (Content-Security-Policy and others) on every route of the live app | N4 | none |
| [#34](https://github.com/TrebleZee/studybox/pull/34) | Subjects with ids like `__proto__` no longer stop the app starting or corrupt Analysis totals | N6 | v1.17.1 |
| [#33](https://github.com/TrebleZee/studybox/pull/33) | A crash shows a fallback with "Download backup"; a full browser storage shows a banner instead of blanking the app | N3 | v1.17.0 |
| [#32](https://github.com/TrebleZee/studybox/pull/32) | Undo for deleting a subject, topic, milestone or session, and for Merge from file | N2, N7 | v1.16.0 |
| [#31](https://github.com/TrebleZee/studybox/pull/31) | Two open tabs merge each other's changes instead of overwriting them | N1 | v1.15.2 |
| [#30](https://github.com/TrebleZee/studybox/pull/30) | Readiness process: auditor and planner agents, findings ledger, Phase A/C goal. No user-facing change | none | none |
| [#29](https://github.com/TrebleZee/studybox/pull/29) | XP is derived from records, so it can't be farmed; lapsed streaks stop re-spending freezes | B4 | v1.15.1 |
| [#28](https://github.com/TrebleZee/studybox/pull/28) | Sync-safe records: UUID ids, edit stamps, tombstones, one merge for Merge from file | B3 | v1.15.0 |
| [#27](https://github.com/TrebleZee/studybox/pull/27) | Single store layer for all persistence. No user-facing change | B2 | none |
| [#26](https://github.com/TrebleZee/studybox/pull/26) | CI runs lint, tests and build on every PR and on `master` | B5 | none |
| [#25](https://github.com/TrebleZee/studybox/pull/25) | pdf.js upgraded to close a security advisory | B6 | v1.14.1 |

Older history: the GitHub releases and `git log`.

## Progress against the plan

From `docs/readiness/2026-10-05-scope-review.md` (which amends the Phase A exit check's plan; no dates moved).

| Phase | What | Dates | State |
| --- | --- | --- | --- |
| A | Stop losing data (N1, N2, N3, N4, N6, N7, C4) | 5 to 18 Oct | Done 5 Oct; exit check failed, re-planned as A2 and A3 |
| M | Maintainer: tags, N8 decision, plan approval, required CI | 6 to 9 Oct | Done 5 Oct |
| M2 | Maintainer: scope confirmation, B1/V1 check-in, device checks, design gate doc | 5 Oct to 6 Nov | Not started |
| A2 | Fix today's data loss (N11, N22, N21, N12, N15, N16, N17, N18, N20, N25, C10, C13; N26 and N27 docs) | 6 to 23 Oct | A2.1 (#39, v1.17.2), A2.2 (#41), A2.3 (#42, v1.17.3), A2.9 (#45, v1.17.4), A2.5 (#46, v1.18.0) and A2.3b (#47, v1.18.1) merged; A2.7 (#49, N12) ready for merge; every lane open except 9 |
| A3 | Sync-safe replacing and old clients (N10, N9, N19), then exit check | 26 Oct to 6 Nov | A3.2 (N9) open as #50, ready for the coordinator; A3.1 and A3.3 not started |
| B | Design-gate decisions (B1, now including Asana data, N27) and five-user feedback (V1) | check-in 15 Oct, decide 25 Oct | Maintainer's; no progress recorded |
| C | Shape the client for sync (record actions, record order, import bounds with N28, session local day N26, Asana tags N27) | 9 to 27 Nov | Blocked on the A3 exit check; V2-only branches also on the 25 Oct decision |
| G | Keyboard (C3 now includes the Asana row), offline PDF import, bundle size | 30 Nov to 11 Dec | Not started |
| D | Backend spike on test data | 30 Nov to 11 Dec | Ready by its gate; not before the B1 decision |
| E | v2.0.0 accounts and sync | 4 Jan to 30 Apr 2027 | Blocked on B1, V1 |

Open findings: 3 `high` (N9, N10, N11), 2 `blocker` (B1, V1). The full list is `docs/readiness/findings.md`.

## Needs actioning

### Maintainer

Tick an item off by deleting it in the next PR that touches this file, and note it under Recent changes if it changed anything.

| # | Action | Why | By |
| --- | --- | --- | --- |
| 1 | Confirm the scope answer: A2 and A3 continue; Phase C's V2-only branches (`feat/record-order`, `feat/session-local-day`) wait for the 25 Oct decision; no new process PRs until the 6 Nov exit check apart from C13 and C10 | 5 of the last 7 merged PRs were process or docs, while the V2 blockers haven't moved | 9 Oct |
| 2 | Paste `docs/project-instructions.md` into the Claude project's instructions | Agents can't edit project settings (C4 follow-up); not confirmed done | 9 Oct |
| 3 | B1/V1 check-in: write down which of the four decisions have an answer and how many users have been asked | If none has an answer by then, 25 Oct isn't credible and the plan should say so early | 15 Oct |
| 4 | On real devices: the installed PWA beside a browser tab (including a session timed in one and the other opened: it should say the session is being timed in another window, and Continue here should move it); reminders on an Android phone; a backup download on Safari or an iPhone | Not testable from a session (N1 check, N20, N25; N25 decides A2.12) | 23 Oct |
| 5 | The four design-gate decisions (data controller and account holder, minimum age and assurance, Online Safety Act scope, reminders for signed-in users), plus whether Asana task names may sit in account-scope session tags (keep, device-only or drop) | Gates the backend spike and 2.0 (B1); decides `fix/asana-session-tags` (N27) | 25 Oct |
| 6 | Five-user feedback round, including devices used and whether anyone wants friends features | Gates 2.0 and 2.x and sets N20's urgency (V1) | 25 Oct |
| 7 | Make the design gate doc (`claude/v2-design-gate.md`) available to the exit check | Missing for three passes, so B1's wording has never been checked against it | 6 Nov |
| 8 | Optional: turn off the Vercel Toolbar on preview deployments | Previews log one expected CSP error for it; production is unaffected | any time |
| 9 | Decide whether the timer Reset undo (#46) should survive an accidental restart: today pressing Start or Space after Reset withdraws the offer at once, so Undo can never overwrite a new session. Options: fold the new seconds into the restored session, or let Undo replace a session under a few seconds | Review finding R1 on #46 (`docs/reviews/feat-undo-timer-reset.md`); not in the goal, so not decided by an agent | any time |

### Agent (next steps)

Work the goal's **Parallel lanes**: one session per lane, each in its own worktree, claiming its item with a draft PR (git-workflow step 1). To run them as separate full sessions, a coordinator uses the `orchestrate` skill (at most 3 workers; the lanes table gives each one's model by risk). The maintainer's local session merges and tags; the cloud coordinator launches workers and starts each lane's next item as soon as its PR merges.

1. Lane 2: A2.4 `feat/undo-restore` (N11), then A3.1. C14 is fixed (#47, v1.18.1).
2. Lane 8: `chore/status-post-merge` (C13), merged on its own by 9 Oct.
3. Lane 1: A3.3 `fix/subtask-records` (N19) once A3.2 (#50) is live; A3.2's unknown-field and unknown-tombstone-kind carry-through is what lets an older build keep subtask stamps and `subtasks` tombstones.
4. Open now: A2.8 (lane 3, after #49 merges), A2.6 (lane 4), A2.11 (lane 5), A2.10 (lane 6), `chore/ignore-drafts` then `chore/document-known-gaps` (lane 7). Lane 9 (A2.12) after the Safari check.

## Known risks

- **Undo merge with two tabs open keeps the file's new records** (by decision). Records the merged file added come back from the other tab after Undo merge; everything that was here before is restored.
- **Restore from file has no undo** (N11). Picking the wrong backup replaces everything; restoring an old (pre-v3) backup also forgets what was deleted (N10).
- **Reminders may crash the app on Android** (N20, proven with a stub, not on a device).
- **A session in a killed app waits up to 3 minutes before another window picks it up** (by design, #49). If the installed app is swiped away mid-session and StudyBox is reopened within 3 minutes, the session shows as being timed in another window until then; **Continue here** takes it at once.
- **Continue here doesn't bring the timed topic** (#49). The note and tags move with the session; the topic logged with it is whichever one the continuing window has open.
- **Streaks can change after a timezone change** (N26). A trip abroad can shorten the shown streak, and occasionally lapse it.
- **The Asana task name is saved in the session's tags** (N27), and so in every backup.
- **A session with an invalid date can't be edited** (N28). Only hand-edited or foreign backups carry one.
- **Only builds from #50 on keep fields a newer build wrote** (N9). An install still on an older build strips them on its next write until it updates, so `feat/record-order` waits two weeks after #50 is live, and V2 sync will need a minimum client version.
- **Stored data that can't be read is kept only until the next change to it** (N16, by design). The app leaves it in storage and says so, with a backup that carries it as stored; the user's next change to that data replaces it.
