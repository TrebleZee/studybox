import { describe, expect, it } from "vitest";
import { DEFAULT_GAME } from "./gameLogic.js";
import { REMINDER_HOUR, shouldShowStreakReminder } from "./reminders.js";

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
