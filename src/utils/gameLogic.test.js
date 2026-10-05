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
  inferFrozenDates,
  isStreakAtRisk,
  normalizeDateKey,
  normalizeGame,
  streakExpiry,
  validateStreak,
  deriveXP,
  settleLegacyXP,
  TOPIC_XP,
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
    // An object without frozenDates is a pre-freeze-tracking save, flagged
    // with null so buildInitialGame can infer the frozen days.
    // Likewise legacyXP: null marks a save from before XP was derived.
    expect(normalizeGame({})).toEqual({ ...DEFAULT_GAME, frozenDates: null, legacyXP: null });
  });

  it("keeps valid frozenDates and drops junk entries", () => {
    expect(normalizeGame({ frozenDates: ["2026-09-19", "junk", null] }).frozenDates).toEqual(["2026-09-19"]);
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
    const result = applyLoggedSession(DEFAULT_GAME, at);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastStudyDate).toBe("2026-09-14");
  });

  it("leaves the streak alone when already studied today", () => {
    const first = applyLoggedSession(DEFAULT_GAME, localDay(2026, 9, 14, 9));
    const second = applyLoggedSession(first, localDay(2026, 9, 14, 20));
    expect(second.currentStreak).toBe(1);
  });

  it("never touches XP: that comes from the session record", () => {
    const start = { ...DEFAULT_GAME, totalXP: 40, legacyXP: 7 };
    expect(applyLoggedSession(start, localDay(2026, 9, 14))).toMatchObject({ totalXP: 40, legacyXP: 7 });
  });

  it("extends the streak on the next day", () => {
    const first = applyLoggedSession(DEFAULT_GAME, localDay(2026, 9, 14));
    const next = applyLoggedSession(first, localDay(2026, 9, 15));
    expect(next.currentStreak).toBe(2);
    expect(next.longestStreak).toBe(2);
  });

  it("restarts at 1 after the streak lapsed", () => {
    const first = applyLoggedSession(DEFAULT_GAME, localDay(2026, 9, 14));
    const later = applyLoggedSession(first, localDay(2026, 9, 20));
    expect(later.currentStreak).toBe(1);
    expect(later.longestStreak).toBe(1);
  });

});

describe("deriveXP", () => {
  const done = (n, total = n) => ({ topics: Array.from({ length: total }, (_, i) => ({ done: i < n })) });

  it("is one XP per whole minute of each session plus 10 per completed topic", () => {
    expect(deriveXP([{ duration: 600 }, { duration: 125 }], [done(2, 5), done(1)])).toBe(10 + 2 + 30);
  });

  it("awards at least 1 XP for very short sessions, and none for empty or junk ones", () => {
    expect(deriveXP([{ duration: 5 }], [])).toBe(1);
    expect(deriveXP([{ duration: 0 }, { duration: -30 }, { duration: "abc" }, {}], [])).toBe(0);
  });

  it("gives XP back when a topic is unticked or a session deleted", () => {
    const sessions = [{ duration: 600 }, { duration: 300 }];
    expect(deriveXP(sessions, [done(3)])).toBe(45);
    expect(deriveXP(sessions.slice(1), [done(2, 3)])).toBe(25);
  });

  it("follows the records, so deleting a subject or a completed topic takes its XP too", () => {
    const subjects = [done(4), done(1, 2)];
    expect(deriveXP([], subjects)).toBe(50);
    expect(deriveXP([], subjects.slice(1))).toBe(10);
    expect(deriveXP([], [{ topics: [] }])).toBe(0);
  });

  it("cannot be farmed by ticking the same topic repeatedly", () => {
    let subject = done(0, 1);
    for (let i = 0; i < 50; i += 1) subject = { topics: [{ done: !subject.topics[0].done }] };
    expect(deriveXP([], [subject])).toBe(0);
    expect(deriveXP([], [{ topics: [{ done: true }] }])).toBe(TOPIC_XP);
  });
});

describe("settleLegacyXP", () => {
  const sessions = [{ duration: 600 }];
  const subjects = [{ topics: [{ done: true }] }];

  it("keeps a pre-derivation total by carrying the unexplained part as legacyXP", () => {
    const settled = settleLegacyXP({ totalXP: 500, legacyXP: null }, sessions, subjects);
    expect(settled).toMatchObject({ legacyXP: 480, totalXP: 500 });
  });

  it("carries nothing when the records explain the whole total", () => {
    expect(settleLegacyXP({ totalXP: 20, legacyXP: null }, sessions, subjects)).toMatchObject({ legacyXP: 0, totalXP: 20 });
    expect(settleLegacyXP({ totalXP: 3, legacyXP: null }, sessions, subjects)).toMatchObject({ legacyXP: 0, totalXP: 20 });
  });

  it("settles once: afterwards the total only follows the records", () => {
    const settled = settleLegacyXP({ totalXP: 500, legacyXP: null }, sessions, subjects);
    const inflated = { ...settled, totalXP: 99999 };
    expect(settleLegacyXP(inflated, sessions, subjects).totalXP).toBe(500);
    expect(settleLegacyXP(settled, [], []).totalXP).toBe(480);
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

  it("keeps a pre-derivation save's XP when it exceeds what history implies", () => {
    const result = buildInitialGame({ totalXP: 900 }, [], [], now);
    expect(result.totalXP).toBe(900);
    expect(result.legacyXP).toBe(900);
  });

  it("does not spend freezes again each launch once a streak has lapsed", () => {
    const sessions = [
      { date: localDay(2026, 9, 1).toISOString(), duration: 60 * 60 * 45 },
      { date: localDay(2026, 9, 2).toISOString(), duration: 60 * 60 },
    ];
    const first = buildInitialGame({ currentStreak: 2, lastStudyDate: "2026-09-02", legacyXP: 0, frozenDates: [] }, sessions, [], now);
    expect(first.currentStreak).toBe(0);
    expect(first.freezesUsed).toBe(3);

    const second = buildInitialGame(first, sessions, [], now);
    const third = buildInitialGame(second, sessions, [], now + DAY_MS);
    expect(second).toEqual(first);
    expect(third.freezesUsed).toBe(3);
    expect(third.frozenDates).toEqual(first.frozenDates);
  });

  it("still rebuilds the streak from history when the saved game is missing", () => {
    const sessions = [
      { date: localDay(2026, 9, 13).toISOString(), duration: 600 },
      { date: localDay(2026, 9, 14).toISOString(), duration: 600 },
    ];
    expect(buildInitialGame(null, sessions, [], now).currentStreak).toBe(2);
  });

  it("ignores a stored total once XP is derived, so editing it can't add XP", () => {
    const result = buildInitialGame({ totalXP: 99999, legacyXP: 0 }, [{ date: localDay(2026, 9, 14).toISOString(), duration: 600 }], [], now);
    expect(result.totalXP).toBe(10);
  });

  it("consumes a freeze on load after a missed day", () => {
    const stored = { currentStreak: 3, lastStudyDate: "2026-09-14", totalXP: 500 };
    const loadedAt = streakExpiry("2026-09-14");
    const result = buildInitialGame(stored, [], [], loadedAt);
    expect(result.currentStreak).toBe(3);
    expect(result.freezesUsed).toBe(1);
  });
});

describe("isStreakAtRisk", () => {
  const studied = "2026-09-13";
  const later = localDay(2026, 9, 14, 21).getTime();

  it("is false with no streak at all", () => {
    expect(isStreakAtRisk(game(), later)).toBe(false);
  });

  it("is true when the streak is live and today's session hasn't been logged", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied });
    expect(isStreakAtRisk(g, later)).toBe(true);
  });

  it("is false once today's session has already been logged", () => {
    const g = game({ currentStreak: 3, lastStudyDate: "2026-09-15" });
    expect(isStreakAtRisk(g, localDay(2026, 9, 15, 21).getTime())).toBe(false);
  });

  it("is false once the streak has already lapsed with no freeze to save it", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied });
    expect(isStreakAtRisk(g, streakExpiry(studied))).toBe(false);
  });

  it("is true when a freeze keeps the streak alive but today is still unlogged", () => {
    const g = game({ currentStreak: 3, lastStudyDate: studied, totalXP: 500 });
    expect(isStreakAtRisk(g, streakExpiry(studied) + 12 * 60 * 60 * 1000)).toBe(true);
  });
});

describe("streak freezes survive a history rebuild", () => {
  // Nine days (Sep 10-18), Sep 19 missed, then Sep 20 and 21.
  const studyDays = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21];
  const dates = studyDays.map((d) => `2026-09-${String(d).padStart(2, "0")}`);
  const sessions = studyDays.map((d) => ({ date: localDay(2026, 9, d).toISOString(), duration: 3600 }));
  const loadedAt = localDay(2026, 9, 22, 9).getTime();

  it("bridges days covered by a freeze without counting them", () => {
    expect(getStreakForDates(dates)).toBe(2);
    expect(getStreakForDates(dates, ["2026-09-19"])).toBe(11);
    expect(getLongestStreak(dates, ["2026-09-19"])).toBe(11);
  });

  it("a gap only partly covered by freezes still breaks the streak", () => {
    const gappy = ["2026-09-10", "2026-09-13"];
    expect(getStreakForDates(gappy, ["2026-09-11"])).toBe(1);
  });

  it("validateStreak records the day each freeze covered", () => {
    const g = game({ currentStreak: 9, lastStudyDate: "2026-09-18", totalXP: 1000 });
    const result = validateStreak(g, localDay(2026, 9, 20, 9).getTime());
    expect(result.freezesUsed).toBe(1);
    expect(result.frozenDates).toEqual(["2026-09-19"]);
  });

  it("rebuilds an 11-day streak when frozenDates is stored", () => {
    const stored = { totalXP: 1000, freezesUsed: 1, frozenDates: ["2026-09-19"], currentStreak: 11, lastStudyDate: "2026-09-21" };
    expect(buildInitialGame(stored, sessions, [], loadedAt).currentStreak).toBe(11);
  });

  it("infers the frozen day for saves made before frozenDates existed", () => {
    const legacy = { totalXP: 1000, freezesUsed: 1, currentStreak: 2, lastStudyDate: "2026-09-21" };
    const result = buildInitialGame(legacy, sessions, [], loadedAt);
    expect(result.currentStreak).toBe(11);
    expect(result.frozenDates).toEqual(["2026-09-19"]);
  });

  it("inference stops at a gap the used freezes could not have covered", () => {
    expect(inferFrozenDates(["2026-09-01", "2026-09-05", "2026-09-07"], 2, "2026-09-07", null))
      .toEqual(["2026-09-06"]);
    expect(inferFrozenDates(dates, 0, "2026-09-21", null)).toEqual([]);
  });

  it("inference counts trailing days already protected by a freeze", () => {
    const protectedUntil = streakExpiry("2026-09-21") + DAY_MS;
    expect(inferFrozenDates(dates, 2, "2026-09-21", protectedUntil)).toEqual(["2026-09-19", "2026-09-22"]);
  });
});
