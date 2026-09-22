# StudyBox Instructions

This file documents the app structure so future changes stay consistent.

## Core behavior

- StudyBox is a single-page React app with four views: `Planner`, `Log`, `Analysis`, and `Settings`, plus a first-run `Onboarding` screen.
- The app stores everything in `localStorage`; there is no backend sync.
- The study timer must remain accurate in background tabs and standalone PWA mode.

## Storage keys

- `sb-subjects` - subject list, topic completion, and custom subjects
- `sb-sessions` - logged study sessions
- `sb-theme` - selected UI theme
- `sb-game` - streak, XP and freeze state
- `sb-asana`, `sb-asana-stats` - optional Asana integration config (`enabled` is false until the user opts in)
- `sb-onboarded` - set once first-run setup is dismissed
- `sb-last-streak-reminder` - the local date (`YYYY-MM-DD`) the streak-reminder notification last fired, so it never fires twice in one day
- `sb-subjects` also stores subjects created from uploaded specification PDFs, including inferred exam board and topic checklist

## Data model

- Subjects include `id`, `name`, `qualification`, `board`, `spec`, `specName`, `tier`, `exam`, `color`, and `topics`.
  - `qualification` is one of `QUALIFICATIONS` (`gcse`, `alevel`, `as`, `other`); `board` one of `BOARDS` (`AQA`, `Edexcel`, `OCR`, `Eduqas`, `WJEC`, `CCEA`, `Custom`); `tier` one of `TIERS` (`foundation`, `higher`) or `null`, and always `null` unless `qualification === "gcse"`. `spec` (e.g. `H556`) and `specName` (e.g. `Physics A`) are strings or `null`. All constants live in `src/utils/subjects.js`.
  - `exam` is a legacy string kept so older app versions reading a backup still show something. For real boards it is derived (`board` + `specName`); for `Custom` it is the user's free-text label. Don't render it directly - use `subjectLabel(subject)` (e.g. `OCR A-level Physics A`, `AQA GCSE Maths (Higher)`, or the free text for `Custom`).
  - Migration lives in `normalizeSubjects`, which every load path (storage, backup restore, templates) runs through. Subjects stored before v1.3.0 have no `board`: the built-in preset ids map to exact metadata (only while their `exam` still matches the preset's original label), anything else has its `exam` parsed for a board name, else `board: "Custom"`, `qualification: "other"`. Normalization is idempotent.
  - Edits go through `updateSubjectFields(subject, patch)`, which re-derives `exam`/`tier` without touching other fields.
- Topics include `id`, `name`, and `done`.
- Backups carry `version: 2` (`BACKUP_VERSION` in `src/utils/backup.js`). `parseBackup` loads unversioned, v1 and v2 files (v1 subjects are migrated), and refuses a higher version rather than silently dropping fields it doesn't know.
- Sessions include `id`, `subjectId`, `subjectName`, `subjectColor`, `duration`, `date`, `note`, and `tags`.

## Customization rules

- Any subject can be edited or deleted from Settings, including the example subjects.
- The example subjects are only an optional starting template chosen during onboarding. `TEMPLATES` in `src/utils/subjects.js` lists every selectable template (currently A-Level and GCSE); `defaultSubjects()` always returns the A-Level set specifically, since it also doubles as the "untouched" placeholder `isUntouchedDefaultSubjects` checks against before onboarding is dismissed. `defaultSubjects()` output is frozen (no metadata fields); `isUntouchedDefaultSubjects` compares normalized forms so the check survives normalization adding fields. Keep a test for both whenever `subjects.js` changes. Use `subjectsForTemplate(id)` to build subjects for any template, including new ones.
- Custom subjects can still be added from Settings.
- A subject specification PDF can be uploaded from Settings to prefill the subject form with inferred name, exam board, and topics. PDF parsing lives in `src/utils/specImport.js` (pdf.js) and `src/utils/specInference.js` (pure, tested); `boardFromText` maps the inferred board onto `BOARDS`.
- The add and edit subject cards share `src/components/settings/SubjectMetaFields.jsx` for qualification, board, tier (GCSE only), spec code and, for `Custom` boards, a free-text exam label. Changing the board clears the spec code and spec name.
- Theme changes should update the app surfaces and borders without changing subject colors.
- Session tags should be entered freely and also support quick suggestions such as `Past papers`, `Blurting`, and `Recap`.

## Streak reminders

- Client-side only, via the browser Notification API - no push server, so it only fires while the app is open.
- The at-risk condition (`isStreakAtRisk` in `src/utils/gameLogic.js`) reuses `validateStreak`; don't duplicate streak-lapse logic elsewhere.
- Timing (evening threshold, once-per-day gating) is a separate pure function, `shouldShowStreakReminder` in `src/utils/reminders.js`, so it stays unit-testable without the Notification API.
- `src/hooks/useStreakReminder.js` is the only place that touches `Notification` directly: it requests permission at most once per app session and only when the streak is actually at risk that day, and stays silent if permission is denied or `Notification` doesn't exist.

## Editing guidance

- Keep the planner layout focused on subjects, topics, and the timer.
- Keep history entries compact, with tags shown as chips.
- Preserve the existing PWA support and local-only data model.
- `vite.config.js`'s workbox config must keep `navigateFallback: 'index.html'` set - without it, an offline reload or a fresh open of the installed PWA hits the browser's own offline error page instead of the cached app shell.

## Code layout

- Keep pure logic in `src/utils/` with a sibling `*.test.js`; keep views in `src/components/` with a `*.test.jsx`.
- `App.jsx` should stay a thin shell; move view-specific state into the view that uses it.
