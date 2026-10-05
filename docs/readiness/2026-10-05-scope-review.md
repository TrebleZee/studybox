# StudyBox V2 readiness: 2026-10-05 (scope review)

Assessed at `master` @ `9b0ef43`, tag `v1.17.2`. Audit pass 1 ran at `b8d07fb` and pass 2 at `661e26a`. Pass 2 wins where they disagree. #40 (`9b0ef43`) changed no file under `src/`. Previous pass: 2026-10-05 (Phase A exit check, `docs/readiness/2026-10-05-phase-a-exit.md`). Findings are in `docs/readiness/findings.md`. The design gate doc (`claude/v2-design-gate.md`) was not available to this pass. This is the third pass in a row without it.

The maintainer asked whether the work is "staying on track and within scope". This pass does not re-plan. Phases A2 and A3 stand. The four new rows are folded into existing phases and lanes below.

## Verdict

- **Backend spike on test data: ready by its gate.** Baseline green, no open `critical`. Not scheduled before the B1 decision on 25 Oct, because the spike would otherwise test an account model nobody has chosen (gap 2).
- **Accounts and sync (2.0): not ready.** Open `high`: N9, N10, N11. Open `blocker`: B1, V1.
- **Social features (2.x): not ready.** 2.0 has not shipped, and there is no feedback evidence (V1).

**On track and within scope: on track against the plan and within V1 scope in code, but not on track towards V2.** The code adds no backend, origin or dependency, and the agents are executing the approved plan in order. The two blockers that decide whether V2 should be built at all (B1, V1) show no progress, though they are due in 20 days. Details are in the section below.

## Evidence

| Check | Result at `661e26a` (unchanged at `9b0ef43`) |
| --- | --- |
| Lint, tests, build | Pass. 690 tests in 53 files (674 in 49 at the exit check) |
| CI on `master` | Required: ruleset 23821221, "Lint, test, build", strict, no bypass. `master` runs are never cancelled (#41) |
| Production | 1.17.2, deployed from `661e26a` (GitHub deployments API) |
| Tags | `v1.17.0` (`42f6159`), `v1.17.1` (`251deed`), `v1.17.2` (`3fdd260`) on `origin`, releases published |
| Main bundle | 886.08 kB (gzip 262.05 kB), precache 82 entries |
| `App.jsx` | 599 lines (target 480). `AnalysisPanel.jsx` 1265, `TopicList.jsx` 653, `AsanaTasksPanel.jsx` 646 |
| `npm audit` | 9 findings, all dev-only. `--omit=dev`: 0 |
| Runtime dependencies | `react`, `react-dom`, `pdfjs-dist` only |
| Third-party origins | `app.asana.com` only (opt-in). `draft-spec.js`'s fetch is dev-only |
| Open PRs | #42 `fix/undo-restamps` (N8, draft). #43 this pass |

**Closed this pass:**

| ID | Closed by | Verification |
| --- | --- | --- |
| C9 | maintainer | All three 1.17.x tags are on `origin`, and their releases are published |
| N13 | #39 (v1.17.2) | Pass 2 re-ran it with wider wrong-type fields across subjects, papers, topics, game, tombstones, draft, timer and Asana stats. The app mounts and every view opens. One deliberate gap became N28 |
| C7 | #41 + ruleset 23821221 | `ci.yml` uses per-`run_id` concurrency for pushes and cancels in progress only for PRs, pinned by `src/ciWorkflow.test.js`. The ruleset requires the check, strict, with no bypass |

**Spot-checked closed rows that still hold:** C4, N4, N6, N3, N2, N7, N1 and B2 to B6. The merge fuzz ran 4000 pairs, including `__proto__` ids, with 0 failures.

**Changed:**
- **C3 is wider.** The Asana task row (`AsanaTasksPanel.jsx:369-372`) is mouse-only, so a keyboard user cannot pick an Asana task to time.
- **N8's ledger text was stale.** The maintainer's decision is recorded and the fix is in flight (#42), but the code still does not re-stamp.
- **N10 is wider.** Restoring a pre-v3 file wipes the current tombstones (`setTombstones(restored.tombstones ?? emptyTombstones())`).
- **N18 cites new lines.** It now points at `README.md:120` (was `:116`) and `README.md:22`.

**Still open, with evidence re-verified:** N5, N9, N10, N11, N12, N14, N15, N16, N17, N18, N19, N20, N21, N22, N23, N24, N25 (reasoned; needs iOS), B1, B7, C1, C2, C5, C6, C8, C10, C11, C12, V1.

**New this pass:**

| ID | Severity | Finding | Why it matters for V2 |
| --- | --- | --- | --- |
| N26 | medium | Streak, freezes and last study date are rebuilt from session UTC instants in the device's current timezone. Sessions store no local day | Two devices in different zones never agree on the game state, and a server leaderboard cannot reproduce it. In V1 it can lapse a streak after a timezone change |
| N27 | low | The selected Asana task's name is copied into session tags (account scope: backups now, sync later). The Asana panel, its `PUT` write-back and the `asana` pseudo-subject are undocumented | Third-party text in account data is a design gate question. It depends on B1's data controller answer |
| N28 | low | A session `date` string that is not a date is kept. Edit → Save throws and saves nothing, and the record sorts first | A record that cannot be edited would replicate under sync. It is the remaining hole in N13 |
| C13 | low | `docs/STATUS.md` is written before merge, so its post-merge facts (production sha, open PRs, required check) are false on `master` | The status page is how the maintainer tracks this plan. It was wrong twice in one day |

**Not filed** (recorded in coverage):
- `inferSpecCode` is quadratic on hostile PDF text: a 2.7 MB file froze the main thread for about 59 s, with no data loss.
- Asana responses are not type-checked.
- `isRecordId` accepts finite numbers.
- Analysis charts expose their values only through `title` tooltips.

## On track and within scope

**Within scope (V1, local-first): yes.**
- There is no backend, account or new runtime dependency.
- The only third-party origin is the opt-in Asana API.
- Every view maps onto `instruction.md` and the README.
- Every branch in the goal maps onto an open ledger row.

There is one qualification. N27 shows that the existing Asana integration writes to a third party (task completion) and copies third-party text into account-scope data, and none of this is documented. This is not new scope creep, but it is an unrecorded data flow, and V2 would inherit it. It belongs in B1's answer.

**On track against the plan: yes, ahead.**
- Phase M was due 6 to 9 Oct and finished on 5 Oct: tags, the N8 decision, plan approval and the required check. The only item not confirmed is pasting `docs/project-instructions.md` into the Claude project.
- A2.1 (#39) and A2.2 (#41) merged on day 0, and A2.3 is in flight (#42).
- No `high` opened this pass, and the baseline is green.

**On track towards V2: not shown.**
- B1 (four decisions) and V1 (five-user feedback) are the critical path to 2.0 and are due 25 Oct. Nothing in the repo shows either has started.
- 5 of the last 7 merged PRs are process or docs: #36, #37, #38, #40, #41. #35 added headers, and only #39 changed app code.
- The plan is being executed well. But after A3 it keeps building sync prerequisites (record order, record actions, session local day) for a V2 whose demand (V1) and legal shape (B1) are unknown.
- Agent speed does not move the 2.0 date.

**What changes as a result:**
1. **A2 continues unchanged.** Every A2 row loses or misattributes data today, so each is worth doing whether or not V2 happens.
2. **A3 continues.** N10 and N19 lose or resurrect data with two tabs today. N9 is mainly a V2 risk, but it is small and is the prerequisite for any new field.
3. **Phase C's V2-only branches wait for the 25 Oct decision.** These are `feat/record-order` and `feat/session-local-day`. If V1 or B1 says V2 does not go ahead, they are dropped. Phase C's V1 bug fixes go ahead regardless.
4. **Process budget.** After `chore/status-post-merge` (C13) and `chore/ignore-drafts` (C10), no new process or workflow PR until the 6 Nov exit check. The exception is a pass showing that a process gap shipped unverified code or lost data.
5. **15 Oct check-in on B1 and V1** (maintainer). If none of the four B1 decisions has an answer by then, 25 Oct is not credible, and the plan says so at that point rather than on the day.

## Gaps in the premise

1. **The critical path is a decision and evidence, not code.** B1 and V1 are due 25 Oct and show no progress. The agents finished Phase M's dependencies and two A2 branches on day 0. None of that moves 2.0, Phase D or Phase E.
2. **The open blockers make Phases C (V2-only branches), D, E and F speculative.**
   - Phase C's V2-only branches: `feat/record-order` and `feat/session-local-day`.
   - Phase D: the spike's access rules depend on B1's account holder and minimum age.
   - Phase E: it depends on B1 entirely.
   - Phase F: it depends on V1.
   - Decision point: 25 Oct, with an interim check on 15 Oct.
3. **The previous plan's dates held or beat their targets.**
   - Phase M finished 1 to 4 days early.
   - A2 started 1 day early, with A2.1 and A2.2 merged.
   - Dates are kept rather than pulled forward. Last time speed came with misses (Phase A's failed exit test), and nothing downstream can start earlier because Phase C now waits on 25 Oct anyway.
4. **Coverage is still narrow.**
   - **Real devices: none.** No installed PWA beside a tab, no Android (N20 is stub-proven) and no iOS (N25 is reasoned).
   - **Accessibility: partial.** No screen-reader or contrast pass.
   - **Catalogue content: unchecked.** Correctness was not checked against the board PDFs.
   - **Privacy: partial.** N27 covers Asana tags. Reminder text on lock screens and cached Asana data in `sb-asana-stats` were not assessed.
   - **Performance: partial.** Low-end devices were only touched by the unfiled `inferSpecCode` note.
   - **Design gate: unavailable** for the third pass running, so B1's wording is still unchecked against its source.
   - **The parallel-lane workflow** introduced by #40 was audited only through its STATUS side effect (C13).
5. **Closed versus contained.**
   - C7 is closed: both halves are verified.
   - C9 is closed.
   - N13 is closed for crashes, but it deliberately kept bad date strings, now N28.
   - N8 is not closed. A recorded decision is not a fix. The ledger had blurred this by saying "needs the maintainer" after the maintainer had answered.
   - C13 shows that "STATUS is kept current" was containment by convention, not a mechanism.
6. **The lanes overlap more than the table says.**
   - Lane 2 (restore and onboarding handlers) and lane 3 (`logSession`) both edit `App.jsx`, in different places, which the lane rule allows.
   - Lane 3's A2.5 also edits `useUndoDelete.js`, which lane 2 owns.
   - N27's fix and A2.8 both change `logSession`, so N27 joins lane 3, not a new lane.
7. **N26's severity may be understated for V2.** It is `medium` because a student's devices are usually in one zone. If 2.0 syncs `sb-game` as data rather than deriving it on the server from session local days, devices in different zones never converge, which is a sync-correctness failure. The 2.0 design must pick one; otherwise N26 should be re-rated `high` at the next pass.
8. **N27 is a design gate question filed as a `low`.** It should be answered as part of B1 (data controller, what account data may contain), not as a separate later decision.
9. **My own verdict on scope has limits.** It rests on the code, `instruction.md` and the goal, without the design gate doc. I cannot check that A3 and Phase C are not building something the gate already ruled out. Counting docs PRs as overhead is also unfair in part, because #36 and #38 were asked for by the maintainer.

## Plan

Phases A2 and A3 and their dates are unchanged. Versions are counted from `v1.17.2` and are a forecast: lanes merge in whatever order they finish, and the latest tag at merge time decides each version.

### Phase M2: maintainer, 5 Oct to 6 Nov (theirs)

Exit test: each item below is recorded in the repo (goal file, ledger or a dated note) by its date.

| Item | Ledger | By |
| --- | --- | --- |
| Confirm the scope answer in this report: A2 and A3 continue, Phase C's V2-only branches wait for 25 Oct, process budget until 6 Nov | none | 9 Oct |
| Paste `docs/project-instructions.md` into the Claude project (carried from A6; not confirmed) | C4 follow-up | 9 Oct |
| B1 and V1 check-in: write down which B1 decisions have an answer and how many users have been asked | B1, V1 | 15 Oct |
| Reproduce the backup download on Safari or an iPhone, or say it works (decides A2.12) | N25 | 23 Oct |
| By hand: two tabs plus the installed PWA; reminders on an Android phone | N1 check, N20 | 23 Oct |
| B1's four decisions, plus Asana data in account scope (keep, device-only or drop) | B1, N27 | 25 Oct |
| Five-user feedback round, including devices used (Android share) and whether anyone wants friends features | V1 | 25 Oct |
| Make the design gate doc available to the exit check (commit it or paste it into the session) | B1 | 6 Nov |

**Decision point, 25 Oct:**
- If B1 has no answer, Phase D tests only a generic model, Phase E does not start, nothing with sign-up ships, and `feat/record-order` and `feat/session-local-day` do not start.
- If V1 does not show demand for sync, Phase E is re-scoped or dropped, and those two branches are dropped.
- If the feedback does not ask for friends, Phase F is dropped.

### Phase A2: stop losing data today, 6 to 23 Oct (unchanged dates)

Exit test (unchanged): for each row, the auditor's scenario reproduces on `master` before the branch and fails to reproduce after it, in a test on `master`. No one-click action destroys a logged or unlogged session or a whole profile without an undo.

| # | Branch | Closes | Version | State |
| --- | --- | --- | --- | --- |
| A2.1 | `fix/normalize-field-types` | N13 | v1.17.2 | merged #39 |
| A2.2 | `chore/ci-master-runs` | C7 | none | merged #41 |
| A2.3 | `fix/undo-restamps` (corrects `README.md:13`) | N8 | v1.17.3 | draft #42 |
| A2.4 | `feat/undo-restore` | N11 | v1.18.0 | |
| A2.5 | `feat/undo-timer-reset` | N22 | v1.19.0 | |
| A2.6 | `fix/edit-session-keeps-seconds` | N21 | v1.19.1 | |
| A2.7 | `fix/timer-single-owner` (corrects `README.md:52`, `instruction.md` per-tab claim) | N12 | v1.19.2 | |
| A2.8 | `fix/orphaned-timer-subject` | N15 | v1.19.3 | |
| A2.9 | `fix/guard-storage-reads` | N16, N17 | v1.19.4 | |
| A2.10 | `fix/update-reload-guard` (corrects `README.md:120` and `:22`; the goal still says `:116`) | N18 | v1.19.5 | |
| A2.11 | `fix/notification-android` | N20 | v1.19.6 | |
| A2.12 | `fix/backup-download-revoke` (or rejected after the 23 Oct reproduction) | N25 | v1.19.7 | |
| new | `chore/status-post-merge`: drop post-merge facts (production sha, open PRs, "merge this PR") from STATUS or move them to a post-merge step in the git-workflow skill; extend `src/statusDoc.test.js` to fail on them. Land by 9 Oct, merged on its own, so every later PR follows the new rule | C13 | none | |
| alongside | `chore/ignore-drafts` | C10 | none | |
| new | `chore/document-known-gaps`: a known-limits line in `instruction.md` for timezone-derived streaks, and documentation of the Asana panel, its `PUT` write-back and the `asana` pseudo-subject. Contains N26 and N27, closes neither. Both are `instruction.md`-only with no code, so one PR. By 16 Oct | N26, N27 (docs) | none | |

### Phase A3: sync-safe replacing and unknown fields, then re-check, 26 Oct to 6 Nov (unchanged dates)

Exit test (unchanged): a readiness pass on `master` reports N8 to N13 and N19 closed with evidence, and no new `high` or `critical`.

| # | Branch | Closes | Version |
| --- | --- | --- | --- |
| A3.1 | `fix/replace-writes-tombstones` (after A2.4 is live). **Add to Done when:** restoring a pre-v3 file (no tombstones) keeps the current tombstones, and a merge afterwards does not bring deleted records back | N10 | v1.19.8 |
| A3.2 | `fix/preserve-unknown-fields` | N9 | v1.19.9 |
| A3.3 | `fix/subtask-records` (after A3.2) | N19 | v1.19.10 |
| A3.4 | readiness pass (`chore/readiness-<date>`) | none | none |

### Parallel lanes (A2, A3 and the Phase C follow-ons that share their files)

| Lane | Branches, in order | Main files | Waits for |
| --- | --- | --- | --- |
| 1. Normalizers and storage | A2.1 (done) → A2.9 → A3.2 → A3.3 → C: `fix/bound-imported-values` (N14, N28) | normalizers in `src/utils/`, `src/store/appState.js`, `localStore.js`, `usePersistedState.js`, `migrations.js`; N28 also `EditSessionModal.jsx` | nothing for A2.9. `fix/bound-imported-values` also waits for A2.6 (same modal) |
| 2. Undo and replacing data | A2.3 (#42) → A2.4 → A3.1 | `src/utils/undo.js`, `useUndoDelete.js`, Settings Backup & Restore, `Onboarding.jsx`, restore and onboarding handlers in `App.jsx` | #42 merging. A3.1 waits for A2.4 live and for A3.2 if their normalizer changes overlap |
| 3. Timer and logging | A2.5 → A2.7 → A2.8 → C: `fix/asana-session-tags` (N27, only if B1 says device-only or drop) | `useTimer.js`, `TimerPanel.jsx`, `UndoBar.jsx`, `logSession` in `App.jsx` | A2.5: while lane 2 is open, touch `useUndoDelete.js` only to add the timer case. N27 fix waits for the 25 Oct decision |
| 4. Session edit | A2.6 | `EditSessionModal.jsx` | nothing |
| 5. Reminders | A2.11 | `useStreakReminder.js`, `useMilestoneReminder.js` | nothing |
| 6. App update | A2.10 | `useAppUpdate.js`, `UpdateBanner.jsx`, `main.jsx` | nothing |
| 7. Docs and repo chores | `chore/ignore-drafts` → `chore/document-known-gaps` | `.gitignore`, `instruction.md` (known limits, a new Asana section) | nothing |
| 8. Status page | `chore/status-post-merge` | `docs/STATUS.md`, `.claude/skills/git-workflow/SKILL.md`, `.claude/skills/readiness-pass/SKILL.md`, `src/statusDoc.test.js` | nothing. Merge alone by 9 Oct; open PRs then rebase their STATUS edit |
| 9. Safari backup | A2.12 | `src/utils/backup.js` (download only) | maintainer reproduction, 23 Oct |

### Phase C: shape the client for sync, 9 to 27 Nov (dates unchanged; starts after the 6 Nov exit check)

The V2-only branches are gated on the 25 Oct decision point as well.

Exit test (unchanged): `changedSince(state, t)` returns exactly the records changed by a scripted action sequence. `App.jsx` is under 480 lines. Three copies converge on the same order. New: any branch that did not start because of the 25 Oct decision is listed as dropped in the next pass.

| # | Branch | Closes | Version | Gate |
| --- | --- | --- | --- | --- |
| 17 | `chore/record-actions` | C1, N5 (first half) | none | exit check |
| 18 | `fix/bound-imported-values` | N14, N28 | v1.19.11 | exit check, A2.6 |
| 19 | `fix/idless-merge-ids` | C5 (part 1) | v1.19.12 | exit check |
| 20 | `fix/restore-rebuilds-game` | C5 (part 2) | v1.19.13 | exit check |
| 21 | `fix/freezes-from-dates` | N23 | v1.19.14 | exit check |
| 22 | `fix/template-topic-ids` (stop and ask if it would change an existing id) | N24 | v1.19.15 | exit check |
| 23 | `fix/asana-session-tags` (or close N27 as kept) | N27 | v1.19.16 | B1 answer |
| 24 | `feat/record-order` | N5 (second half) | v1.20.0 | 25 Oct go, N9 live 14 days (about 20 Nov) |
| 25 | `feat/session-local-day` (optional session field) | N26 | v1.21.0 | 25 Oct go, N9 live. May slip into Phase G's window |

### Phase G: keyboard, offline and size, 30 Nov to 11 Dec (dates unchanged)

Exit test (unchanged, plus the Asana row): restore, merge, every tick box and toggle, and picking an Asana task work with Tab, Space and Enter only. PDF import works offline after one online load. The main chunk is under 500 kB, asserted in CI.

| # | Branch | Closes | Version |
| --- | --- | --- | --- |
| 26 | `fix/precache-pdf-worker` | C12 | v1.21.1 |
| 27 | `chore/code-split` | C2 | none |
| 28 | `fix/keyboard-file-inputs` | C8 | v1.21.2 |
| 29 | `fix/keyboard-topic-checkboxes` (now including the Asana task row) | C3 | v1.21.3 |
| 30 | `fix/focus-management` | C11 | v1.21.4 |
| 31 | `chore/dev-deps` | C6 | none |

### Phases D, E, F (unchanged dates, now explicitly gated)

- **Phase D, the backend spike:** 30 Nov to 11 Dec, outside the repo, only after a B1 answer.
- **Phase E, v2.0.0 accounts and sync:** 4 Jan to 30 Apr 2027. Gated on B1 and V1, and needs a minimum-client-version rule and a B7 decision. The design must settle N26 (server-derived game from session local days). Beta go/no-go decision point: 1 Mar 2027.
- **Phase F, 2.x social:** from 2.0's release, not before July 2027, and only if V1 asks for it.
- Nothing lands from 1 May to 30 Jun 2027 (exam freeze).

### Running alongside

- `exam-dates-2028.json`: January 2027.
- Catalogue Wave 3: before 1 May 2027.
- Exam freeze: 1 May to 30 Jun 2027, no merges to `master`.

## Found after the audit

While this pass's branch was merged with `master` after #42 (`e316a41`, N8, v1.17.3), the full suite failed once in `src/App.multiTab.test.jsx` "undo merge with a second tab open > restores every pre-merge record in both tabs", then passed and failed intermittently in isolated runs (1 in 5, then 1 in 1). This branch changes only docs, so the flake is on `master`. It is opened as **C14 (medium)**: "Lint, test, build" is now a required check, so a flaky test blocks unrelated PRs at random, and the likely cause (tab B's write-back withdrawing the Undo merge offer) may also mean Undo merge is unreachable in real use with a second tab open. It goes first in lane 2, as `fix/undo-merge-offer-two-tabs`, before A2.4. Reproduce it first. Fix the product if the offer really disappears, or the test if only the timing is wrong. Never weaken the assertion.

## Changes from the previous plan

- **Phase M is done**, 1 to 4 days early: C9 tags and releases, the N8 decision, plan approval, and the C7 required check (ruleset 23821221). The project-instructions paste is carried into the new Phase M2.
- **Phase M2 is new.** It holds the scope confirmation (9 Oct), a B1/V1 check-in (15 Oct) and the design gate doc for the exit check (6 Nov). It also carries the device checks (23 Oct) and B1/V1 (25 Oct). B1 now explicitly includes the Asana data question (N27).
- **A2.1 and A2.2 shipped** (#39 v1.17.2, #41). A2.3 is #42.
- **A2 gains two chores:**
  - `chore/status-post-merge` (C13, lane 8, by 9 Oct).
  - `chore/document-known-gaps` (N26 and N27 docs, lane 7, by 16 Oct). It contains N26 and N27 but closes neither.
- **A2.10 corrects the lines it cites:** `README.md:120` and `:22`, not `:116`.
- **A3.1 gains a Done-when case:** restoring a pre-v3 file must keep the current tombstones (wider N10).
- **The goal's lanes table gains:**
  - lane 8 (status page) and the renumbered lane 9 (Safari backup);
  - Phase C follow-ons on lanes 1 (`fix/bound-imported-values` with N28) and 3 (`fix/asana-session-tags`);
  - an explicit note that lane 3's A2.5 touches lane 2's `useUndoDelete.js`.
- **Phase C changes:**
  - It gains N28 (folded into `fix/bound-imported-values`), `fix/asana-session-tags` (N27, conditional) and `feat/session-local-day` (N26).
  - `feat/record-order` and `feat/session-local-day` are now also gated on the 25 Oct decision. They are dropped if V2 does not go ahead.
- **Phase G:** C3 now includes the Asana task row. Its versions shift from v1.20.x to v1.21.x because of the new Phase C minor.
- **No dates moved.** The plan is ahead on code, and the 2.0 date is decided by B1 and V1, not by agent throughput.
