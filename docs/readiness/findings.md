# Readiness findings ledger

The single list of what stands between StudyBox and V2. `readiness-auditor` re-checks every open row on each pass and adds new ones; `readiness-planner` turns the open rows into the plan. Ids are permanent: never reuse or renumber one. A row is closed only with the PR that closed it and evidence that it holds on `master`.

Severity is "for V2", not for the app as it is today: how badly the item would lose, expose or corrupt data once accounts and a second device exist.

Last pass: 2026-10-05, `master` @ `84abc1d`, `v1.15.1`. Report: `docs/readiness/2026-10-05.md`.

## Open

| ID | Severity | Area | Finding | Evidence | Planned branch |
| --- | --- | --- | --- | --- | --- |
| N2 | high | destructive actions | Deleting a subject or session is one click with no confirmation or undo; it also removes that XP and writes a tombstone | `EditSubjectsCard.jsx`, `LogView.jsx` delete handlers | `feat/undo-delete` |
| N3 | medium | failure paths | No error boundary, and a storage write that throws (quota) blanks the app | No `componentDidCatch` in `src/`; `saveJson` does not catch | `feat/error-boundary` |
| N4 | medium | hosting | No security headers: no `vercel.json`, so no Content-Security-Policy | File absent | `chore/security-headers` |
| N5 | medium | sync seam | The store reports whole arrays, not which records changed, and subjects and topics have no order field | `src/store/localStore.js` `notify`; `src/utils/merge.js` known limits | `chore/record-actions`, `feat/record-order` |
| N6 | low | untrusted input | `normalizeSubject` throws on a subject whose id is `__proto__`, `constructor` or `toString` | Reproduced with `node -e` on `normalizeSubjects` | `fix/preset-lookup-own-keys` |
| N7 | low | destructive actions | Merge from file cannot be undone and takes no safety copy first | `importData` in `App.jsx` | with `feat/undo-delete` |
| B1 | blocker | design gate | Four decisions open: data controller and account holder, minimum age and assurance, Online Safety Act scope, streak reminders for signed-in users | Project doc `claude/v2-design-gate.md` section 5 | none: the maintainer's decision |
| B7 | medium | secrets | Asana token is plaintext in `localStorage`. Fenced from backups and sync, not solved | `SECRET_KEYS` in `src/store/localStore.js` | CSP now (N4); OAuth or removal in 2.0 |
| C1 | low | structure | `App.jsx` is 651 lines against a 480 target; all record mutations live in it | `wc -l` | `chore/record-actions` |
| C2 | low | performance | Main bundle is 878 kB in one chunk | `npm run build` | `chore/code-split` |
| C3 | medium | accessibility | Topic tick boxes are `div`s with `role="checkbox"` and no key handling, so they look unreachable by keyboard | Reasoned from `TopicList.jsx`; needs a real accessibility pass | `fix/keyboard-topic-checkboxes` |
| C4 | low | docs | Project instructions describe v1.2.1, 8 storage keys and no store layer | Project instructions vs `instruction.md` | `chore/docs-sync` |
| C5 | low | merge | Id-less sessions in a foreign file duplicate on repeated merge; restore skips streak validation until reload | `docs/reviews/feat-schema-v3.md` follow-ups P3, P4 | `fix/` each |
| C6 | low | dependencies | Nine `npm audit` findings, all in dev tooling that does not ship | `npm audit` | `chore/dev-deps` |
| C7 | unknown | process | Whether the CI check is a required status on `master` could not be read | Branch protection API returned 403 | maintainer to confirm |
| V1 | blocker | validation | No evidence of how many people use V1 or whether they want friends features | Nothing in the repo | none: five-user feedback round |

## Closed

| ID | Finding | Closed by | Verified |
| --- | --- | --- | --- |
| N1 | Two open tabs overwrote each other: nothing listened for storage changes and each tab wrote its whole in-memory array | #31 | 2026-10-05: reproduced and fixed in `src/App.multiTab.test.jsx` (two apps over one storage: concurrent sessions, stale-tab delete, at most one write per external change); checked in real Chrome with two pages; installed-PWA window not checked |
| B2 | Persistence scattered across `App.jsx`, hooks and the Asana client | #27 | 2026-10-05: lint rule blocks direct `localStorage` outside `src/store/` |
| B3 | Records not sync-safe (timestamp ids, no stamps, hard deletes, no schema version) | #28 | 2026-10-05: two-profile convergence test in `merge.test.js` |
| B4 | XP incremented and farmable by toggling a topic | #29 | 2026-10-05: `deriveXP` tests and the App toggle test |
| B5 | No CI | #26 | 2026-10-05: workflow passing on `master` (see C7) |
| B6 | `pdfjs-dist` advisory GHSA-hq66-cqwq-w95j | #25 | 2026-10-05: 6.4.299 installed, advisory gone from `npm audit` |
