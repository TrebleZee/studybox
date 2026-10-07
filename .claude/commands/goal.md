# Goal: stop losing data, round 3, with keyboard, focus, offline and size fixes (readiness Phases C1 and G)

Close the findings the A3.4 exit check opened that lose or corrupt a user's data today (N31, N33, N30, plus N14 and N28), in Phase C1, and in parallel make every control reachable by keyboard, keep PDF import working offline and bring the main bundle under 500 kB (Phase G). Phase C2 (thin the shell, rebuild the game on restore, Asana tags) follows. Each item is its own branch, PR and, where it changes the shipped app, release. When done, restoring, merging and importing a file can never duplicate, half-save or poison records, no one-click delete leaves a keyboard user stranded, and the app opens and installs lighter. Everything stays local-first: no backend, no accounts, no network calls beyond the opt-in Asana API. Phase V (V2-only preparation) is gated on the maintainer's 25 Oct decision and is not agent work yet.

Readiness report: `docs/readiness/2026-10-07-a3-exit.md` (the A3.4 exit check: passed)
Findings ledger: `docs/readiness/findings.md`
Previous goal (Phases A2 and A3, shipped): `docs/goals/2026-10-a2-a3-stop-losing-data.md`

## Before anything

Work may start on every lane in **Parallel lanes** below except where it says it waits. The maintainer's items (Phase M3 in the report: scope confirmation, the N32 subtask-undo decision, device checks, the B1 decisions and the user feedback round) are tracked in the report and `docs/STATUS.md`, not here. No agent branch in this goal waits for them except A2.12 (the 23 Oct Safari check) and C2.3 (the 25 Oct B1 answer).

## Ground rules (apply to every branch)

1. **Use the `/git-workflow` skill for every branch.** Never commit to `master`. Work in your own worktree, check the item isn't claimed, branch off `origin/master` with the name given below and claim it with a draft PR at once; never reuse a branch name that already exists on `origin`. `fix/` is a patch bump, `feat/` a minor bump, `chore/` no bump and no tag. `feat/` and `refactor/` branches go through the review gate before merging. Branches merge one at a time and set their version at merge time (skill step 4).
2. **Expected versions, counted from `v1.19.10` and merged in plan order** (a forecast only: lanes run in parallel and merge in whatever order they finish, and the latest tag at merge time decides each version): C1.1 `v1.19.11` → C1.2 `v1.19.12` → C1.3 `v1.19.13` → C1.4 `v1.19.14` → G.1 `v1.19.15` → G.2 `v1.19.16` → G.3 `v1.19.17` → G.4 `v1.19.18` → G.5 `v1.19.19` → C2.1 `v1.19.20` → C2.3 `v1.19.21` (A2.12 takes the next patch when it lands). G.6, G.7 and C2.2 are `chore/` (no bump). Nothing merges from 1 May to 30 Jun 2027 (exam freeze).
3. **Green before PR:** `npm run lint`, `npm test`, `npm run build` all pass locally and in CI. Never hand over a red branch. If a tag can't be pushed from the session, say so and give the maintainer the exact command; never route around a policy denial.
4. **Reproduce before fixing.** Every finding gets a failing test that shows the scenario in `docs/readiness/findings.md` first, then the fix. The audit's scratch tests are gone; write the test in the repo. A finding marked "reasoned" in the ledger must be reproduced or disproved before any code changes; if disproved, close it as rejected and skip the branch.
5. **Conventions:** pure logic in `src/utils/*.js` or `src/store/*.js` with a sibling `*.test.js`; JSX in `src/components/*.jsx` with a sibling `*.test.jsx`. `App.jsx` gets smaller or stays the same size, never larger (it is 595 lines; the target is 480).
6. **Backwards compatibility is non-negotiable.** `localStorage` data written by v1.19.10 and every backup version (unversioned, v1, v2, v3) load with no loss. New fields are optional and defaulted in the normalizers.
7. **Sync-safe records stay sync-safe.** New records use `newId`; every edit stamps the record it changes with `touch`; every delete writes a tombstone; XP is only ever `deriveXP` plus `legacyXP`; nothing outside `src/store/` touches `localStorage`. Ids are untrusted strings, looked up by own key only.
8. **Onboarding guard:** `defaultSubjects()` returns the frozen A-level set and `isUntouchedDefaultSubjects` keeps detecting an untouched install. Keep or add a test in every branch that touches `subjects.js` or a normalizer. Placeholder subjects are never stored (N10).
9. **Containment is not closure.** A known limit written into `instruction.md` does not close a finding. Every README or `instruction.md` claim a branch makes true or false is corrected in that branch.
10. **Keep the ledger and docs current:** in the same PR, move the finding to Closed in `docs/readiness/findings.md` with the PR number and the test that proves it, and update `instruction.md` and `README.md` where behaviour changed.
11. **Do not touch** uncommitted changes in any checkout but your own worktree: they belong to the maintainer or another session.
12. **Models:** each session runs the model its lane names, by the `orchestrate` skill's risk tiers. Every Standard or Mechanical branch still gets an Opus `release-reviewer` pass; reviews always run on Opus. No Fable (no usage credits). Workers stop at a ready PR; only the coordinator merges.
13. Commits and PRs end with the attribution lines your environment specifies.

## Parallel lanes

Each lane is one session's queue: its branches run in order, because they share files. Different lanes don't share files, so they can run at the same time (with the stated exceptions); each needs its own worktree. The files every PR edits (`docs/STATUS.md`, `docs/readiness/findings.md`, `instruction.md`, `README.md`) are handled by the git-workflow skill's merge step, not by lanes.

| Lane | Branches, in order | Main files | Waits for | Model (tier) |
| --- | --- | --- | --- | --- |
| 1. Import and normalizers | `fix/dedupe-imported-ids` (N30) → `fix/bound-imported-values` (N14, N28) → `fix/focus-management` (C11) → `fix/backup-download-revoke` (N25, slotted in after whichever branch is running when the 23 Oct check lands) | `src/utils/backup.js` (`parseBackup`; `downloadBackup` for A2.12), session and subject normalizers in `src/utils/subjects.js`, `EditSessionModal.jsx`, `appCss.js` (C11 outlines). N30 must not edit `undo.js` or `App.jsx` | Nothing for N30. C11 waits for N28 (same modal). A2.12 waits for the maintainer (23 Oct) | N30 `claude-opus-5-5` (High); N14/N28 `claude-opus-5-5` (High); C11 `claude-sonnet-5-5` (Standard); A2.12 `claude-sonnet-5-5` (Standard) |
| 2. Store and `App.jsx` records | `fix/external-remove-not-merged` (N31) → `fix/restore-quota-atomic` (N33) → `fix/restore-rebuilds-game` (C5 pt 2) → `chore/record-actions` (C1, N5 pt 1) → `fix/asana-session-tags` (N27, conditional) | `src/store/usePersistedState.js`, `localStore.js`, `appState.js`, `App.jsx` (`importData`, restore and onboarding handlers, `logSession`, then every record handler) | Nothing for N31. N27 waits for the 25 Oct B1 answer | `claude-opus-5-5` (High) for every branch |
| 3. Focus and tick boxes | `fix/focus-after-delete` (N34) → `fix/keyboard-topic-checkboxes` (C3) | `UndoBar.jsx`, `BottomBars.jsx`, `TopicList.jsx`, `AsanaTasksPanel.jsx`, `AnalysisPanel.jsx` (filter label). N34 must not edit `App.jsx` or `useUndoDelete.js`; if it has to, it moves to lane 2 after `chore/record-actions` | Nothing | `claude-sonnet-5-5` (Standard) for both |
| 4. File inputs and Space | `fix/keyboard-file-inputs` (C8) | `BackupCard.jsx`, `Onboarding.jsx` (file input only), `src/hooks/useSpaceToggle.js` (not its caller in `App.jsx`) | Nothing | `claude-sonnet-5-5` (Standard) |
| 5. Build and offline | `fix/precache-pdf-worker` (C12) → `chore/code-split` (C2) → `chore/dev-deps` (C6) | `vite.config.js`, `AddSubjectCard.jsx` (pdf.js import only), `src/utils/specImport.js`, CI size check, `package.json`, `package-lock.json` | Nothing | C12 `claude-haiku-4-5-20251001` (Mechanical); C2 `claude-sonnet-5-5` (Standard); C6 `claude-haiku-4-5-20251001` (Mechanical) |
| 6. V2 preparation (gated, not agent work yet) | `fix/idless-merge-ids` (C5 pt 1) → `fix/freezes-from-dates` (N23) → `fix/template-topic-ids` (N24) → `feat/record-order` (N5 pt 2) → `feat/session-local-day` (N26) | `src/utils/subjects.js` normalizers, `merge.js`, `gameLogic.js`, `catalogue.js`, `App.jsx` | A "go" on 25 Oct. Lanes 1 and 2 empty (shared normalizers and `App.jsx`); `feat/record-order` also needs 20 Oct (N9 live 14 days) | `claude-opus-5-5` (Critical, two independent reviews) for every branch |

Exceptions to "lanes never share files", stated rather than hidden: A2.12 and N30 both edit `src/utils/backup.js` (different functions), so A2.12 is in lane 1; C11 and N28 both edit `EditSessionModal.jsx`, so C11 is in lane 1; N33, C5 part 2, `chore/record-actions` and N27 all edit `App.jsx`, so they share lane 2.

A session running several branches runs at the highest tier among them, or stops between them. At most 3 workers run at once. For C1, start with lanes 2 and 1, which hold the data-loss rows, and add lane 3 or 5 as the third. A coordinator can run these lanes as separate full sessions with the `orchestrate` skill. A readiness pass runs about 17 Oct (C1 exit), 26 Oct (decision point) and at the end of C2 and G.

## Decisions already made (do not re-ask)

- Soft deletes are tombstones in `sb-tombstones`, not a `deletedAt` flag on records.
- Stamps are optional and normalizers never invent them; a missing `updatedAt` means "older than any real edit".
- Deleting a subject, a completed topic or a session removes its XP (v1.15.1); undo gives it back.
- Zero-behaviour-change restructures ship as `chore/`, not `refactor/`, because `v2.0.0` is reserved for accounts and sync.
- The Asana token stays in `localStorage` under its current key, behind the CSP in `vercel.json`.
- The running timer and the session draft are per-tab state, owned by one tab (N12), not reconciled across tabs.
- Undo re-stamps the record it restores (maintainer, 2026-10-05). Undo merge and Undo restore do not tombstone records only the file had (maintainer, 2026-10-05).
- Replacing data (Restore, Start blank, templates) tombstones what it removes, and the untouched placeholder subjects are never stored (N10).
- The ledger's A3.4 exit check passed on 2026-10-07: N8 to N13 and N19 are closed, and there is no new `high` or `critical` to fix first.
- N23, N24 and C5 part 1 (the Critical-tier V2 preparation) wait behind the 25 Oct decision and are dropped if V2 does not go ahead. `fix/restore-rebuilds-game` (C5 part 2) is a V1 correctness fix and stays in C2.
- Subtask delete has no undo for now; whether that changes is the maintainer's call (N32). Do not add one.

---

# Phase C1: stop losing data, round 3 (8 to 17 Oct)

Exit test: each finding's scenario reproduces on `master` in a repo test before its branch and fails to reproduce after it; a restore that hits the quota leaves every account key either all old or all new (test); a readiness pass on about 17 Oct reports N30, N31, N33, N14 and N28 closed, and no new `high` or `critical`.

## C1.1 Another tab's removal of `sb-subjects` is not a change to merge

**Branch:** `fix/external-remove-not-merged` · **Closes:** N31

**Build**

- Reproduce first: two tabs on onboarding. Tab A restores a file with one subject (`other`) and tab B takes it. A clicks Undo restore, which removes `sb-subjects` and sets onboarding back to not done. Today the end state is `sb-subjects` holding `["other","physics","maths","further","cs"]` with onboarding false and both tabs on the planner, because `usePersistedState`'s external-change handler treats the removed key as its loader default and merges the placeholder defaults into the real subjects.
- An external removal of a key is not a value to merge. The tab that sees it adopts the removal the same way it adopts a placeholder (the key stays absent, the tab shows the onboarding screen again) and never writes the loader default back. Keep `latestAccountData`'s guard and make the handler consistent with it. Correct `instruction.md` only if its wording changes.

**Done when**

- [ ] The two-tab scenario above (restore in A, B takes it, Undo restore in A) ends with `sb-subjects` absent, onboarding false and both tabs on the onboarding screen (test, two-app harness as in `App.multiTab.test.jsx`).
- [ ] An external removal of another account key (sessions, game, theme) does not resurrect defaults or lose this tab's records (tests).
- [ ] Placeholder subjects are still never stored. Onboarding guard test passes.

## C1.2 A Restore over the storage quota leaves every account key all old or all new

**Branch:** `fix/restore-quota-atomic` · **Closes:** N33

**Build**

- Reproduce first, through the real Restore UI with jsdom's 5 MB quota: storage holds sessions `old-1` and `old-2` and the default subjects; restore a v3 file with one subject (`filesub`) and 16,000 sessions (about 5.4 MB). Today `sb-subjects` becomes `["filesub"]`, `sb-sessions` stays `["old-1","old-2"]`, `sb-tombstones` holds `old-1`, `old-2` and the default subjects, the "storage full" banner shows, and after a reload the file's sessions are gone and the tombstoned old sessions show, so the next merge deletes them.
- Restore writes its account keys (subjects, sessions, tombstones, game, theme) as one unit: if any write fails, the keys already written are put back to what they were (through `src/store/`, never by touching `localStorage` elsewhere), the in-memory state is the old state, and the user is told the restore did not fit and that nothing changed. Undo restore stays correct after a successful restore. Do not edit `undo.js` beyond what this needs.

**Done when**

- [ ] The quota scenario above leaves subjects, sessions, tombstones, game and theme all exactly as before the restore, in storage and on screen, and after a reload (test).
- [ ] A restore that fits still writes all keys and Undo restore still puts back the pre-restore state byte-identically (existing tests pass).
- [ ] The message says the restore did not fit and nothing changed; the existing save-failure banner is not left claiming data was lost that was not.

## C1.3 Restore and merge treat duplicate ids the same way

**Branch:** `fix/dedupe-imported-ids` · **Closes:** N30

**Build**

- Reproduce first: restore a file with two sessions that share the id `dup` (600 s "first", 1200 s "second"). Log shows 2; deleting the second removes both; Undo returns only "first", so the 20-minute session is lost. The same holds for subjects and for topics within a subject (a duplicate subject id under restore collapses to one copy in a second tab and loses one name).
- `parseBackup` (and `stateAfterRestore`) resolve duplicate ids the way `mergeData` already does, so a file behaves the same under Restore and Merge. Decide and write down in `instruction.md` which copy wins (the one `mergeData` would keep); a copy that loses is not silently dropped without being the same record by id. Never rewrite an id that is unique. Subtask ids that collide inside one topic are covered too.

**Done when**

- [ ] The duplicate-session scenario above, through the real Restore UI, shows one session in Log, and deleting then undoing leaves it exactly as restored (test). Duplicate subject ids and duplicate topic ids have the same tests.
- [ ] Restoring a file, then merging the same file, gives the same records as merging it alone (test).
- [ ] Files without duplicates restore byte-identically to before, for every backup version (test). Onboarding guard test passes.

## C1.4 Imported durations, XP, dates and stamps are bounded

**Branch:** `fix/bound-imported-values` · **Closes:** N14, N28

**Build**

- Reproduce first, through `parseBackup` and the stored-data loaders: a session `duration` of 1e9 (16,666,667 XP) and of -360000, a `legacyXP` of 1e9 (3 permanent freezes), an `updatedAt` of `9999-12-31` (a record that can never be tombstoned), and a session `date` of `"not a date"` (Log shows "Invalid Date", Edit then Save throws `RangeError` in `EditSessionModal.jsx` and saves nothing, and the record sorts above every ISO date). All are accepted today.
- Bound them in the normalizers: a duration is clamped to a sane range with the usual default for a negative or non-finite value; `legacyXP` is capped by the amount `settleLegacyXP` could legitimately produce; a stamp in the far future is dropped (a missing `updatedAt` means "older than any real edit") or capped at now; a session `date` that is not a real date gets the usual default and stays editable. Valid values of the right type and range are kept exactly as they were. Guard the `toISOString` in `EditSessionModal.jsx` too. State the chosen bounds in `instruction.md`.

**Done when**

- [ ] Each scenario above is rejected or bounded through Restore, Merge and a stored key, and the Log view and Edit Save work for a session that had an invalid date (tests).
- [ ] A record with an in-range duration, `legacyXP` and stamp normalizes byte-identically to before (test, including backups from every version).
- [ ] A deletion made after a far-future stamp can now win (test). Onboarding guard test passes.

## A2.12 Backup download on Safari

**Branch:** `fix/backup-download-revoke` · **Closes:** N25 · **Only after the maintainer's Safari or iPhone check (23 Oct)**

**Build**

- Reasoned only: `downloadBackup` revokes the object URL straight after `a.click()` on a detached anchor. If the maintainer's check reproduces a failed or empty download on Safari or iOS, attach the anchor and revoke the URL after the download has started. If it does not reproduce, close N25 as rejected with that evidence and skip the branch. It shares `src/utils/backup.js` with C1.3, in a different function.

**Done when**

- [ ] Reproduced and fixed with a test that the URL is revoked only after the click and the anchor is in the document while it clicks, or closed as rejected with the evidence.

---

# Phase G: keyboard, focus, offline and size (8 to 31 Oct, in parallel with C1 and C2)

Exit test: Restore, merge, every tick box and toggle, picking an Asana task, the Analysis filter and Undo after a delete all work with Tab, Space and Enter only, and after a delete focus lands on Undo (tests); PDF import works offline after one online load (test of the precache list); the main chunk is under 500 kB, asserted in CI; `npm audit` reports 0.

## G.1 Focus moves to Undo after a delete

**Branch:** `fix/focus-after-delete` · **Closes:** N34

**Build**

- Reproduce first: delete a session in Log, and a subject in Settings. Focus drops to `<body>` and Undo is 10 Tabs away (`active=BODY tabsToUndo=10`).
- After a one-click delete, focus moves to the Undo button of the bar (or, if the bar cannot take focus, the next sensible control), and the bar is announced: it must be present in the live region before its text changes, or use `role="alert"`/`aria-live` so VoiceOver reads "Deleted <name>. Undo". Keep Space on the bar's buttons from toggling the timer (`data-own-keys`). Do not edit `App.jsx` or `useUndoDelete.js`; if that proves unavoidable, stop and move the branch to lane 2 after `chore/record-actions`.

**Done when**

- [ ] Delete a session, a subject, a topic and a milestone, then press Enter: the record is back (tests, keyboard only, asserting `document.activeElement` is the Undo button).
- [ ] The bar's live-region markup is in the DOM before its text changes (test). Say in the PR that no real screen reader was run.
- [ ] Space on the bar never toggles the timer (existing test passes).

## G.2 Tick boxes and toggles work from the keyboard

**Branch:** `fix/keyboard-topic-checkboxes` · **Closes:** C3

**Build**

- Reproduce first: topic and subtask tick boxes (`TopicList.jsx`), Asana task tick boxes and the topic expand toggle are `div`/`span` elements with no `tabIndex` and no key handler, and the Asana task row (`div.asana-row` with `onClick`) is the only way to pick a task to time. The Analysis subject filter is a `select` with no accessible name.
- Make each one a real control: a `button` or `role="checkbox"` with `tabIndex={0}`, `aria-checked`, and Space and Enter handlers; the expand toggle gets `aria-expanded`; the Asana row gets a button role and key handling for selecting the task; the filter `select` gets an accessible name. Keep the look, and keep `data-own-keys` where Space would otherwise start the timer. Do not change what any control does.

**Done when**

- [ ] Every control above can be reached with Tab and operated with Space or Enter: tick a topic and a subtask, expand a topic and reach delete topic and convert-to-milestone, tick an Asana task, and pick an Asana task to time (tests).
- [ ] The Analysis filter has an accessible name (`getByRole("combobox", { name })` test).
- [ ] No test that clicked these controls is weakened; the `TopicList` snapshot recorded before papers existed still passes.

## G.3 Restore and Merge from file work from the keyboard

**Branch:** `fix/keyboard-file-inputs` · **Closes:** C8

**Build**

- Reproduce first: Restore and Merge from file are labels around `display:none` inputs (`BackupCard.jsx`, `Onboarding.jsx`), unreachable by keyboard; and Space on any focused button is swallowed by the timer shortcut (`useSpaceToggle` calls `preventDefault`, so Space on a focused Settings button starts the timer and does not open Settings).
- Make the file inputs focusable (visually hidden, not `display:none`) with an accessible name and a visible focus ring, or use a button that opens the picker. Fix `useSpaceToggle` so Space on a focused button, link, input or anything else that handles Space itself is left to that control. Only `useSpaceToggle` itself changes, not its caller in `App.jsx`.

**Done when**

- [ ] Tab to Restore and to Merge from file, press Enter or Space: the file picker opens (test, asserting the input is focusable and named).
- [ ] Space on a focused Settings button presses it and does not start the timer; Space with nothing focused still toggles the timer (tests).

## G.4 Dialogs take focus and controls show on focus

**Branch:** `fix/focus-management` · **Closes:** C11 · **After C1.4 (same modal)**

**Build**

- Reproduce first: opening the Edit session dialog (`aria-modal`) leaves focus outside it ("focus inside dialog after open: false"); the Edit and Delete session buttons are `opacity: 0` until `:hover` (no `:focus`), so keyboard and touch cannot see them; ten text inputs set `outline: none` (`appCss.js`).
- The dialog moves focus into itself on open, keeps it inside while open (Tab and Shift+Tab wrap) and returns it to the control that opened it on close, with Escape closing it. The session buttons are also visible on `:focus` and `:focus-within`. Inputs show a focus ring. Desktop layout otherwise unchanged; the narrow layout (#63) keeps its hover-free reveal.

**Done when**

- [ ] After opening Edit, `document.activeElement` is inside the dialog; Tab cycles inside it; Escape closes it and returns focus to the Edit button (tests).
- [ ] The Edit and Delete buttons are visible when focused (CSS rule asserted).
- [ ] No input has `outline: none` without a replacement focus style (test over the CSS).

## G.5 PDF import works offline

**Branch:** `fix/precache-pdf-worker` · **Closes:** C12

**Build**

- Reproduce first: the 1.3 MB pdf.js worker (`pdf.worker.min-*.mjs`) is not in the service-worker precache (`globPatterns` lacks `.mjs`; `dist/sw.js` has 82 precache entries, none the worker), so spec PDF import fails offline.
- Add the worker to the precache in `vite.config.js` without precaching anything else unexpected, and keep `navigateFallback: 'index.html'` and the spec chunks precached.

**Done when**

- [ ] A test of the precache list (built `dist/sw.js` or the workbox config) includes the worker and still includes the spec chunks and `index.html`.
- [ ] The PR states the new precache entry count and size.

## G.6 The main chunk is split and capped

**Branch:** `chore/code-split` · **Closes:** C2

**Build**

- The main bundle is 903.64 kB (gzip 267.57 kB) in one chunk, and pdf.js reaches it statically through `AddSubjectCard.jsx` and `specImport.js`. Load pdf.js lazily (on first PDF upload) and split other large, rarely used code if needed. Keep the app working offline (G.5's precache covers the lazy chunk). A CI step or test fails if the main chunk is 500 kB or more. Zero behaviour change.

**Done when**

- [ ] The main chunk is under 500 kB and CI fails above it (say how it was checked).
- [ ] PDF import still works after the split (existing tests pass) and the lazy chunk is in the precache.

## G.7 Dev dependencies are patched

**Branch:** `chore/dev-deps` · **Closes:** C6

**Build**

- `npm audit` reports 10 findings (3 moderate, 7 high), all in dev tooling (`@vitest/mocker`, `baseline-browser-mapping`, `brace-expansion`, `browserslist`, `fast-uri`, `nanoid`, `postcss`, `undici`, `vitest`, `source-map-js`). Update dev dependencies to patched versions. No runtime dependency is added or changed without asking.

**Done when**

- [ ] `npm audit` reports 0, and `npm audit --omit=dev` still reports 0.
- [ ] Lint, tests and build pass on the updated lockfile.

---

# Phase C2: thin the shell (18 Oct to 7 Nov)

Starts as lane 2 empties of C1 work. Exit test: after a restore, the game equals `buildInitialGame` of the restored records (test); `App.jsx` is under 480 lines; `changedSince(state, t)` returns exactly the records a scripted action sequence changed (test).

## C2.1 Restore rebuilds the game from the restored sessions

**Branch:** `fix/restore-rebuilds-game` · **Closes:** C5 (part 2)

**Build**

- Reproduce first: after a restore only `validateStreak` runs on a 0 ms timeout, and restore uses `settleLegacyXP`, not `buildInitialGame`, so the game after a restore can disagree with the restored sessions (reasoned in the ledger: prove it first, or reject it).
- After a restore the game is rebuilt from the restored records the way a fresh load does it, keeping `legacyXP` rules and freezes consistent. Undo restore still puts back the pre-restore game.

**Done when**

- [ ] After restoring a file whose game disagrees with its sessions, the game equals `buildInitialGame` of the restored records (test).
- [ ] Undo restore returns the pre-restore game exactly (existing test passes); XP is still only `deriveXP` plus `legacyXP`.

## C2.2 Record actions leave `App.jsx`

**Branch:** `chore/record-actions` · **Closes:** C1, N5 (part 1)

**Build**

- Zero behaviour change. Move every record mutation (subjects, topics, subtasks, milestones, sessions, tombstones, undo descriptors) out of `App.jsx` into pure functions in `src/utils/` or `src/store/` with sibling tests, so `App.jsx` falls under 480 lines. Add `changedSince(state, t)`, which returns exactly the records an action sequence changed, as the seam for sync; nothing calls it for sync yet.

**Done when**

- [ ] `App.jsx` is under 480 lines (`wc -l` in the PR) and every existing test passes unchanged.
- [ ] `changedSince(state, t)` returns exactly the records a scripted sequence of actions changed (test).

## C2.3 Asana task names in session tags (conditional)

**Branch:** `fix/asana-session-tags` · **Closes:** N27 · **Only if the 25 Oct B1 answer is "device-only" or "drop"; if it is "keep", N27 closes as kept and this branch is skipped**

**Build**

- `logSession` copies the selected Asana task's name into the session's tags (`extraTag`), which is account-scope data in every backup. Per the maintainer's answer: keep the name out of account-scope tags (drop it, or hold it on the device only) and correct the Asana section of `instruction.md`. Existing sessions that already carry such a tag keep it.

**Done when**

- [ ] A session logged against an Asana task has no task-name tag in `sb-sessions` or `storedBackup()` (test), and the session still carries `subjectId: "asana"`.
- [ ] Sessions already stored with such tags load and merge unchanged (test).

---

# Phase V: V2-only preparation (27 Oct to 20 Nov): gated, not agent work yet

Phase V (lane 6: `fix/idless-merge-ids`, `fix/freezes-from-dates`, `fix/template-topic-ids`, `feat/record-order`, `feat/session-local-day`) starts only on a "go" at the 25 Oct decision point, after a readiness pass on 26 Oct re-plans it, and after lanes 1 and 2 are empty. Do not start any of these branches from this goal. Phases D, E and F are likewise gated on B1, V1 and a closed N26.

---

## Stop and ask instead of guessing if

- A fix would drop, rename or re-type any stored field, change `defaultSubjects()` output, or change an existing record's id.
- A finding cannot be reproduced and cannot be disproved either.
- You are about to start a Phase V branch, or add subtask undo (N32): those wait for the 25 Oct decision and the maintainer.
- You are about to open a process or workflow PR this goal does not list.
- Anything needs a backend, an account, a new third-party service or a new runtime dependency.
- Lint, test or build cannot be made green without disabling a rule or skipping or weakening a test.
- The review gate returns `blocked`, or a critical or high finding is still open after two rounds.
- A branch has to edit a file another lane owns (see **Parallel lanes**).
- A readiness pass reports a new `high` or `critical` that is not a small, obvious fix.

## Final report

After the last Phase C1, G and C2 branch, report:

- versions shipped, with PR links;
- each ledger id closed and the test that proves it;
- findings rejected and why;
- the main chunk size before and after, and the precache entry count;
- `App.jsx` line count before and after;
- anything stashed under rule 11;
- tags that could not be pushed;
- what still needs the maintainer: the N32 decision, the device checks (installed PWA beside a tab, Android reminders, phone layout, iPhone backup), B1 and V1 by 25 Oct, and the design gate doc;
- any deviation from this file.
