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
- Subjects may carry `papers: [{ id, name }]` (copied from the catalogue by `subjectFromSpec`). The key is omitted when there are none, so older subjects normalize exactly as before.
- Topics may carry `paper` (one paper id, or a list when examined on several papers; read it with `topicPapers`) and `higherOnly: true` (the key is omitted when false). Both are optional and editable from the expanded topic in the planner (paper select when the subject has papers; "Higher tier only" for GCSE subjects).
  - `inTierTopics(subject)` drops higher-only topics for a Foundation GCSE; `subjectProgress`, the planner's done count and the Analysis topic figures all use it. `paperProgress(subject, paperId)` is the in-tier progress on one paper (topics shared across papers count for each).
  - `groupTopicsByPaper(subject, topics)` returns one group per distinct paper combination in paper order ("All papers" when a topic is on every paper), then "Other" for topics without a known paper; it returns `[]` when no topic has a paper, and `TopicList` then renders the flat list exactly as before (pinned by a snapshot recorded before papers existed).
  - Foundation subjects hide higher-only topics by default behind a "Show higher-tier topics" toggle (state lives in `TopicList`).
- Topics include `id`, `name`, `done` and `subtasks`. Topics seeded from the spec catalogue also carry `catalogueTopicId` (the catalogue topic they came from, so a later "reset to spec" can match them up); user-created topics have none. Seeded topics are freely editable. `normalizeSubjects` keeps `catalogueTopicId` only when it is a string.
- Backups carry `version: 2` (`BACKUP_VERSION` in `src/utils/backup.js`). `parseBackup` loads unversioned, v1 and v2 files (v1 subjects are migrated), and refuses a higher version rather than silently dropping fields it doesn't know. Optional, additive fields (e.g. `catalogueTopicId`, `papers`, topic `paper`, `higherOnly`) don't bump the version: older builds ignore them and the rest of the backup still loads. Bump `BACKUP_VERSION` only for changes an older build would misread (renamed, removed or re-typed fields, or changed meaning).
- Sessions include `id`, `subjectId`, `subjectName`, `subjectColor`, `duration`, `date`, `note`, and `tags`.

## Spec catalogue

- Current coverage: GCSE Maths, English Language, English Literature and Combined Science on AQA (8300, 8700, 8702, 8464), Edexcel (1MA1, 1EN0, 1ET0, 1SC0) and OCR (J560, J351, J352, J250, J260), plus A-level OCR H556, H446 and Edexcel 9MA0, 9FM0. When a board sits Foundation and Higher on different paper numbers (OCR J560, J250, J260), one paper entry covers the matching pair (e.g. "Paper 1 or 4") so dates and progress line up across tiers.
- One file per specification in `src/data/specs/`, named `<board>-<spec>.json` in lowercase (e.g. `ocr-h556.json`); the file name must equal the spec's `id`.
- Schema: `id`, `qualification` (`gcse`/`alevel`/`as`), `board` (a real entry of `BOARDS`), `spec`, `subject`, `specName` (string or `null`), `specVersion`, `firstExam`, `lastExam` (year or `null`), `specUrl` (the board's spec PDF, https), `tiers` (`null` or a list of `TIERS`, GCSE only), `papers` (`[{ id, name }]`), `topics` (`[{ id, name, paper, higherOnly }]`), `optionGroups` (`[{ id, name, pick, options: [{ id, name, topicIds }] }]`) and `milestones` (`[]` until F6). Optional `deprecated: true` retires a spec.
  - A topic's `paper` is one paper id, or a list of ids when the topic is examined on several papers (e.g. A-level Maths pure content on papers 1 and 2). Use `topicPapers(topic)` to read it.
  - Topics listed in an option are only seeded when that option is picked (`subjectFromSpec(spec, { optionIds })`).
  - Topic ids are `<spec id>-tNN`. Spec ids and topic ids are permanent once merged: rename `name`, never `id`; retire with `deprecated: true`, never delete. New topics are appended with new ids.
  - Topic headings only, phrased plainly. No spec prose and no exam questions.
  - Every tiered spec has at least one `higherOnly` topic (tested). Higher-only topics are appended as their own headings, taken from what the board marks as higher tier: AQA's "Higher content only" column or "(HT only)" labels, Edexcel's separate Foundation/Higher lists or bold statements, OCR's "Higher tier learners should additionally" column or bold statements. Only content that is wholly higher tier becomes a higher-only topic.
- `src/data/specs/index.json` is the lightweight search index (`id`, `qualification`, `board`, `spec`, `subject`, `specName`). It is generated by `scripts/build-spec-index.js` (npm `prebuild`/`pretest`); never edit it by hand.
- `src/utils/catalogue.js`: `listSpecs(filters)` searches the index; `loadSpec(id)` loads a spec lazily (each file is its own chunk via `import.meta.glob`, so the main bundle carries only the index); `subjectFromSpec(spec, { tier, optionIds, color, id })` returns a normalized subject; `subjectsForTemplate(templateId)` (async) builds any onboarding template; `validateSpec`/`validateCatalogue` are the schema checks run by `catalogue.test.js`.
- The workbox `globPatterns` in `vite.config.js` must keep precaching the spec chunks so catalogue-backed templates work offline.

## Authoring specs

- `npm run draft-spec -- <pdf path or https URL> --board <Board> --spec <code> --qualification gcse|alevel|as --subject "<Subject>"` writes a draft to `drafts/<id>.json` (gitignored). It is dev-only and never writes into `src/data/specs/`.
  - `--depth 2|3|leaf` picks the heading level (`leaf` keeps the deepest heading on each branch, for mixed-depth specs such as AQA GCSE Maths); `--layout stacked` reads Pearson's number-on-its-own-line tables; `--sections 4,5,6` keeps only those chapters; `--tiered` marks a GCSE as foundation/higher; `--dump-text` also writes the extracted text to `drafts/<id>.txt`.
  - Parsing is pure and tested in `scripts/lib/specDraft.js`; the CLI (`scripts/draft-spec.js`) only reads the PDF with pdf.js and writes files.
- A draft deliberately fails `validateSpec` (`paper: "TODO"`, `firstExam: null`, `specVersion: "TODO"`). To finish one: check every heading against the PDF and drop non-topic ones; rephrase any heading that reads like spec prose; assign `paper` (one id or a list), `higherOnly` and option groups; fill `specVersion`, `firstExam` and `specUrl`; delete the `_source` fields; then move the file into `src/data/specs/` and run `npm test`.

## Customization rules

- Any subject can be edited or deleted from Settings, including the example subjects.
- The example subjects are only an optional starting template chosen during onboarding. `TEMPLATES` in `src/utils/subjects.js` lists every selectable template (currently A-Level and GCSE); `defaultSubjects()` always returns the A-Level set specifically, since it also doubles as the "untouched" placeholder `isUntouchedDefaultSubjects` checks against before onboarding is dismissed. `defaultSubjects()` output is frozen (no metadata fields); `isUntouchedDefaultSubjects` compares normalized forms so the check survives normalization adding fields. Keep a test for both whenever `subjects.js` changes. A template lists either `presets` (built from `TOPIC_SEED`; the A-Level default, which must stay untouched) or `specs` (catalogue spec ids plus colour and option picks; the GCSE template). Use the async `subjectsForTemplate(id)` in `src/utils/catalogue.js` to build subjects for any template, including new ones.
- Custom subjects can still be added from Settings.
- A subject specification PDF can be uploaded from Settings to prefill the subject form with inferred name, exam board, and topics. PDF parsing lives in `src/utils/specImport.js` (pdf.js) and `src/utils/specInference.js` (pure, tested); `boardFromText` maps the inferred board onto `BOARDS`.
  - `inferSpecCode(text, fileName)` finds the spec code with its board (AQA `7xxx`/`8xxx` only next to "AQA", in an `aqa.org.uk/<code>` link or as `(<code>)` in a document naming AQA; Edexcel `9MA0`-style; OCR `H556`/`J560`-style). Codes near the board name, on the first pages or in the file name win; a code for a board the document never names is ignored. `inferQualification` reads GCSE / A-level / AS from the cover pages.
  - If `findSpec(board, code)` (in `catalogue.js`) hits, `AddSubjectCard` fills name and metadata from the catalogue and offers "Use StudyBox's topic list for <label>" (default) or "Use topics read from the PDF". Catalogue topics are created with `catalogueTopicId`; option-group topics (set texts, optional papers) are not seeded here. On a miss the flow is unchanged except that board, spec code and qualification are prefilled when detected.
  - `addSubject` in `App.jsx` accepts topics as names or `{ name, catalogueTopicId }`.
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

## Line endings

- `.gitattributes` pins text files to LF on every platform (`* text=auto eol=lf`) and marks images, PDFs and fonts as binary. Scripts that write files (e.g. `scripts/build-spec-index.js`) should write LF.

## Code layout

- Keep pure logic in `src/utils/` with a sibling `*.test.js`; keep views in `src/components/` with a `*.test.jsx`.
- `App.jsx` should stay a thin shell; move view-specific state into the view that uses it.
