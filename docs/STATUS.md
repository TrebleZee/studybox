# StudyBox status

The one page to read to know where StudyBox is: what changed recently, how far through the plan it is, and what needs someone to act. It is kept current by the workflow. Every PR updates it (see the `git-workflow` skill, step 2b), and every readiness pass refreshes the progress section. It states only what is true once the PR that writes it has merged: tags, releases, production, open PRs and check state happen after the merge, so they live on GitHub and Vercel, not here (`git-workflow` step 4g). `src/statusDoc.test.js` fails if the version below disagrees with `package.json` or if one of those rows comes back.

Last updated: 2026-10-07

## Current state

| | |
| --- | --- |
| Current version | 1.19.10 |
| Current goal | `.claude/commands/goal.md`: Phase C1 (stop losing data, round 3) with Phase G (keyboard, focus, offline, size); Phase C2 follows |
| Readiness | A3.4 exit check passed on 2026-10-07: N8, N9, N10, N11, N12, N13 and N19 are closed and re-verified, and the pass opened only `low` rows (N30 to N34, C15). Backend spike on test data: ready by its gate, but not worth starting before the B1 answer. Accounts and sync (2.0): not ready. Social features (2.x): not ready. Open: 1 `high` (N26, re-rated from `medium`; its first step is the maintainer's choice of how the game syncs), 2 `blocker` (B1, V1). Report: `docs/readiness/2026-10-07-a3-exit.md` |

## Recent changes

Newest first. One line per merged PR: what changed for the user (or "no user-facing change"), the ledger ids it closed, and its version.

| PR | Change | Closes | Version |
| --- | --- | --- | --- |
| [#69](https://github.com/TrebleZee/studybox/pull/69) | Merge and Restore from file no longer overwrite, or leave out of their undo, a change another open tab saved while the file was being read | R1 (#66 review) | v1.19.10 |
| [#68](https://github.com/TrebleZee/studybox/pull/68) | Adding a subject from a spec PDF: a slow PDF read or catalogue load can no longer overwrite a newer upload or title choice, or refill the form after Clear | R2 (#66 review) | v1.19.9 |
| [#66](https://github.com/TrebleZee/studybox/pull/66) | Tests no longer fail at random under a loaded CPU: async test waits get a 10 s deadline. No user-facing change (test-only, so no tag) | none | none |
| [#67](https://github.com/TrebleZee/studybox/pull/67) | On a phone, the timer pane scrolls as a whole, so Log Session and the Hours list are reachable on short screens | N29 (follow-up) | v1.19.8 |
| [#65](https://github.com/TrebleZee/studybox/pull/65) | Version 1.19.7 for #63 and #64, which merged without one. No user-facing change | none | none |
| [#64](https://github.com/TrebleZee/studybox/pull/64) | On a phone, the undo bar and the update banner stack instead of overlapping, and the timer's tag row no longer gets clipped | N29 (follow-up) | v1.19.7 |
| [#63](https://github.com/TrebleZee/studybox/pull/63) | Every view is usable on a phone: the planner's columns stack, hover-only controls show on touch, and timer alerts are flagged when switching panes | N29 | v1.19.7 |
| [#62](https://github.com/TrebleZee/studybox/pull/62) | `instruction.md` documents two known gaps: streaks are rebuilt in the device's current timezone (N26), and the Asana panel copies a task's name into session tags (N27). No user-facing change | none (N26 and N27 stay open) | none |
| [#61](https://github.com/TrebleZee/studybox/pull/61) | The status page stops going stale on merge: it states only what is true once its PR has merged (no production sha, open PRs, tag or check-state rows), and the post-merge checks moved into the git-workflow skill. No user-facing change | C13 | none |
| [#55](https://github.com/TrebleZee/studybox/pull/55) | Restore from file, Start blank and templates write tombstones for what they replace, so another open tab (or a later merge) can no longer bring removed subjects, sessions, topics or subtasks back; restoring an old backup keeps this device's deletes | N10 | v1.19.6 |
| [#60](https://github.com/TrebleZee/studybox/pull/60) | `drafts/` is ignored again, so spec PDF text dumped by `draft-spec --dump-text` can't be committed by accident. No user-facing change | C10 | none |
| [#59](https://github.com/TrebleZee/studybox/pull/59) | Reminders work on Android: Chrome there no longer crashes the app when a streak or milestone reminder is due; reminders are shown through the service worker instead | N20 | v1.19.5 |
| [#58](https://github.com/TrebleZee/studybox/pull/58) | Editing a session keeps its seconds: saving without changing the hours or minutes no longer turns a 45 s session into 0 s (and 0 XP) or 25m59s into 25m | N21 | v1.19.4 |
| [#52](https://github.com/TrebleZee/studybox/pull/52) | Subtasks merge as records: a subtask added or deleted on one copy (another tab, or a merged file) is no longer lost or brought back when the other copy edits its topic | N19 | v1.19.3 |
| [#56](https://github.com/TrebleZee/studybox/pull/56) | Applying an update in one window never reloads another that is busy (a session timed there, an undo on offer, an open edit): it shows the update banner and reloads once idle | N18 | v1.19.2 |
| [#54](https://github.com/TrebleZee/studybox/pull/54) | A session whose subject was deleted (here, in another tab, or before undoing a Reset) is never logged under another subject: the timer says so and asks which subject to log it under | N15 | v1.19.1 |
| [#53](https://github.com/TrebleZee/studybox/pull/53) | Orchestration stops using Fable: Opus is the top tier and Critical work gets two independent reviews. No user-facing change | none | none |
| [#51](https://github.com/TrebleZee/studybox/pull/51) | Orchestration: the merger and the launcher can be separate sessions, and a lane is repurposed as soon as its PR merges. No user-facing change | none | none |
| [#48](https://github.com/TrebleZee/studybox/pull/48) | Restore from file can be undone: "Undo restore" puts back the subjects, sessions, game, theme and selection from before the restore | N11 | v1.19.0 |
| [#49](https://github.com/TrebleZee/studybox/pull/49) | With several tabs open, one tab owns the running timer: a tab opened mid-session no longer clones it, so a session logged in one tab can't come back as a duplicate after a reload | N12 | v1.19.0 |
| [#50](https://github.com/TrebleZee/studybox/pull/50) | Data written by a newer build is no longer stripped by an older one: unknown fields and tombstone kinds are kept, and nothing is rewritten on mount when a newer build wrote it. No user-facing change today | N9 | v1.19.0 |
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

From `docs/readiness/2026-10-07-a3-exit.md`. Phase A2/A3 finished about four weeks early, so everything after it is re-dated. Nothing merges from 1 May to 30 Jun 2027 (exam freeze).

| Phase | What | Dates | State |
| --- | --- | --- | --- |
| A | Stop losing data (N1, N2, N3, N4, N6, N7, C4) | 5 to 18 Oct | Done 5 Oct |
| M | Maintainer: tags, N8 decision, plan approval, required CI | 6 to 9 Oct | Done 5 Oct |
| A2 | Fix today's data loss (N11, N22, N21, N12, N15, N16, N17, N18, N20, C10, C13; N26 and N27 docs) | 6 to 23 Oct | Done 7 Oct, except A2.12 (N25, `fix/backup-download-revoke`), which waits for the Safari check and joins lane 1 |
| A3 | Sync-safe replacing and old clients (N10, N9, N19), then the A3.4 exit check | 26 Oct to 6 Nov | Done 7 Oct; exit check passed 7 Oct |
| M3 | Maintainer: scope confirmation, N32 decision, device checks, B1 and V1, design gate doc | 8 to 25 Oct | Not started; items below |
| C1 | Stop losing data, round 3 (N31, N33, N30, N14, N28; A2.12 after the Safari check) | 8 to 17 Oct | Not started; lanes 2 and 1 first |
| G | Keyboard, focus, offline PDF import, bundle size, dev dependencies (N34, C3, C8, C11, C12, C2, C6) | 8 to 31 Oct | Not started; runs in parallel with C1 and C2 |
| C2 | Thin the shell (restore rebuilds the game, record actions, Asana tags if B1 says so: C5 part 2, C1, N5 part 1, N27) | 18 Oct to 7 Nov | Not started; follows C1 in lane 2 |
| V | V2-only preparation (C5 part 1, N23, N24, N5 part 2, N26) | 27 Oct to 20 Nov | Gated on a "go" at the 25 Oct decision point; not agent work yet |
| B | Design-gate decisions (B1, including Asana data, N27, and how the game syncs, N26) and five-user feedback (V1) | check-in 15 Oct, decide 25 Oct | Maintainer's; no progress recorded |
| D | Backend spike on test data | 2 to 20 Nov | Ready by its gate; not before a B1 answer |
| E | v2.0.0 accounts and sync | 1 Dec 2026 to 30 Apr 2027 (beta go/no-go 1 Mar 2027) | Blocked on B1, V1 and a closed N26 |
| F | 2.x social features | not before 1 Jul 2027 | Blocked on 2.0 and on V1 showing demand |

Open findings: 1 `high` (N26), 2 `blocker` (B1, V1). The full list is `docs/readiness/findings.md`.

## Needs actioning

### Maintainer

Tick an item off by deleting it in the next PR that touches this file, and note it under Recent changes if it changed anything.

| # | Action | Why | By |
| --- | --- | --- | --- |
| 1 | Confirm the scope answer from the scope review (still unconfirmed), and the report's move of N23, N24 and C5 part 1 behind the 25 Oct decision | Agents can't confirm scope for you; those three Critical-tier branches are dropped if V2 doesn't go ahead | 9 Oct |
| 2 | Paste `docs/project-instructions.md` into the Claude project's instructions | Agents can't edit project settings (C4 follow-up); not confirmed done | 9 Oct |
| 3 | B1/V1 check-in: write down which of the four decisions have an answer and how many users have been asked | If none has an answer by then, 25 Oct isn't credible and the plan should say so early | 15 Oct |
| 4 | Subtask delete (N32): add an undo, or keep it as designed (then N32 closes as rejected with that reason) | `instruction.md` records the missing undo as deliberate, so an agent won't overturn it | 15 Oct |
| 5 | On real devices: the installed PWA beside a browser tab (a session timed in one and the other opened should say it is being timed in another window, and Continue here should move it; after a deploy, updating in one while the other is timing should show the banner there, not reload it); reminders on an Android phone (grant permission, have a streak at risk after 8pm or a milestone due within 3 days: the reminder should show once and the app must not crash; check what a tap does); the phone layout on an iPhone and an Android phone (see item 10); a backup download on Safari or an iPhone | Not testable from a session (N1 check, N20, N29, N25; N25 decides A2.12) | 23 Oct |
| 6 | The four design-gate decisions (data controller and account holder, minimum age and assurance, Online Safety Act scope, reminders for signed-in users); whether Asana task names may sit in account-scope session tags (keep, device-only or drop); and whether 2.0 syncs the game or derives it on the server from session local days | Gates the backend spike and 2.0 (B1); decides `fix/asana-session-tags` (N27) and `feat/session-local-day` (N26) | 25 Oct |
| 7 | Five-user feedback round, including devices used and whether anyone wants friends features | Gates 2.0 and 2.x (V1) | 25 Oct |
| 8 | Make the design gate doc (`claude/v2-design-gate.md`) available (commit it or paste it into the next pass) | Missing for four passes, so B1's wording has never been checked against it; the next pass needs it to check the 25 Oct answers | 25 Oct |
| 9 | Optional: turn off the Vercel Toolbar on preview deployments | Previews log one expected CSP error for it; production is unaffected | any time |
| 10 | Optional: decide whether the timer Reset undo (#46) should survive an accidental restart: today pressing Start or Space after Reset withdraws the offer at once, so Undo can never overwrite a new session. Options: fold the new seconds into the restored session, or let Undo replace a session under a few seconds | Review finding R1 on #46 (`docs/reviews/feat-undo-timer-reset.md`); not in the goal, so not decided by an agent | any time |

On the phone check in item 5: on a real phone (iPhone Safari and Android Chrome, in the browser and as the installed PWA), every view should fit without sideways scrolling, the top bar shouldn't be clipped, Log Session should be reachable with the address bar showing, focusing a field shouldn't zoom the page, and the planner's Subjects / Topics / Timer switch should work with a timer running, each pane scrolling to its last control. It has only been checked in emulated Chromium (N29).

### Agent (next steps)

Work the goal's **Parallel lanes**: one session per lane, each in its own worktree, claiming its item with a draft PR (git-workflow step 1). To run them as separate full sessions, a coordinator uses the `orchestrate` skill (at most 3 workers; the lanes table gives each one's model by risk). The maintainer's local session merges and tags; the cloud coordinator launches workers and starts each lane's next item as soon as its PR merges.

1. Phase C1 first, lanes 2 and 1, which hold the data-loss rows. Lane 2: `fix/external-remove-not-merged` (N31), then `fix/restore-quota-atomic` (N33). Lane 1: `fix/dedupe-imported-ids` (N30), then `fix/bound-imported-values` (N14, N28).
2. Add lane 3 (`fix/focus-after-delete` N34, then `fix/keyboard-topic-checkboxes` C3) or lane 5 (`fix/precache-pdf-worker` C12, `chore/code-split` C2, `chore/dev-deps` C6) as the third worker. Lane 4 (`fix/keyboard-file-inputs`, C8) runs alone and can go any time.
3. After C1.4, lane 1 continues with `fix/focus-management` (C11). `fix/backup-download-revoke` (A2.12) slots into lane 1 once the maintainer's Safari check lands (item 5).
4. Lane 2 then moves to Phase C2: `fix/restore-rebuilds-game`, `chore/record-actions`, and `fix/asana-session-tags` only if the 25 Oct answer asks for it.
5. Lane 6 (Phase V) does not start before a "go" on 25 Oct.

## Known risks

- **Undo merge with two tabs open keeps the file's new records** (by decision). Records the merged file added come back from the other tab after Undo merge; everything that was here before is restored.
- **Restore from file can be undone only until something changes** (N11 fixed by #48). Picking the wrong backup replaces everything; "Undo restore" brings it back until the next import, change or reload. With another tab open, records only the file had and a bigger streak from the file stay after Undo (both known limits by maintainer decision, 2026-10-05).
- **Reminders on Android are fixed only as far as a stub proves** (N20). They now go through the service worker where `new Notification` is refused, but nothing has run on a real phone, and tapping the notification may not focus the app (the generated service worker has no click handler).
- **A session in a killed app waits up to 3 minutes before another window picks it up** (by design, #49). If the installed app is swiped away mid-session and StudyBox is reopened within 3 minutes, the session shows as being timed in another window until then; **Continue here** takes it at once.
- **Continue here doesn't bring the timed topic** (#49). The note and tags move with the session; the topic logged with it is whichever one the continuing window has open.
- **Streaks can change after a timezone change** (N26). A trip abroad can shorten the shown streak, and occasionally lapse it.
- **The Asana task name is saved in the session's tags** (N27), and so in every backup.
- **A session with an invalid date can't be edited** (N28). Only hand-edited or foreign backups carry one. The same files can carry absurd durations, bonus XP or far-future edit stamps (N14); none is bounded yet.
- **A backup with two records sharing an id can lose one** (N30). Restore keeps both, but deleting one deletes both and Undo brings back only one; Merge from file would have collapsed them.
- **A Restore larger than the browser's storage can half-save** (N33). The new subjects and the deletes save but the new sessions do not; after a reload the old sessions show, and a later merge (another tab) can delete them. The "storage is full" banner shows when it happens.
- **Undo restore in one tab can bring the example subjects back in another** (N31). With two tabs open on the first-run screen, one restoring a file and the other taking it, Undo restore in the first leaves the example subjects stored in both.
- **After deleting something, Undo is far from the keyboard** (N34). Focus falls to the page and Undo is about ten Tab presses away; screen readers may not announce the undo bar. Topic and Asana tick boxes, Restore and Merge from file, and the Edit session dialog are also hard or impossible to use without a mouse (C3, C8, C11).
- **Subtask edits made on an older build can lose a merge** (N19, until every copy updates). Builds before #52 stamp the topic, not the subtask, so their tick or rename of a subtask a newer build has stamped can lose to the other copy in Merge from file or between tabs on different builds, and their delete of one comes back; builds before #50 also forget subtask deletes. Subtasks no newer build has touched follow their topic's stamp, as before #52.
- **Only builds from #50 on keep fields a newer build wrote** (N9). An install still on an older build strips them on its next write until it updates, so `feat/record-order` waits two weeks after #50 is live, and V2 sync will need a minimum client version.
- **A window kept open through an update runs the old version until it reloads** (#56, by design for N18). Updating in one window no longer reloads another that is mid-session, mid-edit or holding an undo; that window shows the update banner and reloads once it is idle. Until then, opening a subject from the catalogue there can fail to load (its file belongs to the old version); **Update now** fixes it.
- **Stored data that can't be read is kept only until the next change to it** (N16, by design). The app leaves it in storage and says so, with a backup that carries it as stored; the user's next change to that data replaces it.
- **The phone layout is verified only in emulated Chromium** (N29). Safari's address-bar and keyboard behaviour and the installed PWA's safe areas are unchecked until the real-phone check (Needs actioning 5). Inputs are 16px on narrow screens only, so a tablet wider than 720 px still zooms on focus.
