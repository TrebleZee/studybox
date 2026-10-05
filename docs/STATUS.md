# StudyBox status

The one page to read to know where StudyBox is: what changed recently, how far through the plan it is, and what needs someone to act. It is kept current by the workflow. Every PR updates it (see the `git-workflow` skill, step 2b), and every readiness pass refreshes the progress section. `src/statusDoc.test.js` fails if the version below disagrees with `package.json`.

Last updated: 2026-10-05

## Current state

| | |
| --- | --- |
| Current version | 1.17.2 |
| Latest tag on GitHub | v1.17.2 |
| Production | studybox-sigma.vercel.app, deployed from `master` @ `a9280f5` (1.17.1) |
| Current goal | `.claude/commands/goal.md`: Phases A2 and A3 |
| Readiness | Phase A exit check failed on 2026-10-05: four new `high` findings (N9, N10, N11, N13); N13 closed by #39. Report: `docs/readiness/2026-10-05-phase-a-exit.md` |
| Open PRs | [#41](https://github.com/TrebleZee/studybox/pull/41) CI runs on `master` are never cancelled (C7); [#40](https://github.com/TrebleZee/studybox/pull/40) make the workflow safe for parallel sessions |
| Checks on `master` | Lint, test (690 tests with #41), build: green. Every `master` run now completes (#41); CI is not a required check yet (C7) |

## Recent changes

Newest first. One line per merged PR: what changed for the user (or "no user-facing change"), the ledger ids it closed, and its version.

| PR | Change | Closes | Version |
| --- | --- | --- | --- |
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

From `docs/readiness/2026-10-05-phase-a-exit.md`. Dates are the plan's.

| Phase | What | Dates | State |
| --- | --- | --- | --- |
| A | Stop losing data (N1, N2, N3, N4, N6, N7, C4) | 5 to 18 Oct | Done 5 Oct; exit check failed |
| M | Maintainer: tags, N8 decision, plan approval, required CI | 6 to 9 Oct | Tags, N8 (undo may re-stamp) and plan approval done 5 Oct; required CI open |
| A2 | Fix today's data loss (N13, N8, N11, N22, N21, N12, N15, N16, N17, N18, N20, N25, C10, C7) | 6 to 23 Oct | A2.1 (N13) shipped in v1.17.2; A2.2 (C7, agent half) in #41 |
| A3 | Sync-safe replacing and old clients (N10, N9, N19), then exit check | 26 Oct to 6 Nov | Not started |
| B | Design-gate decisions (B1) and five-user feedback (V1) | by 25 Oct | Maintainer's; no progress recorded |
| C | Shape the client for sync (record actions, record order, import bounds) | 9 to 27 Nov | Blocked on the A3 exit check |
| G | Keyboard, offline PDF import, bundle size | 30 Nov to 11 Dec | Not started |
| D | Backend spike on test data | 30 Nov to 11 Dec | Blocked on B1 |
| E | v2.0.0 accounts and sync | 4 Jan to 30 Apr 2027 | Blocked on B1, V1 |

Open findings: 3 `high` (N9, N10, N11), 2 `blocker` (B1, V1). The full list is `docs/readiness/findings.md`.

## Needs actioning

### Maintainer

Tick an item off by deleting it in the next PR that touches this file, and note it under Recent changes if it changed anything.

| # | Action | Why | By |
| --- | --- | --- | --- |
| 1 | Make "Lint, test, build" a required status check on `master` (Settings → Branches → master → Require status checks) | CI is not required today; every `master` run now completes (#41), so this is the last half of C7 | 9 Oct |
| 2 | Paste `docs/project-instructions.md` into the Claude project's instructions | Agents can't edit project settings (C4 follow-up) | 9 Oct |
| 3 | On real devices: the installed PWA beside a browser tab; reminders on an Android phone; a backup download on an iPhone | Not testable from a session (N1 check, N20, N25) | 23 Oct |
| 4 | The four design-gate decisions: data controller and account holder, minimum age and assurance, Online Safety Act scope, reminders for signed-in users | Gates the backend spike and 2.0 (B1) | 25 Oct |
| 5 | Five-user feedback round, including how many use Android | Gates 2.x and sets N20's urgency (V1) | 25 Oct |
| 6 | Optional: turn off the Vercel Toolbar on preview deployments | Previews log one expected CSP error for it; production is unaffected | any time |

### Agent (next steps)

1. Merge #41 (no tag).
2. The rest of Phase A2 in goal order, starting with A2.3 `fix/undo-restamps` (N8).

## Known risks

- **Undo with two tabs open is unreliable** (N8). Undo works with one tab; with a second tab or the installed app open, the delete comes back.
- **Restore from file has no undo** (N11). Picking the wrong backup replaces everything.
- **Reminders may crash the app on Android** (N20, proven with a stub, not on a device).
