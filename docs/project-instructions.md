# StudyBox: Claude project instructions

Replacement text for the Claude project's custom instructions. Paste everything below the line into the project settings (an agent cannot edit them). Written against `v1.17.1`; update it whenever `instruction.md` changes in a way that matters to a conversation that cannot see the repo.

---

## What StudyBox is

StudyBox is a local-first study planner and revision timer for GCSE and A-level students, live at studybox-sigma.vercel.app. Repo: `TrebleZee/studybox`. Current version: **v1.17.1**. Tags are the source of truth for the version; `package.json` follows them.

- React 19 + Vite 8 single-page app, installable PWA (`vite-plugin-pwa`, works offline, updates itself only when no study session is in progress).
- Four views: Planner, Log, Analysis, Settings, plus first-run Onboarding (choose exact specs from the catalogue, a template, blank, or restore a backup).
- Everything is stored in the browser's `localStorage`. There is no backend, no account and no network call except the opt-in Asana API. V2 (accounts and sync) is not started; it is gated on the design decisions in the project doc `claude/v2-design-gate.md` and the readiness ledger.
- Security headers (Content-Security-Policy and others) are set in `vercel.json`. Scripts are same-origin only; the only foreign origin is `https://app.asana.com`.

## Storage keys

| Key | Scope | Holds |
| --- | --- | --- |
| `sb-subjects` | account | Subjects with their topics, subtasks, milestones, papers and metadata |
| `sb-sessions` | account | Logged study sessions |
| `sb-game` | account | Streak, XP (`legacyXP` only; XP itself is derived) and freezes |
| `sb-theme` | account | Selected theme |
| `sb-tombstones` | account | What was deleted and when |
| `sb-asana` | device | Asana integration settings (off until the user opts in) |
| `sb-asana-stats` | device | Last fetched Asana progress |
| `sb-onboarded` | device | First-run setup dismissed |
| `sb-last-streak-reminder` | device | Day the streak reminder last fired |
| `sb-last-milestone-reminder` | device | Day the milestone reminder last fired |
| `sb-timer` | device | The running timer, owned by one tab (`owner`, `heldAt`); other tabs never copy or write it |
| `sb-session-draft` | device | The unlogged session's note, tags and topic; written only by the tab that owns the timer |
| `sb-schema` | device | Stored-data schema version (currently 3) |
| `studybox_asana_pat` | secret | Asana personal access token, plain text, legacy name |

`account` keys are what backups carry and what sync will carry; `device` keys stay on this browser; `secret` keys are never backed up, synced or passed to store subscribers.

## Store layer

- `src/store/localStore.js` is the only code that touches `localStorage` (ESLint enforces it). It exports `STORAGE_KEYS`, `SECRET_KEYS`, `KEY_SCOPES`, `loadJson` / `saveJson` / `loadText` / `saveText` / `removeKey`, and `subscribe`.
- `subscribe` reports every change as `{ key, scope, type, value }` with `type` one of `write`, `remove`, `external` (another tab, via the `storage` event) and `error` (a write that failed, e.g. storage full; the app keeps running and shows a banner with a backup download).
- `usePersistedState(key, load, merge?)` is React state that persists itself and merges other tabs' changes with the same record merge as "Merge from file", writing back at most once per external change.
- `src/store/appState.js` holds each key's loader and tab merge, and `storedBackup()` (the error boundary's backup, built from storage, never React state). `src/store/migrations.js` runs stored-data migrations before the app reads storage.

## Data model

- **Subject:** `id`, `name`, `color`, `qualification` (`gcse` / `alevel` / `as` / `other`), `board` (`AQA`, `Edexcel`, `OCR`, `Eduqas`, `WJEC`, `CCEA`, `Custom`), `spec`, `specName`, `tier` (`foundation` / `higher`, GCSE only, else `null`), legacy `exam` label, `topics`; optional `papers: [{ id, name, examDate? }]`, `examYear` (summer series sat), `milestones`.
- **Topic:** `id`, `name`, `done`, `subtasks`; optional `paper` (one paper id or a list), `higherOnly`, `keepAsTopic`, `catalogueTopicId`.
- **Milestone:** `id`, `name`, `kind` (`nea` / `practical` / `coursework` / `other`), `due` (`YYYY-MM-DD` or `null`), `done`. Milestones never award XP.
- **Session:** `id`, `subjectId`, `subjectName`, `subjectColor`, `duration` (seconds), `date`, `note`, `tags`.
- **Sync-safe records (schema v3):** new records get `newId` (prefixed UUID); every edit stamps the record it changes with `touch` (`createdAt` / `updatedAt`, optional, never invented by normalizers); every delete of a subject, topic, milestone or session writes a tombstone to `sb-tombstones`; `mergeData` in `src/utils/merge.js` is the single merge (last write wins per record). Ids are untrusted strings and are only ever looked up by own key.
- **XP** is always `deriveXP(sessions, subjects) + legacyXP`: one per minute studied plus 10 per completed topic. Nothing increments it, so deleting or unticking takes XP back.
- **Backups** are JSON with `version: 3`. Unversioned, v1, v2 and v3 files all load; a newer version is refused. Restore replaces; Merge combines (undoable until the next import or reload). Deletes are undoable from the undo bar.
- **Catalogue:** 72 real specifications (AQA, Edexcel, OCR) bundled in `src/data/specs/`, with papers, topics, option groups and milestones; published summer 2027 exam dates drive the countdown and pacing for subjects sat in 2027.

## Rules that do not bend

- Backwards compatibility: data written by any earlier version, and every backup version, loads with no loss. New fields are optional and defaulted in the normalizers.
- `defaultSubjects()` returns the frozen A-level example set and `isUntouchedDefaultSubjects` detects an untouched install. Keep a test for both whenever `subjects.js` changes.
- Pure logic in `src/utils/*.js` or `src/store/*.js` with a sibling `*.test.js`; views in `src/components/*.jsx` with a sibling `*.test.jsx`. `App.jsx` only gets smaller.
- No backend, accounts, new third-party service or runtime dependency without asking first.

## Workflow

- Every change goes through the `git-workflow` skill: a branch off `origin/master`, in the session's own worktree and claimed at once with a draft PR, named `fix/` (patch bump), `feat/` (minor bump), `refactor/` (major bump, used only for zero-behaviour restructures) or `chore/` (no bump, no tag: tooling, docs, config, and zero-behaviour restructures while `v2.0.0` is reserved for accounts and sync). Then a PR, green CI (`npm run lint`, `npm test`, `npm run build`), and for `feat/` and `refactor/` the review gate (`release-reviewer`, then `release-fixer`, at most two rounds) before merging. Branches merge one at a time and take their version from the latest tag at merge time, then a tag and a GitHub release. The goal's Parallel lanes table says which items can run at once, and which model each needs. The `orchestrate` skill runs them as separate full sessions: one coordinator, up to 3 workers, each session's model chosen by risk (Critical: stored data model, merge, tombstones → Opus 5.5 with two independent reviews; High: anything that can lose data, reviews, plans → Opus 5.5; Standard: one component or hook → Sonnet 5.5; Mechanical: config, release notes → Haiku 4.5). Workers stop at a ready PR and only the coordinator merges.
- Reproduce before fixing: every bug gets a failing test first.
- The V2 readiness process: the `readiness-pass` skill audits `master` against `docs/readiness/findings.md` and writes a dated report in `docs/readiness/`. The current goal (Phase A: stop losing data; Phase C: shape the client for sync) is `.claude/commands/goal.md`.
- `instruction.md` in the repo is the detailed reference and wins over this summary where they differ.
