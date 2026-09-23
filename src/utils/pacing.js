// Exam dates and revision pacing. Pure: every function takes `now` so tests
// can pin the clock.
//
// Dates are calendar days ("YYYY-MM-DD") in the user's local time zone, like
// milestones: an exam on 14 May is "today" for all of 14 May and in the past
// from 15 May, whatever the hour.
//
// Where a paper's date comes from: the user's own `paper.examDate` always
// wins; otherwise the published timetable in src/data/exam-dates-2027.json,
// looked up by the subject's catalogue spec id (`<board>-<spec>`, lowercase)
// and the paper id. A subject without papers, or on a spec the file doesn't
// cover, has no dates and is left out of everything here.
//
// Pace rule (kept deliberately simple):
//   - The deadline is the subject's next exam: its earliest paper today or later.
//   - The pacing window is the school year that exam falls in, from 1 September.
//   - Expected progress is the share of that window already elapsed.
//   - Actual progress is the share of in-tier topics marked done.
//   - More than 10 points ahead of expected is "ahead", more than 10 behind is
//     "behind", anything in between is "on-track".
//   - perWeek is the in-tier topics left divided by the weeks left, rounded up.
import PUBLISHED_EXAM_DATES from "../data/exam-dates-2027.json";
import { daysUntil } from "./milestones.js";
import { inTierTopics, isIsoDate } from "./subjects.js";

export const PACE_MARGIN = 10; // percentage points either side of "on-track"

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const localMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// The catalogue spec id a subject's published dates are filed under, or null.
export const specIdOf = (subject) =>
  subject?.board && subject?.spec ? `${subject.board}-${subject.spec}`.toLowerCase() : null;

// The date that counts for one paper: the user's own, else the published one.
export const paperExamDate = (subject, paper, published = PUBLISHED_EXAM_DATES) => {
  if (isIsoDate(paper?.examDate)) return paper.examDate;
  const fromFile = published?.[specIdOf(subject)]?.[paper?.id];
  return isIsoDate(fromFile) ? fromFile : null;
};

// The published date alone, e.g. to show as the default in Settings.
export const publishedExamDate = (subject, paper, published = PUBLISHED_EXAM_DATES) =>
  paperExamDate(subject, { id: paper?.id }, published);

// Every dated paper of a subject, earliest first.
export const subjectExams = (subject, published = PUBLISHED_EXAM_DATES) =>
  (subject?.papers || [])
    .map((paper) => ({ paperId: paper.id, paperName: paper.name, date: paperExamDate(subject, paper, published) }))
    .filter((exam) => exam.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.paperName.localeCompare(b.paperName));

// True when any subject has at least one exam date, past or future.
export const hasExamDates = (subjects, published = PUBLISHED_EXAM_DATES) =>
  (subjects || []).some((subject) => subjectExams(subject, published).length > 0);

// A subject's next exam (today counts), or null when none is left.
export const nextSubjectExam = (subject, now = new Date(), published = PUBLISHED_EXAM_DATES) => {
  const exam = subjectExams(subject, published).find((item) => daysUntil(item.date, now) >= 0);
  return exam ? { ...exam, days: daysUntil(exam.date, now) } : null;
};

// The next exam across all subjects, with its subject attached, or null.
export const nextExam = (subjects, now = new Date(), published = PUBLISHED_EXAM_DATES) =>
  (subjects || [])
    .map((subject) => {
      const exam = nextSubjectExam(subject, now, published);
      return exam ? { ...exam, subjectId: subject.id, subjectName: subject.name } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || a.subjectName.localeCompare(b.subjectName))[0] || null;

// Short countdown text for a day count from nextExam: "today", "tomorrow", "in 12d".
export const countdownLabel = (days) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`);

// Whole weeks until a date, rounded up (3 days is 1 week; the exam day
// itself is 0). null for no date or a date already past.
export const weeksLeft = (date, now = new Date()) => {
  const days = daysUntil(date, now);
  return days === null || days < 0 ? null : Math.ceil(days / 7);
};

// In-tier topics not yet done: a Foundation subject doesn't count its
// higher-only topics.
export const topicsLeft = (subject) => inTierTopics(subject).filter((topic) => !topic.done).length;

// 1 September starting the school year that `date` falls in.
const schoolYearStart = (date) =>
  new Date(date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1, 8, 1);

// Share (0–100) of the school year up to `examDate` that has gone by.
export const elapsedPercent = (examDate, now = new Date()) => {
  const exam = parseDay(examDate);
  const start = schoolYearStart(exam);
  const total = Math.round((exam - start) / DAY_MS);
  const gone = Math.round((localMidnight(now) - start) / DAY_MS);
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (gone / total) * 100));
};

// Pacing for one subject against its next exam, or null when it has no
// upcoming exam or no in-tier topics to pace.
export const pace = (subject, now = new Date(), published = PUBLISHED_EXAM_DATES) => {
  const exam = nextSubjectExam(subject, now, published);
  const topics = inTierTopics(subject);
  if (!exam || topics.length === 0) return null;

  const left = topicsLeft(subject);
  const weeks = weeksLeft(exam.date, now);
  const donePercent = ((topics.length - left) / topics.length) * 100;
  const gap = donePercent - elapsedPercent(exam.date, now);
  const status = gap > PACE_MARGIN ? "ahead" : gap < -PACE_MARGIN ? "behind" : "on-track";

  return {
    topicsLeft: left,
    weeksLeft: weeks,
    // In the final week (or on the day) everything left is due now.
    perWeek: left === 0 ? 0 : Math.ceil(left / Math.max(weeks, 1)),
    status,
    exam,
  };
};
