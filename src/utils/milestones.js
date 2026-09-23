// Pure helpers for subject milestones (NEA, practicals, coursework).
// Due dates are calendar days ("YYYY-MM-DD") in the user's local time zone:
// a milestone due today is "due today" all day, whatever the hour.
import { isIsoDate } from "./subjects.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const localMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Whole calendar days from `now`'s day to the due day: 0 today, 1 tomorrow,
// -1 yesterday; null without a valid date. Rounding absorbs DST shifts.
export const daysUntil = (due, now = new Date()) =>
  isIsoDate(due) ? Math.round((parseDay(due) - localMidnight(now)) / DAY_MS) : null;

export const isOverdue = (milestone, now = new Date()) =>
  !milestone.done && daysUntil(milestone.due, now) !== null && daysUntil(milestone.due, now) < 0;

// Every milestone across subjects, with its subject attached, sorted by due
// date (undated last, then by name).
export const allMilestones = (subjects) =>
  subjects
    .flatMap((subject) =>
      (subject.milestones || []).map((milestone) => ({
        ...milestone,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
      }))
    )
    .sort((a, b) => {
      if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      return a.name.localeCompare(b.name);
    });

// "Due today", "Due tomorrow", "Due in 5 days", "Overdue by 2 days", "No date".
export const dueLabel = (milestone, now = new Date()) => {
  const days = daysUntil(milestone.due, now);
  if (days === null) return "No date";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  return `Overdue by ${-days} day${days === -1 ? "" : "s"}`;
};

const NEA_PATTERN = /\bNEA\b/i;

// Topics that look like an NEA and could become a milestone instead. Only
// ever offered to the user; conversion needs their confirmation. Topics the
// user chose to keep (`keepAsTopic`) are never offered again.
export const neaTopicCandidates = (subjects) =>
  subjects.flatMap((subject) =>
    subject.topics
      .filter((topic) => NEA_PATTERN.test(topic.name) && !topic.keepAsTopic)
      .map((topic) => ({ subjectId: subject.id, subjectName: subject.name, topic }))
  );

// Replaces the topic with an NEA milestone of the same name. Call only after
// the user has confirmed; a subject without that topic is returned as is.
export const convertTopicToMilestone = (subject, topicId, newId = `ms-${Date.now().toString(36)}`) => {
  const topic = subject.topics.find((item) => item.id === topicId);
  if (!topic) return subject;
  return {
    ...subject,
    topics: subject.topics.filter((item) => item.id !== topicId),
    milestones: [
      ...(subject.milestones || []),
      { id: newId, name: topic.name, kind: "nea", due: null, done: topic.done },
    ],
  };
};
