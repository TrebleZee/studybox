# Goal: stop losing data, then make replacing and old clients sync-safe (readiness Phases A2 and A3)

Close every finding the Phase A exit check found that loses, duplicates or misattributes a user's data today (Phase A2), then the sync-safety `high` rows that a merge or an older client would turn into loss (Phase A3), and re-run the exit check. Each item is its own branch, PR and, where it changes the shipped app, release. When done, no one-click action destroys a session or a whole profile without an undo, a poisoned or unreadable file or store never takes the app down, a timer is owned by one tab, and replacing data or running an older build never brings back or strips records. Everything stays local-first: no backend, no accounts, no network calls beyond the opt-in Asana API.

Readiness report: `docs/readiness/2026-10-05-phase-a-exit.md`, amended by the scope review `docs/readiness/2026-10-05-scope-review.md` (same phases and dates; adds C13, N26, N27 and N28 to the lanes below)
Findings ledger: `docs/readiness/findings.md`
Previous goal (Phase A shipped, Phase C re-planned): `docs/goals/2026-10-phase-a-c-harden-and-shape.md`

## Before anything (maintainer, Phase M)

Work may start on every lane in **Parallel lanes** below except where it says it waits. The maintainer has:

- [x] pushed tags `v1.17.0` (`42f6159`) and `v1.17.1` (`251deed`) and published their releases (C9). Until then, do not merge any `fix/` or `feat/` branch: its version would be computed from `v1.16.0`.
- [x] answered the N8 decision below and recorded it under "Decisions already made".
- [x] approved this plan (the previous goal's "stop and ask" applies to N9, N10 and N11).
- [x] made "Lint, test, build" a required check on `master` (ruleset 23821221; C7 closed).

Phase M2 (confirm the scope answer by 9 Oct, B1/V1 check-in 15 Oct, device checks 23 Oct, B1 and V1 by 25 Oct) is the maintainer's and is tracked in the scope-review report and `docs/STATUS.md`, not here. No agent branch in this goal waits for it except A2.12.

## Ground rules (apply to every branch)

1. **Use the `/git-workflow` skill for every branch.** Never commit to `master`. Work in your own worktree, check the item isn't claimed, branch off `origin/master` with the name given below and claim it with a draft PR at once; never reuse a branch name that already exists on `origin`. `fix/` is a patch bump, `feat/` a minor bump, `chore/` no bump and no tag. `feat/` branches go through the review gate before merging. Branches merge one at a time and set their version at merge time (skill step 4).
2. **Expected versions, if merged in plan order** (a forecast only: lanes run in parallel and merge in whatever order they finish, and the latest tag at merge time decides each version): A2.1 `v1.17.2` → A2.2 (no bump) → A2.3 `v1.17.3` → A2.4 `v1.18.0` → A2.5 `v1.19.0` → A2.6 `v1.19.1` → A2.7 `v1.19.2` → A2.8 `v1.19.3` → A2.9 `v1.19.4` → A2.10 `v1.19.5` → A2.11 `v1.19.6` → A2.12 `v1.19.7` (or skipped) → A3.1 `v1.19.8` → A3.2 `v1.19.9` → A3.3 `v1.19.10` → **exit check**. `chore/ignore-drafts`, `chore/status-post-merge` and `chore/document-known-gaps` are `chore/` (no bump) and can land any time; `chore/status-post-merge` should land first, by 9 Oct.
3. **Green before PR:** `npm run lint`, `npm test`, `npm run build` all pass locally and in CI. Never hand over a red branch. If a tag can't be pushed from the session, say so and give the maintainer the exact command; never route around a policy denial.
4. **Reproduce before fixing.** Every finding gets a failing test that shows the auditor's scenario first, then the fix. The audit's scratch tests may be gone; write the test in the repo. A finding marked "reasoned" in the ledger must be reproduced or disproved before any code changes; if disproved, close it as rejected and skip the branch.
5. **Conventions:** pure logic in `src/utils/*.js` or `src/store/*.js` with a sibling `*.test.js`; JSX in `src/components/*.jsx` with a sibling `*.test.jsx`. `App.jsx` gets smaller or stays the same size, never larger.
6. **Backwards compatibility is non-negotiable.** `localStorage` data written by v1.17.1 and every backup version (unversioned, v1, v2, v3) load with no loss. New fields are optional and defaulted in the normalizers.
7. **Sync-safe records stay sync-safe.** New records use `newId`; every edit stamps the record it changes with `touch`; every delete writes a tombstone; XP is only ever `deriveXP` plus `legacyXP`; nothing outside `src/store/` touches `localStorage`. Ids are untrusted strings, looked up by own key only.
8. **Onboarding guard:** `defaultSubjects()` returns the frozen A-level set and `isUntouchedDefaultSubjects` keeps detecting an untouched install. Keep or add a test in every branch that touches `subjects.js` or a normalizer.
9. **Containment is not closure.** A known limit written into `instruction.md` does not close a finding. Every README or `instruction.md` claim a branch makes true or false is corrected in that branch (the plan names the lines).
10. **Keep the ledger and docs current:** in the same PR, move the finding to Closed in `docs/readiness/findings.md` with the PR number and the test that proves it, and update `instruction.md` and `README.md` where behaviour changed.
11. **Do not touch** uncommitted changes in any checkout but your own worktree: they belong to the maintainer or another session.
12. Commits and PRs end with the attribution lines your environment specifies.

## Parallel lanes

Each lane is one session's queue: its branches run in order, because they share files. Different lanes don't share files, so they can run at the same time; each needs its own worktree. The files every PR edits (`docs/STATUS.md`, `docs/readiness/findings.md`, `instruction.md`, `README.md`) are handled by the git-workflow skill's merge step, not by lanes.

| Lane | Branches, in order | Main files | Waits for |
| --- | --- | --- | --- |
| 1. Normalizers and storage | A2.1 (done, #39) → A2.9 → A3.2 → A3.3 → Phase C: `fix/bound-imported-values` (N14, N28) | normalizers in `src/utils/`, `src/store/appState.js`, `localStore.js`, `usePersistedState.js`, `migrations.js`; N28 also `EditSessionModal.jsx` | nothing for A2.9. `fix/bound-imported-values` is Phase C and also waits for A2.6 (same modal) |
| 2. Undo and replacing data | A2.3 (#42) → A2.4 → A3.1 | `src/utils/undo.js`, `src/hooks/useUndoDelete.js`, Settings Backup & Restore, `Onboarding.jsx`, restore and onboarding handlers in `App.jsx` | #42 merging. A3.1 waits for A2.4 live, and for A3.2 if their normalizer changes overlap |
| 3. Timer and logging | A2.5 → A2.7 → A2.8 → Phase C: `fix/asana-session-tags` (N27) | `src/hooks/useTimer.js`, `TimerPanel.jsx`, `UndoBar.jsx`, `logSession` in `App.jsx` | A2.5 adds to the undo bar: while lane 2 is open, touch `useUndoDelete.js` only to add the timer case. `fix/asana-session-tags` waits for the 25 Oct B1 decision and is dropped if it says "keep" |
| 4. Session edit | A2.6 | `EditSessionModal.jsx` | nothing |
| 5. Reminders | A2.11 | `useStreakReminder.js`, `useMilestoneReminder.js` | nothing |
| 6. App update | A2.10 | `useAppUpdate.js`, `UpdateBanner.jsx`, `main.jsx` | nothing. It reads whether a timer, edit or undo is active; it doesn't change those |
| 7. Docs and repo chores | A2.2 (done, #41) → `chore/ignore-drafts` → `chore/document-known-gaps` | `.gitignore`, `instruction.md` (known limits, a new Asana section) | nothing |
| 8. Status page | `chore/status-post-merge` | `docs/STATUS.md`, `.claude/skills/git-workflow/SKILL.md`, `.claude/skills/readiness-pass/SKILL.md`, `src/statusDoc.test.js` | nothing. Merge it alone, by 9 Oct; PRs open at that point then sync and follow the new STATUS rule |
| 9. Safari backup | A2.12 | `src/utils/backup.js` (download only) | a reproduction on Safari or an iPhone (maintainer, 23 Oct) |

Lane 1's A2.9 starts once A2.1 has merged. The exit check (A3.4) runs once every lane is empty.

## Decisions already made (do not re-ask)

- Soft deletes are tombstones in `sb-tombstones`, not a `deletedAt` flag on records.
- Stamps are optional and normalizers never invent them; a missing `updatedAt` means "older than any real edit".
- Deleting a subject, a completed topic or a session removes its XP (v1.15.1); undo gives it back.
- Zero-behaviour-change restructures ship as `chore/`, not `refactor/`, because `v2.0.0` is reserved for accounts and sync.
- The Asana token stays in `localStorage` under its current key, behind the CSP in `vercel.json`.
- The running timer and the session draft are per-tab state, not reconciled across tabs (N12 makes that true rather than changing it).
- **Undo re-stamps the record it restores** (maintainer, 2026-10-05). This amends the previous goal's "undo puts the record back with its stamps unchanged": A2.3 and A2.4 go ahead as written.

---

# Phase A2: stop losing data today (6 to 23 Oct)

## A2.1 Field types in imported and stored data

**Branch:** `fix/normalize-field-types` · **Closes:** N13

**Build**

- Every normalizer coerces or drops a field of the wrong type: a non-string subject, topic, milestone or subtask `name`, session `subjectName`, `subjectColor`, `note`, a non-string tag, a non-array `topics` / `subtasks` / `tags`. A record that cannot be made valid (no usable name) gets a safe default, never crashes rendering.
- Start from the auditor's cases: an object as subject name, topic name, session `subjectName` and session tag.

**Done when**

- [ ] Restoring and merging a file with each wrong-type field leaves the app running, and the Log view opens (tests through the real Restore and Merge UI).
- [ ] The same values already in `sb-subjects` / `sb-sessions` let the app start and Log open (test).
- [ ] Valid v1, v2, v3 and v1.17.1 data normalizes byte-identically to before (test). Onboarding guard test passes.

## A2.2 CI runs on master are never cancelled

**Branch:** `chore/ci-master-runs` · **Closes:** C7 (agent half)

**Build**

- In `.github/workflows/ci.yml`, keep `cancel-in-progress` for pull requests but not for pushes to `master`, so every merged commit is verified.

**Done when**

- [ ] Two quick pushes to a PR still cancel; the workflow expression shows `master` runs are never cancelled (say how it was checked).
- [ ] The final report reminds the maintainer to make the check required (C7's other half).

## A2.3 Undo re-stamps what it restores

**Branch:** `fix/undo-restamps` · **Closes:** N8 · **Claimed:** draft #42

**Build**

- Undo of a delete stamps the restored record (`touch`) so it wins against the tombstone another tab has already merged; undo merge stamps every record it puts back. Remove the known limit from `instruction.md` and correct `README.md:13`.

**Done when**

- [ ] With a second idle tab, delete then undo leaves the record restored in both tabs and in storage after storage events are delivered (test, two-app harness as in `App.multiTab.test.jsx`).
- [ ] Undo merge with a second tab open restores the pre-merge records in both tabs (test).
- [ ] The existing single-tab undo tests still pass, updated only where they asserted unchanged stamps (say which).

## A2.4 Undo for Restore from file

**Branch:** `feat/undo-restore` · **Closes:** N11

**Build**

- Restore (Settings and Onboarding) keeps the pre-restore subjects, sessions, tombstones, game and theme in memory and offers "Undo restore" beside the success message until the next import or a reload, exactly like Undo merge.

**Done when**

- [ ] Restore then undo leaves every account key byte-identical to before (test), with a second tab open too if A2.3 shipped (test).
- [ ] The undo control is keyboard-reachable and announced.

## A2.5 Undo for timer Reset

**Branch:** `feat/undo-timer-reset` · **Closes:** N22

**Build**

- Reset of a timer with time on it shows the undo bar ("Reset timer. Undo"); undo restores the elapsed time, timed subject and topic, and the draft.

**Done when**

- [ ] Reset after 2 h then Undo shows the same elapsed time and subject, and Log Session stores the full session (test).
- [ ] Space on the undo bar never toggles the timer (test).

## A2.6 Editing a session keeps its seconds

**Branch:** `fix/edit-session-keeps-seconds` · **Closes:** N21

**Done when**

- [ ] Opening Edit on sessions of 45 s and 25m59s and saving unchanged leaves `[45, 1559]` (test).
- [ ] Changing hours or minutes still sets the new duration (test).

## A2.7 One tab owns the running timer

**Branch:** `fix/timer-single-owner` · **Closes:** N12

**Build**

- A tab opened while another tab's timer runs does not clone it into a second writer: either it shows the session as running elsewhere, or it never writes `sb-timer` until it starts its own. Pick the smaller change that makes the auditor's scenario impossible, and correct `README.md:52` and the per-tab sentence in `instruction.md` to match.

**Done when**

- [ ] The auditor's scenario (PWA timer, tab opened, session logged in the PWA, PWA reloads) stores exactly one session (test).

## A2.8 Logging a session whose subject was deleted

**Branch:** `fix/orphaned-timer-subject` · **Closes:** N15

**Done when**

- [ ] Timing Physics, deleting Physics (same tab, and another tab), then Log Session never stores the session under another subject; the user sees what happened and chooses (test for both paths).

## A2.9 Unreadable or blocked storage never costs data

**Branch:** `fix/guard-storage-reads` · **Closes:** N16, N17

**Build**

- One load path: a key whose stored text does not parse is kept untouched (never overwritten on mount) and reported, with the error boundary's raw backup still able to download it. `loadText` and `removeKey` survive storage that throws; the app runs in memory and says that nothing will be saved.

**Done when**

- [ ] Truncated `sb-subjects` / `sb-sessions` are still in storage, unchanged, after render, and the user is told (test).
- [ ] With every storage method throwing, the app starts and shows the not-saving message (test). `instruction.md`'s blocked-storage claim is now true.

## A2.10 Applying an update never reloads a busy tab

**Branch:** `fix/update-reload-guard` · **Closes:** N18

**Build**

- Reproduce first from `vite-plugin-pwa`'s register client. A tab that is mid-session, mid-edit or holding an undo offer is not reloaded when another tab applies the update; it shows the update banner instead. Correct `README.md:120` and `README.md:22` (the exit-check report cited `:116`; #38 moved the line).

**Done when**

- [ ] A `controlling` event in a busy tab does not reload it and shows the banner; in an idle tab it reloads as before (tests).

## A2.11 Reminders on Android

**Branch:** `fix/notification-android` · **Closes:** N20

**Build**

- Show reminders through `ServiceWorkerRegistration.showNotification` where `new Notification` is not allowed, and never let a reminder throw out of an effect.

**Done when**

- [ ] With a `Notification` constructor that throws "Illegal constructor", the app stays up and the reminder goes through the service worker (test, both reminder hooks).
- [ ] Listed in the final report as needing a check on a real Android phone.

## A2.12 Backup download on Safari

**Branch:** `fix/backup-download-revoke` · **Closes:** N25

**Build**

- Reasoned only: reproduce on Safari (desktop or iOS) or reject. If real, attach the anchor and revoke the object URL after the download has started.

**Done when**

- [ ] Reproduced and fixed with a test that the URL is revoked only after the click, or closed as rejected with the evidence.

## Alongside: the status page stops going stale on merge

**Branch:** `chore/status-post-merge` · **Closes:** C13 · **By 9 Oct, merged on its own**

**Build**

- `docs/STATUS.md` keeps only what is true once the PR that writes it has merged. Drop the facts that only become true afterwards (production sha, open PRs, "merge this PR", required-check state) or move them into a post-merge step of the git-workflow skill, and make the readiness-pass skill's step 4b match. The `findings.md` header follows the same rule.
- Extend `src/statusDoc.test.js` so it fails if those rows come back.

**Done when**

- [ ] `statusDoc.test.js` fails on a STATUS page that carries an "Open PRs" row or a production sha (say how it was checked), and passes on the new page.
- [ ] The git-workflow skill's step 2b and the readiness-pass skill's step 4b describe the same rule.

## Alongside: known gaps written down

**Branch:** `chore/document-known-gaps` · **Contains:** N26, N27 (docs only; closes neither)

**Build**

- `instruction.md` known limits: streaks, freezes and `lastStudyDate` are derived from session instants in the device's current timezone, so the same records can give a different streak after a timezone change or on another device (N26). No code change.
- A new `instruction.md` section for the Asana panel: what it reads, the `PUT` that marks a task complete in Asana, the `asana` pseudo-subject id on sessions, and that the selected task's name is copied into the session's tags, which are account scope and in every backup (N27). No code change.

**Done when**

- [ ] Both are in `instruction.md` and the N26 and N27 ledger rows point at them, still open.

## Alongside: `drafts/` is ignored again

**Branch:** `chore/ignore-drafts` · **Closes:** C10

**Done when**

- [ ] `git check-ignore -v drafts/x.json` matches `.gitignore` (say so in the PR).

---

# Phase A3: sync-safe replacing and old clients (26 Oct to 6 Nov)

## A3.1 Replacing data writes tombstones

**Branch:** `fix/replace-writes-tombstones` · **Closes:** N10 · **Only after A2.4 is live**

**Build**

- Restore, Start blank, Use template and Choose my subjects tombstone every record they remove, so a merge (another tab now, sync later) cannot bring it back. The untouched placeholder defaults must not count as the user's data: replacing them writes no tombstones a fresh device would push, and they are not written to storage before onboarding is dismissed, if that can be done without breaking the onboarding guard.

**Done when**

- [ ] The auditor's two-tab scenarios (restore, Start blank, Use template) end with only the replacing data in both tabs (tests).
- [ ] Undo restore still restores exactly, including removing the tombstones restore wrote (test).
- [ ] Restoring a pre-v3 file (no tombstones) keeps the current tombstones, and a merge afterwards does not bring deleted records back (test; the wider N10 from the scope review).
- [ ] Onboarding guard test passes.

## A3.2 Older builds never strip newer fields

**Branch:** `fix/preserve-unknown-fields` · **Closes:** N9

**Build**

- Normalizers keep fields they do not know on subjects, topics, milestones, subtasks and sessions (validated as JSON values, never used), so a record written by a newer build round-trips through this one unchanged. When `runMigrations` reports `newer`, the app does not rewrite keys it has not changed. Make the comment in `src/store/migrations.js` true.

**Done when**

- [ ] The auditor's scenario (sb-schema 4, `order`, `sharedWith`, topic `notes`, session `topicId`) keeps every unknown field in storage after mount and through backup, restore and merge (tests).
- [ ] Known fields of the wrong type are still coerced (A2.1 tests pass).

## A3.3 Subtasks merge as records

**Branch:** `fix/subtask-records` · **Closes:** N19 · **Only after A3.2 is live**

**Build**

- Subtasks get ids, optional stamps and tombstones like topics, and merge per subtask. Existing subtasks keep working with no visible change; the normalizer never invents stamps.

**Done when**

- [ ] The auditor's scenario (A adds a subtask offline, B ticks the topic) keeps both subtasks after merge, in both orders (test).
- [ ] Deleting a subtask on one copy is not undone by a merge with an older copy (test).

## A3.4 Exit check

Run the `readiness-pass` skill. Phase C (re-planned in the report for 9 to 27 Nov) starts only if it reports N8 to N13 and N19 closed with evidence and no new `high` or `critical`. If it finds one, that fix goes first as its own branch and the check re-runs.

---

## Stop and ask instead of guessing if

- A fix would drop, rename or re-type any stored field, change `defaultSubjects()` output, or change an existing record's id.
- A finding cannot be reproduced and cannot be disproved either.
- You are about to start a Phase C branch (`feat/record-order`, `feat/session-local-day`, `fix/asana-session-tags`, `fix/bound-imported-values`): those are not in this goal and wait for the A3.4 exit check, and the V2-only ones also for the 25 Oct decision.
- You are about to open a process or workflow PR this goal does not list. The scope review set a process budget until the 6 Nov exit check, unless a gap shipped unverified code or lost data.
- Anything needs a backend, an account, a new third-party service or a new runtime dependency.
- Lint, test or build cannot be made green without disabling a rule or skipping or weakening a test.
- The review gate returns `blocked`, or a critical or high finding is still open after two rounds.
- The exit check reports a new `high` or `critical` that is not a small, obvious fix.

## Final report

After A3.4, report:

- versions shipped, with PR links;
- each ledger id closed and the test that proves it;
- findings rejected and why;
- the exit-check verdict;
- `App.jsx` line count before and after;
- anything stashed under rule 11;
- tags that could not be pushed;
- what still needs the maintainer: B1 (including the Asana data question, N27) and V1 by 25 Oct, the design gate doc for the exit check, and the device checks (installed PWA beside a tab, Android reminders, iPhone backup);
- any deviation from this file.
