# Review: feat/exam-pacing (PR #16, target v1.11.0)

Date: 2026-09-23 · Reviewer: release-reviewer · Fixes: branch owner
Round 1 verdict: blocked on one high finding (R1). It needed a design decision, which the branch owner made; the fix is below.

The reviewer confirmed these invariants:

- `examDate` is optional and kept by `normalizePapers` only when `isIsoDate` passes, so older data and backups load unchanged.
- The published-date lookup can't be tricked by prototype keys, because `isIsoDate` rejects anything that isn't a date string.
- `defaultSubjects`, the streak logic, the timer and `vite.config.js` are untouched.
- No catalogue ids changed and no dependencies were added.
- There are no unsafe HTML sinks, and the pure logic has a sibling test.

## Findings

| ID | Severity | Category | File | Summary | Outcome |
| --- | --- | --- | --- | --- | --- |
| R1 | high | correctness | src/utils/pacing.js:43 | The 2027 timetable applied to every subject on a covered spec. A Year 12 A-level or Year 10 GCSE student, who sits in 2028, got a countdown to exams they aren't sitting and a "Behind" pace against June 2027. | Fixed (see below). |

### The fix for R1

Subjects gain an optional `examYear`: an integer, defaulted in `normalizeSubjects`, and omitted when unset or invalid. It is additive, so no field is dropped or renamed and `defaultSubjects()` is unchanged.

- **`paperExamDate`** uses the published file only when `subject.examYear === PUBLISHED_EXAM_YEAR` (2027). The user's own paper dates still always win.
- **Existing subjects have no `examYear`, so they get no published dates.** The countdown and pacing stay hidden until the student sets a year in Settings or adds their own dates. This covers every subject created before this release, plus templates and manual or PDF adds. The trade-off is deliberate: showing nothing is better than showing the wrong series.
- **Picker:** the details step asks "When do you sit the exams?". The options are three summers from 2027, or from the spec's first exam if that is later, up to its last exam, plus "Not sure yet". The first option is preselected and visible, so a Year 12 student switches it to 2028 in one click.
- **Settings:** the "Exam dates" section in Edit Subjects has an exam-year select. For any year other than 2027 it says published dates only cover summer 2027.

Tests added:

- **pacing:** a subject sitting in 2028, and one with no year, get no published date, next exam or pace, but their own dates still count. `normalizeSubjects` keeps a valid `examYear` and drops non-integers and strings.
- **Countdown and pacing card:** hidden for subjects sitting in 2028 or with no year set.
- **Settings:** published dates appear only once the year is 2027, and disappear again at 2028.
- **Picker:** the exam year defaults to 2027 in the four-GCSE onboarding pass. The A-level Biology options are 2027 to 2029, and choosing 2028 is stored. "Not sure yet" stores no year.
- **catalogue:** `examYearChoices` respects the published year, `firstExam` and `lastExam`.

## Follow-ups (not fixed on this branch)

- Update the dates file each year. `exam-dates-2028.json` should replace the 2027 file once the boards publish the 2028 timetables, with `PUBLISHED_EXAM_YEAR` bumped to match.

## Checks

lint pass · test pass (457 tests, 30 files) · build pass
