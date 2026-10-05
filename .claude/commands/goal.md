
# Goal: harden StudyBox and shape it for sync (readiness Phases A and C)

Close every code finding in `docs/readiness/findings.md` that stands between v1.15.1 and a backend spike: first the ones that can lose a user's data today (Phase A), then the restructure that gives sync a record-level change feed (Phase C). Each item is its own branch, PR and, where it changes the shipped app, release. When done, two tabs and two devices can be used carelessly without losing a record, a render or storage failure never costs the user their data, and one function can say exactly which records changed since a given time. Everything stays local-first: no backend, no accounts, no network calls beyond the opt-in Asana API.

Readiness report: `docs/readiness/2026-10-05.md`
Findings ledger: `docs/readiness/findings.md`
Design gate (context only, nothing in this goal builds it): Claude project doc `claude/v2-design-gate.md`

## Ground rules (apply to every branch)

1. **Use the `/git-workflow` skill for every branch.** Never commit to `master`. Branch off an up-to-date `master` with the name given below. `fix/` is a patch bump, `feat/` a minor bump, `chore/` no bump and no tag. `feat/` branches go through the review gate before merging.
2. **Order and expected versions:** A1 `v1.15.2` → A2 `v1.16.0` → A3 `v1.17.0` → A4 `v1.17.1` → A5 (no bump) → A6 (no bump) → **Phase A exit check** → C1 (no bump) → C2 `v1.18.0` → C3 (no bump) → C4 `v1.18.1`. Tags are the source of truth; if the latest tag differs when you start, bump from whatever it actually is.
3. **Green before PR:** `npm run lint`, `npm test`, `npm run build` all pass locally and in CI. Never hand over a red branch.
4. **Reproduce before fixing.** Every finding gets a failing test that shows the scenario first, then the fix. A finding marked "reasoned" in the ledger must be reproduced or disproved before any code changes; if it is disproved, close it in the ledger as rejected and skip the branch.
5. **Conventions:** pure logic in `src/utils/*.js` or `src/store/*.js` with a sibling `*.test.js`; JSX in `src/components/*.jsx` with a sibling `*.test.jsx`. `App.jsx` gets smaller in this goal, never larger.
6. **Backwards compatibility is non-negotiable.** `localStorage` data written by v1.15.1 and every backup version (unversioned, v1, v2, v3) load with no loss. New fields are optional and defaulted in the normalizers.
7. **Sync-safe records stay sync-safe.** New records use `newId`; every edit stamps the record it changes with `touch`; every delete writes a tombstone; XP is only ever `deriveXP` plus `legacyXP`; nothing outside `src/store/` touches `localStorage`. See "Sync-safe records" in `instruction.md`.
8. **Onboarding guard:** `defaultSubjects()` returns the frozen A-level set and `isUntouchedDefaultSubjects` keeps detecting an untouched install. Keep or add a test in every branch that touches `subjects.js` or a normalizer.
9. **Keep the ledger and docs current:** in the same PR, move the finding to Closed in `docs/readiness/findings.md` with the PR number and the test that proves it, and update `instruction.md` and `README.md` where behaviour or structure changed.
10. **Do not touch** uncommitted changes that were in the working tree before this goal started (for example a locally regenerated `package-lock.json`). If they block `git checkout master`, stash them with a clear message and say so in the final report.
11. Commits and PRs end with the attribution lines your environment specifies.

## Decisions already made (do not re-ask)

- Soft deletes are tombstones in `sb-tombstones`, not a `deletedAt` flag on records.
- Stamps are optional and normalizers never invent them; a missing `updatedAt` means "older than any real edit".
- Deleting a subject, a completed topic or a session removes its XP. That shipped in v1.15.1 and stays; undo (A2) gives it back.
- Zero-behaviour-change restructures in this goal ship as `chore/`, not `refactor/`, because `v2.0.0` is reserved for accounts and sync.
- The Asana token stays in `localStorage` under its current key. This goal adds a Content-Security-Policy around it; replacing it is a 2.0 question.
- The running timer and the session draft are per-tab, per-device state. They are not reconciled across tabs.

---

# Phase A: stop losing data

## A1 Multi-tab overwrite

**Branch:** `fix/multi-tab-overwrite` · **Closes:** N1

**Build**

- First reproduce it in a test: two copies of the app state over one `localStorage`, a session logged in each, and show that one is lost. If jsdom cannot express it with two mounted apps, express it at the store level (a write from "another tab" followed by a write from stale state).
- `src/store/localStore.js`: listen for the window `storage` event and report it to subscribers as `{ key, scope, type: "external", value }`. Ignore keys the store does not own and never pass a `secret` value.
- `usePersistedState`: take a loader (read plus normalize) instead of only an initial value; on an external change to its own key, reload through the loader. A value that came from outside must not be written straight back (no echo loop between tabs).
- `account`-scope keys and `sb-asana`, `sb-asana-stats`, `sb-onboarded` reconcile. `sb-timer` and `sb-session-draft` do not (decision above); document that a timer running in two tabs is two timers.
- The derived-XP effect and streak validation must settle to the same value in both tabs without ping-ponging writes.

**Done when**

- [ ] The reproduction test fails on `master` and passes on the branch.
- [ ] Session logged in tab A then topic ticked in tab B: both survive, in both tabs and in storage (test).
- [ ] Sessions logged in both tabs within the same second: both survive (test).
- [ ] A deletion in tab A is not resurrected by tab B's next write, and the tombstone is present (test).
- [ ] No write loop: an external change causes at most one write per key in the receiving tab (test counts writes).
- [ ] Checked by hand in a real browser with the installed PWA and a tab open together; say so in the PR.

## A2 Undo for deletes, and for merge

**Branch:** `feat/undo-delete` · **Closes:** N2, N7

**Build**

- After deleting a subject, topic, milestone or session, show one undo bar (`role="status"`): "Deleted <name>. Undo". It stays until dismissed, until the next delete replaces it, or until the view changes.
- Undo puts the record back exactly as it was, in its original position, with its stamps unchanged, and removes its tombstone (`removeTombstone` in `src/utils/tombstones.js`, pure, tested). XP returns by itself because it is derived.
- Undoing a subject delete also restores selection and the timed subject if they pointed at it.
- Merge from file: keep the pre-merge state in memory and offer "Undo merge" beside the success message until the next import or a reload. Undo restores subjects, sessions, tombstones and game exactly.
- No confirmation dialogs: undo replaces them. The existing two-step "Convert to milestone" stays as it is.

**Done when**

- [ ] Delete then undo for each of the four record types leaves `sb-subjects`, `sb-sessions`, `sb-tombstones` and `sb-game` byte-identical to before the delete (tests).
- [ ] Delete without undo still writes the tombstone and still merges as a deletion (test).
- [ ] Undo merge restores the exact pre-merge storage (test).
- [ ] The undo bar is reachable and operable by keyboard and is announced (`role="status"`), and the space-bar timer shortcut does not fire while it has focus (test).

## A3 Error boundary and failed writes

**Branch:** `feat/error-boundary` · **Closes:** N3

**Build**

- `src/components/ErrorBoundary.jsx` wrapping the app in `main.jsx`. Fallback screen: what happened in one plain sentence, "Download backup" and "Reload". The backup is built straight from storage through `src/store/` and `buildBackup`, not from React state, so it works when rendering is what broke.
- `saveJson` / `saveText`: catch a failed write, keep the app running, and report it to subscribers as `{ key, type: "error" }`. Never swallow it silently.
- A persistent banner when a write has failed: "Couldn't save your last change – this browser's storage is full. Download a backup." with the same download action. It clears after the next successful write of that key.

**Done when**

- [ ] A component that throws during render shows the fallback, and its backup download contains the stored subjects and sessions (test).
- [ ] `localStorage.setItem` throwing a quota error does not unmount the app, shows the banner, and the in-memory state is still exportable (test).
- [ ] The banner clears after a later successful write (test).
- [ ] The Asana token is in neither backup path (test).

## A4 Own-key lookups

**Branch:** `fix/preset-lookup-own-keys` · **Closes:** N6

**Build**

- In `src/utils/subjects.js` (and anywhere else an object is indexed by an id that came from stored or imported data), look up with `Object.hasOwn` or a `Map`. Start from `PRESET_METADATA` and `TOPIC_SEED`; grep for the pattern rather than fixing only the reported line.

**Done when**

- [ ] `normalizeSubjects` and `parseBackup` accept subjects, topics, milestones and sessions whose ids are `__proto__`, `constructor`, `toString` and `hasOwnProperty`, without throwing and without touching `Object.prototype` (tests).
- [ ] The same ids in `sb-subjects` let the app start (test).

## A5 Security headers

**Branch:** `chore/security-headers` · **Closes:** N4

**Build**

- `vercel.json` with headers for every route: a Content-Security-Policy that allows the app's own origin, `connect-src` for `https://app.asana.com` only, and whatever the app demonstrably needs for inline styles, the PDF worker and the service worker; plus `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, `frame-ancestors 'none'` and a `Permissions-Policy` that turns off what the app does not use.
- Work out the policy from the built app, not from memory: open the Vercel preview deployment of the branch with the browser console open and fix every violation by narrowing the cause, not by widening the policy. `unsafe-eval` is not acceptable; `unsafe-inline` is acceptable for styles only, and say why in the PR.
- A test that reads `vercel.json` and asserts the policy has no `*` source, no `unsafe-eval`, and names the Asana origin.

**Done when**

- [ ] On the preview deployment with the policy enforced: first load, offline reload, a spec PDF import, a backup download and restore, a notification permission prompt and (if a token is available) an Asana fetch all work with zero CSP violations in the console. List what was exercised in the PR.
- [ ] The service worker still installs and `navigateFallback` still serves the shell offline.

## A6 Docs and repo hygiene

**Branch:** `chore/docs-sync` · **Closes:** C4

**Build**

- Bring `README.md` and `instruction.md` in line with the code as of the latest tag.
- Add a root `CLAUDE.md` that imports `instruction.md` and points at the `git-workflow` and `readiness-pass` skills, so the rules load without being asked for.
- Write `docs/project-instructions.md`: replacement text for the Claude project's instructions (current version, real storage keys, store layer, data model with milestones, papers, exam year, stamps and tombstones, the workflow including `chore/`). The maintainer pastes it in; an agent cannot edit project settings.

**Done when**

- [ ] Every storage key in `STORAGE_KEYS` and `SECRET_KEYS` is documented, and no documented key is missing from the code (a test compares them).
- [ ] The final report lists the maintainer steps: paste the project instructions, confirm the CI check is required on `master` (C7).

## Phase A exit check

Before starting Phase C, run the `readiness-pass` skill. Continue only if it reports N1, N2, N3, N4, N6 and N7 closed with evidence and no new `high` or `critical`. If it finds one, fix that first as its own `fix/` branch and re-run.

---

# Phase C: shape the client for sync

## C1 Record actions out of App.jsx

**Branch:** `chore/record-actions` · **Closes:** C1, first half of N5

**Build**

- Move every mutation of subjects, topics, subtasks, milestones, sessions and tombstones out of `App.jsx` into pure functions in `src/store/actions.js`: `(state, payload, now) => ({ state, changed, deleted })`, where `changed` and `deleted` list `{ kind, id }` (topics and milestones with their subject id).
- `App.jsx` calls them and keeps only state wiring, selection and view switching.
- `changedSince(state, isoTimestamp)` in `src/store/`: every record whose `updatedAt` is later, plus every tombstone later than it. This is the client half of sync; nothing calls it yet.
- No behaviour change. No test may be weakened; existing component tests are the safety net and each action also gets a unit test.

**Done when**

- [ ] `App.jsx` is under 480 lines.
- [ ] Every action has a unit test asserting the new state, the stamps, the tombstones and the `changed` / `deleted` lists.
- [ ] `changedSince` returns exactly the records touched by a scripted sequence of actions and nothing else (test).
- [ ] The full existing suite passes unmodified apart from import paths.

## C2 Record order

**Branch:** `feat/record-order` · **Closes:** second half of N5

**Build**

- An explicit order for subjects, and for topics within a subject, stored on the records and merged like any other field, so two devices holding the same records show them in the same order.
- Existing data keeps the order the user sees today with no migration step they can notice, and `isUntouchedDefaultSubjects` still holds.
- `mergeData` orders by that field with the id as tie-break. Remove the "order may differ" known limit from `src/utils/merge.js` and `instruction.md`.
- Stop and ask before adding any reorder UI: this branch only makes order mergeable.

**Done when**

- [ ] A v1.15.1 fixture loads in the same visible order (test).
- [ ] Three copies with records added on each converge on the same order whatever the merge order (test, extending the three-copy test in `merge.test.js`).
- [ ] Merging a copy with itself changes nothing, including order (test).
- [ ] Onboarding guard test passes.

## C3 Code-splitting

**Branch:** `chore/code-split` · **Closes:** C2

**Build**

- Lazy-load the Analysis view, the Settings view and the PDF import path behind `React.lazy` with a quiet fallback.
- Every lazy chunk stays in the service-worker precache so the installed app works offline from the first visit.

**Done when**

- [ ] The main chunk is under 500 kB (assert it in a build-size check script run in CI).
- [ ] Offline, after one online load: Analysis and Settings open and a catalogue template loads (say how it was checked).
- [ ] The error boundary from A3 catches a failed chunk load with a "Reload" that works (test).

## C4 Keyboard access to topic tick boxes

**Branch:** `fix/keyboard-topic-checkboxes` · **Closes:** C3

**Build**

- First confirm the finding with keyboard only. If the controls are in fact reachable, close C3 as rejected and skip the branch.
- Make every custom `role="checkbox"` in `TopicList.jsx` (topics, completed topics, subtasks) focusable and operable with Space and Enter, with a visible focus ring.
- The global space-bar timer shortcut must not also fire when one of them has focus.

**Done when**

- [ ] A topic can be ticked, reopened and its subtasks ticked using only Tab, Space and Enter (tests).
- [ ] Space on a focused tick box toggles it and does not start or pause the timer (test).

---

## Stop and ask instead of guessing if

- A fix would drop, rename or re-type any stored field, change `defaultSubjects()` output, or change an existing record's id.
- A finding cannot be reproduced and cannot be disproved either.
- A Content-Security-Policy that works needs `unsafe-eval`, a wildcard source, or `unsafe-inline` for scripts.
- Anything needs a backend, an account, a new third-party service or a new runtime dependency.
- Lint, test or build cannot be made green without disabling a rule or skipping or weakening a test.
- The review gate returns `blocked`, or a critical or high finding is still open after two rounds.
- The Phase A exit check reports a new `high` or `critical` that is not a small, obvious fix.

## Final report

After C4 is tagged, report: versions shipped with PR links; each ledger id closed and the test that proves it; findings rejected and why; the Phase A exit-check verdict; main bundle size and `App.jsx` line count before and after; anything stashed under rule 10; what still needs the maintainer (project instructions, CI required check, the Phase B decisions); and any deviation from this file.
