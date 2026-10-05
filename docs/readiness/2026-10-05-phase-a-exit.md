# StudyBox V2 readiness: 2026-10-05 (Phase A exit check)

Assessed at `master` @ `a9280f5`, tag `v1.16.0` (newest tag in the repo; production and `package.json` are 1.17.1, and the `v1.17.0` and `v1.17.1` tags are missing: C9). Previous pass: 2026-10-05 at `84abc1d` / `v1.15.1` (`docs/readiness/2026-10-05.md`). Findings are in `docs/readiness/findings.md`. The design gate doc (`claude/v2-design-gate.md`) was not available to this pass.

## Verdict

- **Backend spike on test data: ready.** Baseline green, no open `critical`. What the spike should test still depends on B1 (see premise 4).
- **Accounts and sync (2.0): not ready.** Open `high`: N9, N10, N11, N13. Open `blocker`: B1, V1.
- **Social features (2.x): not ready.** 2.0 has not shipped, and V1 (no feedback evidence) is open.

**Phase A exit check (`.claude/commands/goal.md`): failed.** N1, N2, N3, N4, N6 and N7 are closed and both audit passes re-verified them on `master`. But the pass opened four new `high` rows (N9, N10, N11, N13). Phase C does not start. Only N13 is a small, obvious fix. N9, N10 and N11 hit the goal's "stop and ask" rule, so the maintainer has to approve this plan before work goes past N13.

## Evidence

| Check | Result at `a9280f5` |
| --- | --- |
| Lint, tests, build | Pass. 674 tests in 49 files |
| CI on `master` | Run 37322714115 (#36) passed. Run 37321436976 (#35, `a7bf223`) was cancelled by the concurrency group, so its content was only verified by the next run (C7) |
| Required check on `master` | None (`contexts []`, `checks []`, `enforce_admins` false) (C7) |
| Production | 1.17.1. `vercel.json` CSP and headers served exactly, confirmed via Vercel's fetch |
| Main bundle | 885.90 kB (gzip 262.01 kB), one chunk plus 72 lazy spec chunks (was 878 kB) |
| `App.jsx` | 599 lines (was 651; target 480) |
| `npm audit` | 9 findings, all dev-only. `--omit=dev`: 0 |
| Tags | Newest `v1.16.0`. `v1.17.0` (`42f6159`) and `v1.17.1` (`251deed`) do not exist in this clone and are not on the remote |

**Closed since the last pass:** N1 (#31, v1.15.2), N2 and N7 (#32, v1.16.0), N3 (#33, v1.17.0), N6 (#34, v1.17.1), N4 (#35), C4 (#36). They were recorded as closed when they merged. This pass re-checked every closed row and all of them hold: 674/674 tests pass, the lint rule also catches `window.localStorage`, and the merge fuzz ran 3000 and 5000 pairs with 0 failures. Nothing closed during this pass.

**Contained, not closed** (the closed rows hold, but each has a neighbouring gap that is now its own row):
- N1 covers account keys only. The timer and draft keys still interfere across tabs (N12).
- N2 and N7 hold with one tab. With a second tab open, undo is reverted (N8).
- N3 covers writes. A blocked storage read still stops the app (N17).
- C4's key test holds, but `README.md:13`, `:52` and `:116` and two claims in `instruction.md` already contradict the code (N8, N12, N17, N18).
- B7 is still fenced, not solved.

**Changed:**
- C1 (599 lines).
- C3 (proven, and wider: subtask boxes, Asana boxes, and the expand toggle that is the only way to reach subtasks).
- C5 (also affects subjects; part 2 narrowed to "restore never rebuilds the game").
- C7 (now readable: CI is not required, plus the `cancel-in-progress` gap; severity set to `low`).
- N8 moved from reasoned to proven.

**New this pass:**

| ID | Severity | Finding | Why it matters for V2 |
| --- | --- | --- | --- |
| N9 | high | Normalizers drop unknown fields, and the app rewrites every key on mount even when a newer build wrote them | An old client under sync strips every field a newer client adds. Phase C's `order` field would be the first casualty |
| N10 | high | Restore, Start blank, Use template and Choose my subjects replace lists without tombstones. Placeholder defaults are written on first mount | Any merge brings removed records back. A fresh device would push placeholder subjects into the account |
| N11 | high | Restore from file replaces everything with no confirmation and no undo | Loses data today. Once N10 is fixed, a mistaken restore becomes a deletion that spreads to every tab and device |
| N12 | medium | Timer and draft in shared keys: a cloned timer resumes as a duplicate session | Duplicate records today. Under sync, duplicates replicate |
| N13 | high | Wrong-type fields pass import and crash rendering on every launch | One poisoned record under sync takes down every device |
| N14 | medium | Unbounded durations, `legacyXP` and far-future stamps accepted | A far-future stamp can never be deleted. XP and freezes can be inflated |
| N15 | medium | Session for a deleted timed subject is logged silently against another subject | Misattributed records today, also in a single tab |
| N16 | low | Unparseable stored JSON is overwritten with defaults, with no message | Silent loss of whatever was stored |
| N17 | low | Blocked storage: unguarded reads stop the app | `instruction.md` promises the opposite |
| N18 | low | Applying an update reloads every tab, including one mid-edit | Loses an unsaved edit, the undo bar and Undo merge |
| N19 | medium | Subtasks are not records, so a topic edit on one copy deletes subtasks added on the other | Data loss with two tabs today, and with two devices under sync |
| N20 | medium | `new Notification()` throws on Android Chrome, so the error boundary replaces the app once a day | Android users lose the app daily and never get reminders. Proven with a stub only |
| N21 | low | Saving an edited session drops its seconds | Sub-minute sessions become 0 s and 0 XP |
| N22 | low | Timer Reset discards an unlogged session in one click | Loses a study session today |
| N23 | low | Game merge can hand back a spent freeze | Freeze maths diverges across devices |
| N24 | low | Template topic ids are positional | Two devices on different catalogue versions mix up topics |
| N25 | low | Backup download may fail on Safari and iOS | Reasoned only. If real, iOS users cannot take a backup |
| C8 | medium | File inputs unreachable by keyboard. Space on any button goes to the timer | Restore and merge are mouse-only |
| C9 | low | `v1.17.0` and `v1.17.1` tags and releases missing | Tags are the version source of truth. The next release would compute from `v1.16.0` |
| C10 | low | `drafts/` not gitignored, and spec PDF text dumps there | Risk of committing third-party spec text |
| C11 | medium | Edit-session dialog does not take focus. Edit and Delete are invisible to keyboard and touch | Accessibility, plus a hidden delete target on touch |
| C12 | low | pdf.js worker not precached, so PDF import fails offline | Offline-first claim is broken for one feature. Opened by the planner from pass 2's note |

## Gaps in the premise

1. **Phase A met its checklist but failed its own exit test.** The Phase A exit test was "two tabs and two devices can be used carelessly without losing a record". N8, N10, N12 and N19 each show a way to lose or corrupt records with two tabs. Every listed row closed, and the phase still was not done. Exit tests have to be re-checked by a pass, not inferred from rows.
2. **A known data-loss path shipped as a "known limit".** #32 documented N8 in `instruction.md` instead of fixing it. The per-PR review gate accepted that. Writing a limit down is containment, not closure. The fix (`fix/undo-restamps`) overturns the goal's "decisions already made" rule that undo keeps stamps unchanged, so it needs the maintainer.
3. **Order is forced by dependencies, not just severity.** N10 (restore writes tombstones) without N11 (undo restore) turns a mistaken restore into a deletion that spreads everywhere. N11's undo is in turn defeated by N8 whenever a second tab is open, because the other tab re-applies the tombstones. So the order is N8, then N11, then N10. Likewise N9 has to come before N19 and before `feat/record-order`. Its fix also protects only clients that have updated, so record-order waits two weeks after N9 is live. V2 sync will need a minimum client version, which this plan cannot supply.
4. **The critical path for 2.0 is still a decision and evidence, not code.** B1 and V1 are the maintainer's, due 25 Oct, and nothing in the repo shows progress. Phase A finishing 13 days early did not move the 2.0 date and neither will A2 or A3. The spike gate says "ready", but the spike's access-rule tests depend on B1's account-holder and minimum-age answers. Running it before 25 Oct risks testing the wrong model, so this plan dates it after the decision.
5. **The version source of truth is broken.** Rule 2 of the goal makes tags authoritative, but `v1.17.0` and `v1.17.1` exist nowhere in the repo. The next release branch would bump from `v1.16.0` and go backwards from production. C9 has to be done before the first merge in Phase A2.
6. **The previous plan's dates did not hold, in both directions.** Phase A was planned for 5 to 18 Oct and shipped in one day: six PRs and four releases. That speed came with the misses in gap 1, and #35's `master` run was cancelled unverified (C7). Every date below is re-set from today, at a slower pace, with CI made blocking first.
7. **The audit's coverage was narrow in these lenses:**
   - No real browser, installed PWA, Android or iOS device. N20 is stub-proven, N25 is reasoned, and A1's installed-PWA check was never done.
   - No contrast or screen-reader pass.
   - No privacy or data-protection lens: what personal data the app holds, reminder text on lock screens, cached Asana task data. B1 makes this relevant.
   - No clock or timezone lens: DST, travel, device clock skew against streaks and last-write-wins stamps.
   - No Asana response fuzzing and no catalogue content correctness.
   - The design gate doc was not available, so B1's wording was not re-checked against its source.
8. **Some severities rest on V2, not on today.** Pass 2 showed N9's same-browser route is mostly closed by the service worker, and it stays `high` only on the sync basis. N10 does not lose data today; it brings data back. Under the rule "anything that loses data today comes first", both are placed after the today-loss fixes, which delays the exit re-check to 6 Nov.
9. **My own placement is open to challenge.** N20 is sequenced after the data-loss items, but it takes the app away from every Android user with reminders on. If V1 feedback shows an Android-heavy user base, it should go first. The version numbers below assume every branch ships in order. N25 may be rejected after reproduction, which shifts the later patch numbers by one. N24's fix must not change existing topic ids, so it is likely to hit the goal's "stop and ask" rule.

## Plan

Versions are counted from `v1.17.1`. That assumes the maintainer creates that tag first (M1).

### Phase M: maintainer, 6 to 9 Oct (theirs)

Exit test: both tags and releases are visible on GitHub, the CI check shows as required on `master`, and the N8 decision and plan approval are recorded in the goal file.

| Item | Ledger | By |
| --- | --- | --- |
| Create and push `v1.17.0` at `42f6159` and `v1.17.1` at `251deed`; publish both GitHub releases (the README badge follows) | C9 | 6 Oct, before any Phase A2 merge |
| Decide whether undo may re-stamp records (amends the goal's "stamps unchanged" decision). If no: N11 ships as a confirmation step (`feat/confirm-restore`) and N8 stays a documented limit | N8, N11 | 7 Oct |
| Approve this plan. The goal's "stop and ask" applies to N9, N10 and N11 | N9, N10, N11 | 7 Oct |
| Make the CI check a required status on `master` | C7 | 9 Oct |
| Paste `docs/project-instructions.md` into the Claude project (left over from A6) | C4 follow-up | 9 Oct |

### Phase A2: stop losing data today, 6 to 23 Oct

Exit test: for each row below, the auditor's scenario reproduces on `master` before the branch and fails to reproduce after it, in a test on `master`. No one-click action destroys a logged or unlogged session or a whole profile without an undo.

| # | Branch | Closes | Version |
| --- | --- | --- | --- |
| 1 | `fix/normalize-field-types` | N13 | v1.17.2 |
| 2 | `chore/ci-master-runs` (no cancel on `master` pushes) | C7 (agent half) | none |
| 3 | `fix/undo-restamps` (after M decision; corrects `README.md:13`) | N8 | v1.17.3 |
| 4 | `feat/undo-restore` | N11 | v1.18.0 |
| 5 | `feat/undo-timer-reset` | N22 | v1.19.0 |
| 6 | `fix/edit-session-keeps-seconds` | N21 | v1.19.1 |
| 7 | `fix/timer-single-owner` (corrects `README.md:52`, `instruction.md` per-tab claim) | N12 | v1.19.2 |
| 8 | `fix/orphaned-timer-subject` | N15 | v1.19.3 |
| 9 | `fix/guard-storage-reads` (one load path) | N16, N17 | v1.19.4 |
| 10 | `fix/update-reload-guard` (corrects `README.md:116`) | N18 | v1.19.5 |
| 11 | `fix/notification-android` | N20 | v1.19.6 |
| 12 | `fix/backup-download-revoke` (reproduce on Safari or reject) | N25 | v1.19.7 |
| alongside | `chore/ignore-drafts` | C10 | none |

### Phase A3: sync-safe replacing and unknown fields, then re-check, 26 Oct to 6 Nov

Exit test: a readiness pass on `master` reports N8 to N13 and N19 closed with evidence and no new `high` or `critical`. This is the re-run Phase A exit check, due 6 Nov. If it finds a new `high`, that fix goes first and Phase C slides a week.

| # | Branch | Closes | Version |
| --- | --- | --- | --- |
| 13 | `fix/replace-writes-tombstones` (after N11 is live) | N10 | v1.19.8 |
| 14 | `fix/preserve-unknown-fields` | N9 | v1.19.9 |
| 15 | `fix/subtask-records` (after N9) | N19 | v1.19.10 |
| 16 | readiness pass (`chore/readiness-<date>`) | none | none |

### Phase B: validate and decide, by 25 Oct (theirs)

Exit test: B1's four decisions are written into the repo or the design gate doc, and V1 has notes from five users.

| Item | Ledger | By |
| --- | --- | --- |
| Data controller and account holder, minimum age and assurance, Online Safety Act scope, reminders for signed-in users (read the regulator guidance) | B1 | 25 Oct |
| Five-user feedback round: who uses V1, on what devices (Android share decides N20's urgency), and whether they want friends features | V1 | 25 Oct |
| By hand: two tabs plus the installed PWA, reminders on an Android phone, a backup download on an iPhone | N1 check, N20, N25 | 23 Oct |

**Decision point, 25 Oct:**
- If B1 has no answer, Phase D tests only a generic model, Phase E does not start, and nothing with sign-up ships.
- If the feedback does not ask for friends, 2.0 is sync only and Phase F is dropped.

### Phase C: shape the client for sync, 9 to 27 Nov

This phase starts only after the 6 Nov exit check passes.

Exit test: `changedSince(state, t)` returns exactly the records changed by a scripted action sequence. `App.jsx` is under 480 lines. Three copies converge on the same order.

| # | Branch | Closes | Version |
| --- | --- | --- | --- |
| 17 | `chore/record-actions` | C1, N5 (first half) | none |
| 18 | `fix/bound-imported-values` | N14 | v1.19.11 |
| 19 | `fix/idless-merge-ids` | C5 (part 1) | v1.19.12 |
| 20 | `fix/restore-rebuilds-game` | C5 (part 2) | v1.19.13 |
| 21 | `fix/freezes-from-dates` | N23 | v1.19.14 |
| 22 | `fix/template-topic-ids` (must not change existing ids; stop and ask if it would) | N24 | v1.19.15 |
| 23 | `feat/record-order` (not before N9 has been live 14 days, about 20 Nov) | N5 (second half) | v1.20.0 |

### Phase G: keyboard, offline and size, 30 Nov to 11 Dec

Exit test: restore, merge and every tick box and toggle work with Tab, Space and Enter only. PDF import works offline after one online load. The main chunk is under 500 kB, asserted in CI.

| # | Branch | Closes | Version |
| --- | --- | --- | --- |
| 24 | `fix/precache-pdf-worker` | C12 | v1.20.1 |
| 25 | `chore/code-split` | C2 | none |
| 26 | `fix/keyboard-file-inputs` (fixes the global Space handler first) | C8 | v1.20.2 |
| 27 | `fix/keyboard-topic-checkboxes` | C3 | v1.20.3 |
| 28 | `fix/focus-management` | C11 | v1.20.4 |
| 29 | `chore/dev-deps` | C6 | none |

### Phase D: backend spike, 30 Nov to 11 Dec (outside the repo, after B1)

Exit test: three access-rule tests pass on test data, for the account model B1 chose.

### Phase E: v2.0.0 accounts and sync, 4 Jan to 30 Apr 2027

Gated on B1. It also needs a minimum-client-version rule (premise 3) and a decision on B7 (OAuth or removal).

**Decision point, 1 Mar 2027:** if a closed beta cannot start by 12 Apr, the beta moves to July and the public 2.0 to September 2027, the start of the school year. Nothing lands from 1 May to 30 Jun 2027 (exam freeze).

### Phase F: 2.x social, from 2.0's release

Gated on V1 and on 2.0 having shipped. Not before July 2027, or September if 2.0 moves.

### Running alongside

- `exam-dates-2028.json`: January 2027.
- Catalogue Wave 3: before 1 May 2027.
- Exam freeze: 1 May to 30 Jun 2027, no merges to `master`.

## Changes from the previous plan

- **Phase A** (5 to 18 Oct) shipped on 5 Oct, 13 days early, but its exit check failed: four new `high` rows.
- **Phases M, A2 and A3 are new.** M holds the maintainer's tag, CI and N8 decisions. A2 holds the fixes for today's data loss. A3 holds the sync-safety `high` rows and the re-run exit check.
- **Phase B** keeps its 25 Oct date. It adds device checks by hand (Android, iPhone, installed PWA).
- **Phase C** moves from 19 Oct–15 Nov to 9–27 Nov. It gains N14, N23, N24 and C5. `feat/record-order` is now gated on N9 being live for two weeks. `chore/code-split` and `fix/keyboard-topic-checkboxes` move out.
- **Phase G is new.** It collects accessibility (C3, C8, C11), offline PDF import (C12), bundle size (C2) and dev dependencies (C6).
- **Phase D** moves from 16–30 Nov to 30 Nov–11 Dec, and is now explicitly after B1.
- **Phase E** moves from Dec–Mar to 4 Jan–30 Apr 2027, with a 1 Mar beta go/no-go so that nothing collides with the exam freeze.
- **C7** goes from "unknown" to `low`, with an agent half (`ci.yml`) and a maintainer half (required check).
- **C12** is opened for the uncached pdf.js worker. It is a `fix/` of its own rather than part of `chore/code-split`, because it changes how the shipped app behaves offline.
