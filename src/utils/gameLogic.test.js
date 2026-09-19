import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  DEFAULT_GAME,
  applyLoggedSession,
  buildInitialGame,
  calendarDayDistance,
  dateKey,
  freezeStats,
  getLongestStreak,
  getStreakForDates,
  normalizeDateKey,
  normalizeGame,
  streakExpiry,
  validateStreak,
} from "./gameLogic.js";

const localDay = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0, 0);
const game = (overrides = {}) => ({ ...DEFAULT_GAME, ...overrides });

describe("date helpers", () => {
  it("formats local dates and rejects invalid ones", () => {
    expect(dateKey(localDay(2026, 3, 5))).toBe("2026-03-05");
    expect(dateKey("not a date")).toBeNull();
  });

  it("normalizeDateKey passes keys through and treats empty values as null", () => {
    expect(normalizeDateKey("2026-03-05")).toBe("2026-03-05");
    expect(normalizeDateKey(null)).toBeNull();
    expect(normalizeDateKey(undefined)).toBeNull();
    expect(normalizeDateKey("")).toBeNull();
  });

  it("measures calendar-day distance", () => {
    expect(calendarDayDistance("2026-03-01", "2026-03-02")).toBe(1);
    expect(calendarDayDistance("2026-02-28", "2026-03-01")).toBe(1);
    expect(calendarDayDistance("2026-03-05", "2026-03-01")).toBe(-4);
  });

  it("computes current and longest streaks from study dates", () => {
    const dates = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-10", "2026-03-11"];
    expect(getStreakForDates(dates)).toBe(2);
    expect(getLongestStreak(dates)).toBe(3);
    expect(getStreakForDates([])).toBe(0);
  });
});

describe("normalizeGame", () => {
  it("falls back to defaults for junk input", () => {
    expect(normalizeGame(null)).toEqual(DEFAULT_GAME);
    expect(normalizeGame("nope")).toEqual(DEFAULT_GAME);
    expect(normalizeGame({})).toEqual(DEFAULT_GAME);
  });

  it("coerces numeric strings and drops bad values", () => {
    const result = normalizeGame({ currentStreak: "4", totalXP: "abc", freezesUsed: 2 });
    expect(result.currentStreak).toBe(4);
    expect(result.totalXP).toBe(0);
    expect(result.freezesUsed).toBe(2);
  });
});

describe("freezeStats", () => {
  it("earns one freeze per 500 XP, capped at 3, minus those used", () => {
    expect(freezeStats(game({ totalXP: 499 }))).toEqual({ available: 0, xpToNext: 1 });
    expect(freezeStats(game({ totalXP: 500 }))).toEqual({ available: 1, xpToNext: 500 });
    expect(freezeStats(game({ totalXP: 5000 })).available).toBe(3);
    expect(freezeStats(game({ totalXP: 1000, freezesUsed: 1 })).available).toBe(1);
  });
});

describe("validateStreak", () => {
  const studied = "2026-09-14";
  const expiry = streakExpiry(studied);

  it("leaves a streak alone until 24h after 23:59:59 of the last study day", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied });
    expect(validateStreak(g, expiry - 1)).toBe(g);
  });

  it("resets the streak once the window has passed and no freeze is available", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied });
    expect(validateStreak(g, expiry).currentStreak).toBe(0);
  });

  it("burns a freeze after a missed day and keeps the streak", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied, totalXP: 500 });
    const result = validateStreak(g, expiry);
    expect(result.currentStreak).toBe(3);
    expect(result.freezesUsed).toBe(1);
    expect(result.streakProtectedUntil).toBe(expiry + DAY_MS);
  });

  it("with a single freeze, a multi-day miss burns exactly that one freeze then resets", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied, totalXP: 500 });
    const result = validateStreak(g, expiry + 3 * DAY_MS);
    expect(result.freezesUsed).toBe(1);
    expect(result.currentStreak).toBe(0);
  });

  it("uses one freeze per additional missed day while freezes remain", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied, totalXP: 1500 });
    const result = validateStreak(g, expiry + DAY_MS);
    expect(result.freezesUsed).toBe(2);
    expect(result.currentStreak).toBe(3);
  });

  it("ignores games with no streak", () => {
    const g = game({ lastStudyDate: studied });
    expect(validateStreak(g, expiry + 10 * DAY_MS)).toBe(g);
  });
});

describe("applyLoggedSession", () => {
  it("bootstraps the very first session to a 1-day streak", () => {
    const at = localDay(2026, 9, 14);
    const result = applyLoggedSession(DEFAULT_GAME, 120, at);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastStudyDate).toBe("2026-09-14");
    expect(result.totalXP).toBe(2);
  });

  it("only adds XP when already studied today", () => {
    const first = applyLoggedSession(DEFAULT_GAME, 600, localDay(2026, 9, 14, 9));
    const second = applyLoggedSession(first, 300, localDay(2026, 9, 14, 20));
    expect(second.currentStreak).toBe(1);
    expect(second.totalXP).toBe(15);
  });

  it("extends the streak on the next day", () => {
    const first = applyLoggedSession(DEFAULT_GAME, 60, localDay(2026, 9, 14));
    const next = applyLoggedSession(first, 60, localDay(2026, 9, 15));
    expect(next.currentStreak).toBe(2);
    expect(next.longestStreak).toBe(2);
  });

  it("restarts at 1 after the streak lapsed", () => {
    const first = applyLoggedSession(DEFAULT_GAME, 60, localDay(2026, 9, 14));
    const later = applyLoggedSession(first, 60, localDay(2026, 9, 20));
    expect(later.currentStreak).toBe(1);
    expect(later.longestStreak).toBe(1);
  });

  it("awards at least 1 XP for very short sessions", () => {
    expect(applyLoggedSession(DEFAULT_GAME, 5, localDay(2026, 9, 14)).totalXP).toBe(1);
  });
});

describe("buildInitialGame", () => {
  const now = localDay(2026, 9, 14).getTime();

  it("starts empty with no history", () => {
    const result = buildInitialGame(null, [], [], now);
    expect(result.currentStreak).toBe(0);
    expect(result.lastStudyDate).toBeNull();
    expect(result.totalXP).toBe(0);
  });

  it("derives streak and XP from session history and completed topics", () => {
    const sessions = [
      { date: localDay(2026, 9, 13).toISOString(), duration: 600 },
      { date: localDay(2026, 9, 14).toISOString(), duration: 1200 },
    ];
    const subjects = [{ topics: [{ done: true }, { done: false }] }];
    const result = buildInitialGame(null, sessions, subjects, now);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.totalXP).toBe(10 + 20 + 10);
  });

  it("keeps persisted XP when it exceeds what history implies", () => {
    const result = buildInitialGame({ totalXP: 900 }, [], [], now);
    expect(result.totalXP).toBe(900);
  });

  it("consumes a freeze on load after a missed day", () => {
    const stored = { currentStreak: 3, lastStudyDate: "2026-09-14", totalXP: 500 };
    const loadedAt = streakExpiry("2026-09-14");
    const result = buildInitialGame(stored, [], [], loadedAt);
    expect(result.currentStreak).toBe(3);
    expect(result.freezesUsed).toBe(1);
  });
});
