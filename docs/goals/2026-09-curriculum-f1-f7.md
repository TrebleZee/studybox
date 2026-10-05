# Goal: board-specific GCSE and A-level subjects (F1–F7)

Deliver features F1 to F7 from the StudyBox Curriculum Design Doc, plus catalogue Waves 1 and 2, in the release order in rule 2 (updated 2026-09-22), each as its own branch, PR and release. When done, any student on an AQA, Pearson Edexcel or OCR spec for the core GCSE and A-level subjects can set up accurate subjects, see topics by paper and tier, track NEA/practical milestones and see exam pacing. All of it stays local-first (no backend).

Roadmap (release order and dates): https://claude.ai/code/artifact/87be0685-c555-4b5b-b7d0-81aa3b21d1bf
Design doc: https://claude.ai/code/artifact/3fce7d3d-d0ad-45d4-8467-97c49cd3c485
Research: https://claude.ai/code/artifact/6d92591c-7ae8-4841-beb9-2dee7c2ae6fd

## Ground rules (apply to every feature)

1. **Use the `/git-workflow` skill for every feature.** Never commit to `master`. Branch off an up-to-date `master` with the branch name given below. Features and waves are `feat/` (minor bump); tooling and config PRs are `chore/` (no bump).
2. **Release order and expected versions (updated 2026-09-22):** F1 `v1.3.0` (shipped) → F2 `v1.4.0` → `chore/line-endings` (`.gitattributes`, no bump) → `chore/catalogue-authoring` (dev-only PDF → draft spec JSON script, no bump) → `feat/catalogue-wave-1` `v1.5.0` (GCSE Maths, Eng Lang, Eng Lit, Combined Science on AQA/Edexcel/OCR) → F4 `v1.6.0` → F5 `v1.7.0` → F6 `v1.8.0` → `feat/catalogue-wave-2` `v1.9.0` (A-level top 10 + Further Maths + CS on AQA/Edexcel/OCR) → F3 `v1.10.0` → F7 `v1.11.0`. **F3 must not merge until Waves 1 and 2 are on `master`** (merging deploys). One `feat/` PR per wave, never per spec; wave files include `paper` and `higherOnly` tags. Tags are the source of truth; sync `package.json` after tagging. If the latest tag differs when you start, bump from whatever it actually is.
3. **Green before PR:** `npm run lint`, `npm test`, `npm run build` all pass. Never hand over a red branch.
4. **Conventions:** pure logic in `src/utils/*.js` with a sibling `*.test.js`; JSX in `src/components/*.jsx` with a sibling `*.test.jsx`. `App.jsx` stays a thin shell: view-specific state lives in the view or component that uses it.
5. **Backwards compatibility is non-negotiable.** Existing `localStorage` data (`sb-*` keys) and v1 backup files must load with no loss. All new fields are optional and defaulted in `normalizeSubjects`.
6. **Onboarding guard:** `defaultSubjects()` must always return the frozen A-level set, and `isUntouchedDefaultSubjects` must keep detecting an untouched install. Add or keep a test for this in every feature that touches `subjects.js`.
7. **Catalogue ids are permanent.** Spec ids and topic ids never change once merged. Rename `name`, never `id`; retire with `deprecated: true`, never delete.
8. **No copyrighted spec text.** Topic headings only, phrased plainly. No spec prose, no exam questions.
9. **Keep docs current:** update `instruction.md` (data model, storage, rules) and `README.md` feature list in the same PR as the change.
10. **Do not touch** the uncommitted changes to `README.md` / `index.html` that were in the working tree before this goal started. If they block `git checkout master`, stash them with a clear message and say so in the final report.
11. Commits and PRs end with the attribution lines your environment specifies.

## Decisions already made (do not re-ask)

- Catalogue-seeded topics are freely editable. Each seeded topic stores `catalogueTopicId` so a later "reset to spec" is possible; user-created topics have none.
- Exam dates: seeded from a yearly data file, always user-overridable. No network fetching.
- Milestones do **not** award XP or affect streaks. `gameLogic.js` is untouched.
- The Asana pseudo-subject keeps its own `asanaCfg.exam` label and is not given board/spec fields.

---

## F1 Subject metadata

**Branch:** `feat/subject-metadata`

**Build**

- Subjects gain: `qualification` (`"gcse" | "alevel" | "as" | "other"`), `board` (`"AQA" | "Edexcel" | "OCR" | "Eduqas" | "WJEC" | "CCEA" | "Custom"`), `spec` (string or `null`), `specName` (string or `null`, e.g. `"Physics A"`), `tier` (`"foundation" | "higher" | null`).
- Export the allowed values as constants from `src/utils/subjects.js` (`QUALIFICATIONS`, `BOARDS`, `TIERS`).
- Migration in `normalizeSubjects`:
  - Known preset ids map exactly: `physics` → alevel/OCR/H556/Physics A; `maths` → alevel/Edexcel/9MA0; `further` → alevel/Edexcel/9FM0; `cs` → alevel/OCR/H446; `gcse-english` → gcse/AQA; `gcse-maths` → gcse/AQA/8300; `gcse-science` → gcse/AQA/8464/Combined Science Trilogy.
  - Otherwise parse `exam` case-insensitively for a known board name; else `board: "Custom"`, `qualification: "other"`.
  - `tier` is forced to `null` unless `qualification === "gcse"`.
- Add pure `subjectLabel(subject)` returning e.g. `"OCR A-level Physics A"`, `"AQA GCSE Maths (Higher)"`, or the old `exam` text for `Custom`. Replace raw `subject.exam` rendering in `SubjectSidebar`, `TopicList`, `EditSessionModal`.
- Keep writing `exam` as a derived string (`board` + `specName`) for this release so older app versions reading a backup still show something.
- `AddSubjectCard` and `EditSubjectsCard`: replace the free-text exam input with Qualification, Board, Tier (GCSE only) selects and an optional Spec code input. PDF import prefills `board` from `inferExamBoard`.
- Move `src/specImport.js` and `src/specInference.js` into `src/utils/`, update imports, add `specInference.test.js` covering `inferExamBoard`.
- `backup.js`: `BACKUP_VERSION = 2`. `parseBackup` accepts v1 and v2.

**Done when**

- [ ] A realistic v1.2.1 `sb-subjects` fixture (presets + a custom subject + a PDF-imported subject) normalizes with all new fields populated and no topic/progress loss (test).
- [ ] v1 and v2 backups both round-trip (test).
- [ ] Onboarding guard test passes.
- [ ] Tier select renders only for GCSE (component test).
- [ ] Labels render via `subjectLabel` everywhere a subject's board used to show.

## F2 Spec catalogue

**Branch:** `feat/spec-catalogue`

**Build**

- Directory `src/data/specs/`, one file per spec named `<board>-<spec>.json` in lowercase (e.g. `ocr-h556.json`, `aqa-8464.json`).
- Schema:
  ```json
  {
    "id": "ocr-h556",
    "qualification": "alevel",
    "board": "OCR",
    "spec": "H556",
    "subject": "Physics",
    "specName": "Physics A",
    "specVersion": "2015",
    "firstExam": 2017,
    "lastExam": null,
    "specUrl": "https://...",
    "tiers": null,
    "papers": [{ "id": "p1", "name": "Modelling physics" }],
    "topics": [{ "id": "ocr-h556-t01", "name": "Foundations of physics", "paper": "p1", "higherOnly": false }],
    "optionGroups": [],
    "milestones": []
  }
  ```
  `optionGroups`: `[{ "id", "name", "pick": <n>, "options": [{ "id", "name", "topicIds": [] }] }]`. Topics listed in any option are only seeded when that option is picked. `milestones` is used from F6; ship it as `[]` now.
- `src/data/specs/index.json`: lightweight list (`id`, `qualification`, `board`, `spec`, `subject`, `specName`) used for search. Generate it with a small script `scripts/build-spec-index.js` run by a `prebuild` and `pretest` npm script, so it can never drift.
- `src/utils/catalogue.js`: `listSpecs(filters)`, `loadSpec(id)` (via `import.meta.glob` so each spec is its own chunk), `subjectFromSpec(spec, { tier, optionIds, color })` returning a normalized subject with `catalogueTopicId` on each topic.
- Ensure the workbox precache pattern in `vite.config.js` includes the JSON chunks (onboarding must work offline).
- `catalogue.test.js`: every spec file validates against the schema; ids unique across the catalogue; each topic's `paper` exists in `papers`; option `topicIds` exist; file name matches `id`.
- Seed content (verify each heading list against the board's current spec PDF; put the PDF link in `specUrl`):
  - The existing presets, re-expressed: OCR H556, Edexcel 9MA0, Edexcel 9FM0 (core pure + option groups for the optional papers), OCR H446, AQA 8300, AQA 8464 Trilogy (full topic list across biology, chemistry and physics).
  - Split GCSE English into AQA 8700 English Language and AQA 8702 English Literature (set texts as option groups).
- Point the existing `gcse` template at catalogue specs. **Leave `ALEVEL_PRESETS` / `TOPIC_SEED` for the A-level default untouched** so `defaultSubjects()` output does not change.

**Done when**

- [ ] `catalogue.test.js` passes and fails on a deliberately broken fixture.
- [ ] Main JS bundle grows by no more than the index file (compare `npm run build` output before/after, note sizes in the PR).
- [ ] Offline: after one load, the GCSE template still works with the network off (`npm run preview` + DevTools offline; note the check in the PR).
- [ ] Onboarding guard test still passes.

## F3 Catalogue subject picker

**Branch:** `feat/subject-picker`

**Build**

- `src/components/SubjectPicker.jsx` (+ `SubjectPicker.test.jsx`): search box over `listSpecs`, level filter (GCSE / A-level), grouped results by subject, then a step for board → spec → tier (GCSE with tiers only) → option groups. Supports single mode (Settings) and multi mode (onboarding).
- Settings: an "Add from catalogue" entry in `AddSubjectCard` opens the picker. Custom add and PDF import remain.
- Onboarding: a new "Choose my subjects" option alongside Start blank / templates / restore. Existing template buttons stay.
- Auto-assign colours that are distinct from subjects already present.
- Picker state lives in the picker; `App.jsx` only receives the final subjects via the existing add handler.
- Accessibility: keyboard navigable, labelled inputs, focus moved sensibly between steps, works at 360px wide.
- Add the remaining high-priority specs so the picker is worth using: A-level Psychology, Biology, Chemistry, Business, History, Sociology, Economics, Maths and Physics on AQA, Edexcel and OCR where each board offers them; GCSE Maths, Eng Lang, Eng Lit, Combined Science on Edexcel and OCR as well as AQA.

**Done when**

- [ ] Component test: in one onboarding pass, add Edexcel GCSE Maths (Higher), AQA Eng Lang, AQA Eng Lit and AQA Combined Science Trilogy (Higher); resulting subjects carry correct metadata and topics.
- [ ] Choosing an option group seeds only that option's topics.
- [ ] Adding the same spec twice is prevented or clearly warned.
- [ ] Space-bar timer shortcut does not fire while typing in the picker search.

## F4 PDF import matches the catalogue

**Branch:** `feat/pdf-catalogue-match`

**Build**

- `inferSpecCode(text)` in `specInference.js`: detect spec codes (patterns like `H556`, `9MA0`, `8464`, `1MA1`, `J277`) with the board, preferring codes near the board name or on the first pages.
- In `AddSubjectCard`: on a catalogue hit, show "Use StudyBox's topic list for <label>" (default) vs "Use topics read from the PDF". On a miss, keep current behaviour but prefill `board`, `spec`, `qualification`.

**Done when**

- [ ] Unit tests with text fixtures for at least 5 real spec codes across 3 boards, plus false-positive cases (page numbers, years).
- [ ] Miss path behaves exactly as before apart from the prefilled fields.

## F5 Papers and higher-tier topics

**Branch:** `feat/papers-and-tiers`

**Build**

- Subjects may carry `papers[]` (copied from the catalogue); topics gain optional `paper` and `higherOnly`. Normalized as optional.
- `TopicList`: when any topic has a `paper`, group by paper with a per-paper progress bar; ungrouped topics under "Other". Subjects with no papers render exactly as today.
- Foundation-tier subjects hide `higherOnly` topics by default, with a "Show higher-tier topics" toggle.
- `subjectProgress` counts only in-tier topics. Add `paperProgress(subject, paperId)`.
- Users can set a topic's paper and higher-only flag when editing topics.
- Tag `paper` / `higherOnly` across all catalogue specs added so far.

**Done when**

- [ ] Foundation GCSE Maths progress ignores higher-only topics (test).
- [ ] Snapshot/behaviour test: a subject without papers renders unchanged.
- [ ] Catalogue test extended: GCSE tiered specs have at least one `higherOnly` topic.

## F6 Milestones

**Branch:** `feat/milestones`

**Build**

- Subjects gain `milestones: [{ id, name, kind, due, done }]`, `kind` in `"nea" | "practical" | "coursework" | "other"`, `due` an ISO date or `null`.
- Catalogue `milestones` seeded where they apply (e.g. OCR H446 NEA, A-level science practical endorsement, GCSE required practicals as a checklist milestone).
- `PlannerView`: a Milestones strip sorted by due date, overdue highlighted, add/edit/complete inline. Component in `src/components/MilestoneStrip.jsx` with test.
- Reminder: extend `src/utils/reminders.js` with a milestone-due-in-3-days check, reusing the existing Notification permission flow and the once-per-day rule (new storage key `sb-last-milestone-reminder`, documented in `instruction.md`).
- For existing subjects with a topic whose name matches `/\bNEA\b/i`, offer a one-click "Convert to milestone". Never convert silently.
- No XP or streak effects.

**Done when**

- [ ] Milestones survive backup round-trip.
- [ ] Reminder logic unit-tested (due in 3 days, overdue, done, no date, already fired today).
- [ ] Convert-to-milestone is opt-in and keeps the topic until the user confirms.

## F7 Exam dates and revision pacing

**Branch:** `feat/exam-pacing`

**Build**

- `src/data/exam-dates-2027.json`: `{ "<specId>": { "<paperId>": "YYYY-MM-DD" } }` for the specs in the catalogue, taken from the boards' published provisional timetables for summer 2027. If a date can't be confirmed, omit it rather than guess.
- Subjects' `papers[]` gain optional `examDate` (seeded from the dates file, user-editable in Settings; user value always wins).
- `src/utils/pacing.js` (+ tests): `nextExam(subjects, now)`, `weeksLeft`, `topicsLeft` (in-tier, not done), `pace(subject, now)` returning `{ topicsLeft, weeksLeft, perWeek, status: "ahead" | "on-track" | "behind" }` using a simple, documented rule.
- `TopBar`: countdown to next exam. `AnalysisPanel`: per-subject pacing row.
- Everything hides when no dates are set.

**Done when**

- [ ] Pacing tests cover: no dates, past exams, all topics done, foundation tier with higher-only topics.
- [ ] Countdown and pacing absent for a user with no dates (component test).
- [ ] Time zone: dates are treated as local calendar days (Europe/London users), tested around midnight.

---

## Stop and ask instead of guessing if

- A migration would drop or rename any existing field, or change `defaultSubjects()` output.
- A board's spec PDF can't be reached to verify a topic list (leave that spec out and list it in the final report).
- A feature needs a backend, account, or third-party service.
- Lint/test/build can't be made green without disabling a rule or skipping a test.

## Final report

After F7 is tagged, report: versions shipped with PR links, specs in the catalogue (id list), specs skipped and why, any stash made under rule 10, and any deviations from this file.
