import { describe, expect, it } from "vitest";
import { DEFAULT_GAME } from "./gameLogic.js";
import {
  MILESTONE_REMINDER_DAYS,
  REMINDER_HOUR,
  milestonesToRemind,
  shouldShowMilestoneReminder,
  shouldShowStreakReminder,
} from "./reminders.js";

const localDay = (y, m, d, h) => new Date(y, m - 1, d, h, 0, 0, 0);
const game = (overrides = {}) => ({ ...DEFAULT_GAME, ...overrides });
const atRiskGame = () => game({ currentStreak: 3, lastStudyDate: "2026-09-14" });

describe("shouldShowStreakReminder", () => {
  it("does not fire before the evening threshold", () => {
    const now = localDay(2026, 9, 15, REMINDER_HOUR - 1);
    expect(shouldShowStreakReminder(atRiskGame(), { now })).toBe(false);
  });

  it("fires at and after the evening threshold when the streak is at risk", () => {
    const now = localDay(2026, 9, 15, REMINDER_HOUR);
    expect(shouldShowStreakReminder(atRiskGame(), { now })).toBe(true);
    expect(shouldShowStreakReminder(atRiskGame(), { now: localDay(2026, 9, 15, 23) })).toBe(true);
  });

  it("does not fire when nothing is at risk (no streak, or already logged today)", () => {
    const now = localDay(2026, 9, 15, REMINDER_HOUR);
    expect(shouldShowStreakReminder(game(), { now })).toBe(false);
    expect(
      shouldShowStreakReminder(game({ currentStreak: 2, lastStudyDate: "2026-09-15" }), { now })
    ).toBe(false);
  });

  it("does not fire twice on the same local day", () => {
    const now = localDay(2026, 9, 15, REMINDER_HOUR);
    expect(
      shouldShowStreakReminder(atRiskGame(), { now, lastReminderDate: "2026-09-15" })
    ).toBe(false);
  });

  it("fires again the next day the streak is still at risk", () => {
    const now = localDay(2026, 9, 16, REMINDER_HOUR);
    expect(
      shouldShowStreakReminder(game({ currentStreak: 3, lastStudyDate: "2026-09-15" }), {
        now,
        lastReminderDate: "2026-09-15",
      })
    ).toBe(true);
  });
});

describe("milestonesToRemind", () => {
  const subjectsWith = (...milestones) => [
    {
      id: "cs",
      name: "Computer Science",
      color: "#fff",
      topics: [],
      milestones: milestones.map((m, i) => ({ id: `m${i}`, name: `M${i}`, kind: "nea", done: false, due: null, ...m })),
    },
  ];
  const now = localDay(2027, 5, 10, 9);

  it("reminds for a milestone due in 3 days", () => {
    const due = milestonesToRemind(subjectsWith({ due: "2027-05-13" }), { now });
    expect(due.map((m) => m.name)).toEqual(["M0"]);
    expect(shouldShowMilestoneReminder(subjectsWith({ due: "2027-05-13" }), { now })).toBe(true);
  });

  it("covers today through 3 days ahead, not 4", () => {
    const subjects = subjectsWith({ due: "2027-05-10" }, { due: "2027-05-11" }, { due: "2027-05-14" });
    expect(milestonesToRemind(subjects, { now }).map((m) => m.due)).toEqual(["2027-05-10", "2027-05-11"]);
    expect(MILESTONE_REMINDER_DAYS).toBe(3);
  });

  it("does not remind for an overdue milestone", () => {
    expect(shouldShowMilestoneReminder(subjectsWith({ due: "2027-05-09" }), { now })).toBe(false);
  });

  it("does not remind for a done milestone", () => {
    expect(shouldShowMilestoneReminder(subjectsWith({ due: "2027-05-12", done: true }), { now })).toBe(false);
  });

  it("does not remind for a milestone with no date", () => {
    expect(shouldShowMilestoneReminder(subjectsWith({ due: null }), { now })).toBe(false);
  });

  it("does not fire twice on the same local day", () => {
    const subjects = subjectsWith({ due: "2027-05-12" });
    expect(shouldShowMilestoneReminder(subjects, { now, lastReminderDate: "2027-05-10" })).toBe(false);
    expect(shouldShowMilestoneReminder(subjects, { now, lastReminderDate: "2027-05-09" })).toBe(true);
  });

  it("treats due dates as local calendar days around midnight", () => {
    const subjects = subjectsWith({ due: "2027-05-13" });
    // 23:00 on the 9th: due in 4 days, so not yet; 00:01 on the 10th: 3 days.
    expect(shouldShowMilestoneReminder(subjects, { now: localDay(2027, 5, 9, 23) })).toBe(false);
    expect(shouldShowMilestoneReminder(subjects, { now: new Date(2027, 4, 10, 0, 1) })).toBe(true);
  });
});
