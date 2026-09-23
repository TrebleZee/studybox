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
- `sb-last-milestone-reminder` - the local date (`YYYY-MM-DD`) the milestone-reminder notification last fired, so it never fires twice in one day
- `sb-subjects` also stores subjects created from uploaded specification PDFs, including inferred exam board and topic checklist

## Data model

- Subjects include `id`, `name`, `qualification`, `board`, `spec`, `specName`, `tier`, `exam`, `color`, and `topics`.
  - `qualification` is one of `QUALIFICATIONS` (`gcse`, `alevel`, `as`, `other`); `board` one of `BOARDS` (`AQA`, `Edexcel`, `OCR`, `Eduqas`, `WJEC`, `CCEA`, `Custom`); `tier` one of `TIERS` (`foundation`, `higher`) or `null`, and always `null` unless `qualification === "gcse"`. `spec` (e.g. `H556`) and `specName` (e.g. `Physics A`) are strings or `null`. All constants live in `src/utils/subjects.js`.
  - `exam` is a legacy string kept so older app versions reading a backup still show something. For real boards it is derived (`board` + `specName`); for `Custom` it is the user's free-text label. Don't render it directly - use `subjectLabel(subject)` (e.g. `OCR A-level Physics A`, `AQA GCSE Maths (Higher)`, or the free text for `Custom`).
  - Migration lives in `normalizeSubjects`, which every load path (storage, backup restore, templates) runs through. Subjects stored before v1.3.0 have no `board`: the built-in preset ids map to exact metadata (only while their `exam` still matches the preset's original label), anything else has its `exam` parsed for a board name, else `board: "Custom"`, `qualification: "other"`. Normalization is idempotent.
  - Edits go through `updateSubjectFields(subject, patch)`, which re-derives `exam`/`tier` without touching other fields.
- Subjects may carry `papers: [{ id, name, examDate? }]` (copied from the catalogue by `subjectFromSpec`). The key is omitted when there are none, so older subjects normalize exactly as before. `examDate` is the user's own exam date for that paper (a local calendar date `YYYY-MM-DD`, set in Settings → Edit Subjects → Exam dates); it is kept only when valid and omitted otherwise. Published timetable dates are never copied onto subjects (see Exam dates and pacing).
- Subjects may carry `examYear` (an integer, the summer series they are sat in), set in the picker or in Settings → Edit Subjects → Exam dates. The key is omitted when unset or invalid.
- Topics may carry `paper` (one paper id, or a list when examined on several papers; read it with `topicPapers`) and `higherOnly: true` (the key is omitted when false), and `keepAsTopic: true` once the user declines the NEA-to-milestone offer for it (omitted otherwise). Both are optional and editable from the expanded topic in the planner (paper select when the subject has papers; "Higher tier only" for GCSE subjects).
  - `inTierTopics(subject)` drops higher-only topics for a Foundation GCSE; `subjectProgress`, the planner's done count and the Analysis topic figures all use it. `paperProgress(subject, paperId)` is the in-tier progress on one paper (topics shared across papers count for each).
  - `groupTopicsByPaper(subject, topics)` returns one group per distinct paper combination in paper order ("All papers" when a topic is on every paper), then "Other" for topics without a known paper; it returns `[]` when no topic has a paper, and `TopicList` then renders the flat list exactly as before (pinned by a snapshot recorded before papers existed).
  - Foundation subjects hide higher-only topics by default behind a "Show higher-tier topics" toggle (state lives in `TopicList`).
- Subjects may carry `milestones: [{ id, name, kind, due, done }]` (plus `catalogueMilestoneId` when seeded from the catalogue). `kind` is one of `MILESTONE_KINDS` (`nea`, `practical`, `coursework`, `other`); `due` is a local calendar date `YYYY-MM-DD` or `null`. The key is omitted when there are none. Milestones never award XP or affect streaks (`gameLogic.js` doesn't know about them).
- Topics include `id`, `name`, `done` and `subtasks`. Topics seeded from the spec catalogue also carry `catalogueTopicId` (the catalogue topic they came from, so a later "reset to spec" can match them up); user-created topics have none. Seeded topics are freely editable. `normalizeSubjects` keeps `catalogueTopicId` only when it is a string.
- Backups carry `version: 2` (`BACKUP_VERSION` in `src/utils/backup.js`). `parseBackup` loads unversioned, v1 and v2 files (v1 subjects are migrated), and refuses a higher version rather than silently dropping fields it doesn't know. Optional, additive fields (e.g. `catalogueTopicId`, `papers`, topic `paper`, `higherOnly`) don't bump the version: older builds ignore them and the rest of the backup still loads. Bump `BACKUP_VERSION` only for changes an older build would misread (renamed, removed or re-typed fields, or changed meaning).
- Sessions include `id`, `subjectId`, `subjectName`, `subjectColor`, `duration`, `date`, `note`, and `tags`.

## Spec catalogue

- Current coverage (72 specs):
  - GCSE Maths, English Language, English Literature and Combined Science on AQA (8300, 8700, 8702, 8464 Trilogy, 8465 Synergy), Edexcel (1MA1, 1EN0, 1ET0, 1SC0) and OCR (J560, J351, J352, J250, J260).
  - A-level (Wave 2): Maths, Further Maths, Psychology, Biology, Chemistry, Business, Physics, History, Sociology, Art and Design, Economics and Computer Science on every board that offers them, including spec variants (OCR A/B, MEI, Salters, Advancing; Edexcel A/B) and every Art and Design endorsed title. Pearson Edexcel has no A-level Sociology or Computer Science.
  - Withdrawn specs stay listed until their last exam: OCR H431 Business (`lastExam: 2027`, replaced by H436 from 2028) and OCR H606 Critical and Contextual Studies (`lastExam: 2028`).
  - Known limits of `optionGroups` (a single `pick` count, used as guidance - see below): OCR H645 (MEI Further Maths) allows a major and a minor option *or* three minors, modelled as `pick: 2`; Edexcel 9HI0's Paper 2 option must share the Paper 1 route; AQA History's breadth/depth pairing rules and OCR H505's excluded unit pairs aren't enforced. The subject picker should explain these rather than block. When a board sits Foundation and Higher on different paper numbers (OCR J560, J250, J260), one paper entry covers the matching pair (e.g. "Paper 1 or 4") so dates and progress line up across tiers.
- One file per specification in `src/data/specs/`, named `<board>-<spec>.json` in lowercase (e.g. `ocr-h556.json`); the file name must equal the spec's `id`.
- Schema: `id`, `qualification` (`gcse`/`alevel`/`as`), `board` (a real entry of `BOARDS`), `spec`, `subject`, `specName` (string or `null`), `specVersion`, `firstExam`, `lastExam` (year or `null`), `specUrl` (the board's spec PDF, https), `tiers` (`null` or a list of `TIERS`, GCSE only), `papers` (`[{ id, name }]`), `topics` (`[{ id, name, paper, higherOnly }]`), `optionGroups` (`[{ id, name, pick, options: [{ id, name, topicIds }] }]`) and `milestones` (`[{ id: "<spec id>-mNN", name, kind }]`, seeded onto subjects undated and not done: OCR H446 NEA, OCR H556 practical endorsement, AQA 8464 / Edexcel 1SC0 / OCR J250, J260 practicals, and the spoken language endorsement on AQA 8700, Edexcel 1EN0, OCR J351). Optional `deprecated: true` retires a spec.
  - A topic's `paper` is one paper id, or a list of ids when the topic is examined on several papers (e.g. A-level Maths pure content on papers 1 and 2). Use `topicPapers(topic)` to read it.
  - Topics listed in an option are only seeded when that option is picked (`subjectFromSpec(spec, { optionIds })`).
  - `pick` is the number of options a student usually takes in that group. It is guidance, not a limit: every picked option is seeded (tested), and the subject picker shows it as a hint rather than enforcing it, because some courses legitimately take more (Art titles allow "one or more" areas; MEI Further Maths Route C takes three minors).
  - A single PDF can cover several catalogue specs (each board's Art and Design titles). `inferSpecCode` then returns the other equal codes as `alternatives` (including every code in a short range like "H600–H606"), and the PDF import asks which title the student takes instead of guessing.
  - Topic ids are `<spec id>-tNN`. Spec ids and topic ids are permanent once merged: rename `name`, never `id`; retire with `deprecated: true`, never delete. New topics are appended with new ids.
  - Topic headings only, phrased plainly. No spec prose and no exam questions.
  - Every tiered spec has at least one `higherOnly` topic (tested). Higher-only topics are appended as their own headings, taken from what the board marks as higher tier: AQA's "Higher content only" column or "(HT only)" labels, Edexcel's separate Foundation/Higher lists or bold statements, OCR's "Higher tier learners should additionally" column or bold statements. Only content that is wholly higher tier becomes a higher-only topic.
- `src/data/specs/index.json` is the lightweight search index (`id`, `qualification`, `board`, `spec`, `subject`, `specName`). It is generated by `scripts/build-spec-index.js` (npm `prebuild`/`pretest`); never edit it by hand.
- `src/utils/catalogue.js`: `listSpecs(filters)` searches the index; `loadSpec(id)` loads a spec lazily (each file is its own chunk via `import.meta.glob`, so the main bundle carries only the index); `subjectFromSpec(spec, { tier, optionIds, color, id })` returns a normalized subject; `subjectsForTemplate(templateId)` (async) builds any onboarding template; `validateSpec`/`validateCatalogue` are the schema checks run by `catalogue.test.js`.
- The workbox `globPatterns` in `vite.config.js` must keep precaching the spec chunks so catalogue-backed templates work offline.

## Subject picker

- `src/components/SubjectPicker.jsx` picks subjects from the catalogue: search (`listSpecs`) with a level filter (All / GCSE / A-level), results grouped by subject and level (`groupSpecsBySubject`), then board → spec (when a board has several, e.g. OCR Maths A and B) → tier (tiered GCSEs; required) → exam year ("When do you sit the exams?", from `examYearChoices(spec)`: three summers from 2027 or the spec's first exam, up to its last exam, plus "Not sure yet"; the first is preselected) → option groups (radio for `pick: 1`, checkboxes otherwise; `pick` is shown as a hint and options can be left for later). Each step's heading takes focus.
- Modes: `single` (Settings: "Add from catalogue" in `AddSubjectCard`) calls `onConfirm([subject])`; `multi` (onboarding: "Choose my subjects") builds a list, GCSE and A-level mixed, and calls `onConfirm(list)` on Finish. All picker state lives in the picker.
- A spec already present (same board and spec code, `specAlreadyAdded`), or already chosen in this pass, is shown as "already added" and can't be picked again.
- New subjects get colours from `src/utils/palette.js` (`pickColors`), avoiding colours already in use.
- App receives the finished subjects through the existing `addSubject` handler, which now also accepts a list (each subject gets a unique id), or `startWithSubjects` from onboarding (replaces the untouched placeholder list and dismisses onboarding).

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
  - `addSubject` in `App.jsx` accepts one subject or a list (the catalogue picker); topics are names, or objects carrying `catalogueTopicId`, `paper` and `higherOnly`.
- The add and edit subject cards share `src/components/settings/SubjectMetaFields.jsx` for qualification, board, tier (GCSE only), spec code and, for `Custom` boards, a free-text exam label. Changing the board clears the spec code and spec name.
- Theme changes should update the app surfaces and borders without changing subject colors.
- Session tags should be entered freely and also support quick suggestions such as `Past papers`, `Blurting`, and `Recap`.

## Milestones

- Pure helpers live in `src/utils/milestones.js`: `daysUntil` / `isOverdue` / `dueLabel` treat due dates as local calendar days (Europe/London users see a milestone as due today all day, across midnight and clock changes); `allMilestones` flattens subjects sorted by due date, undated last; `neaTopicCandidates` / `convertTopicToMilestone` handle NEA topics.
- `src/components/MilestoneStrip.jsx` sits above the topic list in the planner: every subject's milestones, soonest first, overdue ones highlighted, with add / edit / complete / delete inline (its form state lives in the strip). Completed milestones sit behind a toggle.
- A topic whose name matches `/NEA/i` gets a "Convert to milestone" offer. It is opt-in and two-step: the topic stays until the user confirms, and the confirm text says how many subtasks will be deleted with it. "Keep as topic" sets `keepAsTopic: true` on the topic, so the offer stays gone across views, reloads and backups. Never convert silently.
- Reminder: `milestonesToRemind` / `shouldShowMilestoneReminder` in `src/utils/reminders.js` pick milestones that are not done, dated, and due between today and 3 days ahead (overdue ones don't re-notify), at most once per local day via `sb-last-milestone-reminder`. `src/hooks/useMilestoneReminder.js` mirrors the streak reminder's Notification flow (permission asked at most once per app session and only when something is due soon; silent when denied or unsupported).

## Exam dates and pacing

- `src/data/exam-dates-2027.json` holds the summer 2027 dates as `{ "<spec id>": { "<paper id>": "YYYY-MM-DD" } }`, taken from the boards' published timetables (AQA GCSE provisional; AQA A-level, Pearson and OCR final). Only confirmed dates are listed; papers with no written exam (Art, NEA components) and specs not examined in 2027 (OCR H436, first exam 2028) are left out. A test checks every entry names a real catalogue spec and paper and falls in May–June 2027. Replace the file (and its import in `pacing.js`) each year; never fetch dates over the network.
- A paper's date is the user's `examDate` if set, otherwise, **only when the subject's `examYear` is `PUBLISHED_EXAM_YEAR` (2027)**, the file's date for `<board>-<spec>` (lowercase) and the paper id (`paperExamDate`). A Year 10 or Year 12 student sitting in 2028, or a subject with no `examYear` (every subject created before v1.11.0, templates, manual and PDF adds), gets no published dates, so they are never counted down or paced against a series they aren't sitting. User dates always win, and clearing one falls back to the published date. Subjects without papers or off the catalogue only have dates the user adds.
- `src/utils/pacing.js` is pure and takes `now`: `nextExam(subjects, now)`, `weeksLeft(date, now)` (whole weeks rounded up, 0 on the day, `null` once past), `topicsLeft(subject)` (in-tier, not done) and `pace(subject, now)` → `{ topicsLeft, weeksLeft, perWeek, status, exam }` or `null` when there's no exam to come or no in-tier topic. Dates are local calendar days, like milestones.
- Pace rule: the deadline is the subject's next exam. Expected progress is how far through the school year (from 1 September) that exam falls in today is; actual progress is the share of in-tier topics done. More than `PACE_MARGIN` (10) points ahead is `ahead`, more than 10 behind is `behind`, otherwise `on-track`. `perWeek` is `ceil(topicsLeft / max(weeksLeft, 1))`.
- UI: `ExamCountdown` in `TopBar` (next exam across subjects) and `ExamPacingCard` in `AnalysisPanel` (one row per subject with an exam to come, following the subject filter). Both render nothing when no subject has an upcoming exam. `settings/PaperDatesFields` shows each paper's date in Edit Subjects, with "Use published" to drop a user date.
- No XP, streak or reminder effects.

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
